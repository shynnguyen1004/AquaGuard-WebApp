/**
 * Reverse geocoding (toạ độ → địa chỉ đọc được).
 *
 * Nguồn duy nhất cho toàn app — trước đây logic này bị copy ở locationSync,
 * SettingsPage, RescueRequestForm, RescueRequestPage và AdminSOSRequestsPage,
 * mỗi nơi fallback một kiểu nên có chỗ hiển thị ra "11.569144, 108.997470".
 *
 * Thử lần lượt Google Maps (nếu có key) → Photon → BigDataCloud → Nominatim,
 * dừng ở nhà cung cấp đầu tiên trả về kết quả. Kết quả được cache theo ô lưới
 * ~11m trong sessionStorage nên chuyển trang / mở lại popup không gọi mạng nữa
 * — Nominatim giới hạn 1 request/giây, cache là bắt buộc chứ không phải tối ưu.
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const CACHE_STORAGE_KEY = "aquaguard_geocode_cache";

/** key toạ độ → { full, city } */
const memoryCache = new Map();
/** key toạ độ → Promise đang chạy, để 10 marker cùng chỗ chỉ gọi mạng 1 lần */
const inFlight = new Map();
/** key toạ độ → thời điểm được phép thử lại sau khi tra thất bại */
const failureUntil = new Map();

let storageLoaded = false;

function loadStorageCache() {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    for (const [key, value] of Object.entries(JSON.parse(raw))) {
      // Bỏ qua entry rỗng do bản cũ ghi lại: nếu nạp vào, một lần tra hỏng sẽ
      // "đóng băng" toạ độ đó suốt phiên và không bao giờ thử lại.
      if (value?.full) memoryCache.set(key, value);
    }
  } catch {
    /* cache hỏng — bỏ qua, chỉ mất tốc độ */
  }
}

function persistCache() {
  try {
    sessionStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(memoryCache))
    );
  } catch {
    /* hết quota — bỏ qua */
  }
}

function cacheKeyFor(lat, lng) {
  // 4 chữ số ≈ 11m: đủ để 2 lần đọc GPS liên tiếp dùng chung một kết quả.
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Định dạng toạ độ thô. Chỉ dùng cho chỗ *cố ý* hiển thị toạ độ
 * (ví dụ trường "Toạ độ" của thiết bị) — không dùng làm fallback cho địa chỉ.
 */
export function formatCoordinates(lat, lng, digits = 5) {
  if (typeof lat !== "number" || typeof lng !== "number") return "";
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`;
}

/**
 * Chuỗi này thực chất là toạ độ chứ không phải địa chỉ?
 * Dùng để phát hiện dữ liệu cũ đã lỡ lưu "11.569144, 108.997470" vào cột address.
 */
export function looksLikeCoordinates(value) {
  if (!value || typeof value !== "string") return false;
  return /^\s*-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*$/.test(value);
}

/**
 * Rút gọn địa chỉ đầy đủ thành "Thành phố X, Việt Nam".
 * Ví dụ: "268 Lý Thường Kiệt, Phường 14, Quận 10, Thành phố Hồ Chí Minh, Việt Nam"
 *      → "Thành phố Hồ Chí Minh, Việt Nam"
 * Không khớp từ khoá nào thì lấy 2 phần cuối (thường là tỉnh/thành + quốc gia).
 */
export function extractCityLabel(address) {
  if (!address || looksLikeCoordinates(address)) return "";

  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return address;

  const cityKeywords = ["thành phố", "tp.", "tp ", "tỉnh", "city", "province"];
  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (cityKeywords.some((kw) => lower.includes(kw))) {
      return parts.slice(i).join(", ");
    }
  }

  return parts.slice(-2).join(", ");
}

/**
 * Lấy tên tỉnh/thành trần ("Đà Nẵng") từ một địa chỉ đầy đủ.
 * Dùng cho bộ lọc theo thành phố ở hàng đợi cứu hộ.
 */
export function extractCityName(address) {
  if (!address || typeof address !== "string") return "";
  const normalized = address.replace(/\s+/g, " ").trim();
  const match = normalized.match(/thành phố\s+([^,]+)/i);
  return match?.[1]?.trim() || "";
}

/** Ghép các phần địa chỉ, bỏ rỗng và bỏ trùng. */
function joinParts(parts) {
  const seen = new Set();
  return parts
    .filter((part) => {
      if (!part || seen.has(part)) return false;
      seen.add(part);
      return true;
    })
    .join(", ");
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Google Maps — chất lượng tốt nhất, cần VITE_GOOGLE_MAPS_API_KEY. */
async function fetchFromGoogle(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const data = await fetchJson(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}` +
      `&key=${GOOGLE_MAPS_API_KEY}&language=vi` +
      `&result_type=street_address|route|sublocality|locality`
  );
  if (data.status !== "OK" || !data.results?.length) return null;

  const best = data.results[0];
  const components = best.address_components || [];
  const pick = (type) =>
    components.find((c) => c.types?.includes(type))?.long_name || "";

  return {
    full: best.formatted_address,
    city:
      pick("locality") ||
      pick("administrative_area_level_1") ||
      pick("administrative_area_level_2") ||
      "",
  };
}

/** Photon (komoot) — dữ liệu OSM, chi tiết tới tên đường, không cần key. */
async function fetchFromPhoton(lat, lng) {
  const data = await fetchJson(
    `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=default`
  );
  const props = data?.features?.[0]?.properties;
  if (!props) return null;

  const street = joinParts([props.housenumber, props.street || props.name]);
  return {
    full: joinParts([
      street,
      props.district,
      props.city,
      props.state,
      props.country,
    ]),
    city: props.city || props.county || props.state || "",
  };
}

/** BigDataCloud — chỉ tới cấp phường/thành phố, nhưng rất ổn định, không cần key. */
async function fetchFromBigDataCloud(lat, lng) {
  const data = await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=vi`
  );
  if (!data?.countryName) return null;

  return {
    full: joinParts([
      data.locality,
      data.city,
      data.principalSubdivision,
      data.countryName,
    ]),
    city: data.city || data.locality || data.principalSubdivision || "",
  };
}

/** Nominatim — bản gốc OSM. Bị chặn DNS ở một số ISP nên xếp cuối. */
async function fetchFromNominatim(lat, lng) {
  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`
  );
  if (!data?.display_name) return null;

  const addr = data.address || {};
  return {
    full: data.display_name,
    city:
      addr.city ||
      addr.municipality ||
      addr.town ||
      addr.county ||
      addr.state ||
      "",
  };
}

/**
 * Thử lần lượt cho tới khi có kết quả. Nhiều nhà cung cấp là CỐ Ý, không phải
 * thừa: nhiều ISP ở Việt Nam chặn DNS tới *.openstreetmap.org, nên nếu chỉ có
 * Nominatim thì cả tính năng chết im lặng với đúng nhóm người dùng của app.
 */
const PROVIDERS = [
  fetchFromGoogle,
  fetchFromPhoton,
  fetchFromBigDataCloud,
  fetchFromNominatim,
];

/**
 * Toạ độ → { full, city }. Trả về null nếu không tra được
 * (gọi bên gọi tự quyết định hiển thị gì — cố ý KHÔNG fallback ra toạ độ).
 */
export async function reverseGeocode(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  loadStorageCache();
  const key = cacheKeyFor(lat, lng);
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (inFlight.has(key)) return inFlight.get(key);
  if (Date.now() < (failureUntil.get(key) || 0)) return null;

  const task = (async () => {
    let result = null;
    for (const provider of PROVIDERS) {
      try {
        result = await provider(lat, lng);
        if (result?.full) break;
        result = null;
      } catch (err) {
        // Provider chết (DNS bị chặn, rate-limit, CORS...) → thử cái kế tiếp.
        console.warn(`[reverseGeocode] ${provider.name} thất bại:`, err.message);
      }
    }

    if (result) {
      memoryCache.set(key, result);
      persistCache();
    } else {
      // KHÔNG cache vĩnh viễn thất bại: nguyên nhân hay gặp nhất là mạng chập
      // chờn / ISP chặn provider, không phải toạ độ hỏng. Chỉ chặn hỏi dồn
      // trong 60s để một màn hình đầy marker không nã hàng chục request lỗi.
      failureUntil.set(key, Date.now() + 60000);
    }
    inFlight.delete(key);
    return result;
  })();

  inFlight.set(key, task);
  return task;
}

/** Toạ độ → địa chỉ đầy đủ, hoặc "" nếu không tra được. */
export async function reverseGeocodeAddress(lat, lng) {
  const result = await reverseGeocode(lat, lng);
  return result?.full || "";
}

/** Toạ độ → tên tỉnh/thành, hoặc "" nếu không tra được. */
export async function reverseGeocodeCity(lat, lng) {
  const result = await reverseGeocode(lat, lng);
  return result?.city || "";
}
