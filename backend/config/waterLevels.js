/**
 * ═══════════════════════════════════════════════════════════════════════
 * MỰC NƯỚC — bảng mức + quy đổi raw → phần trăm
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Đây là BẢN SAO 1-1 của logic trong firmware MicroPython
 * (hardware/esp32-water-level/main.py). Vì sao phải có ở cả hai nơi:
 *
 *   • Board tự tính được % nên vẫn dùng offline (xem qua serial, chớp LED...).
 *   • Server tính lại từ `raw` để không tin mù dữ liệu thiết bị gửi lên, và
 *     để hiệu chuẩn lại (đổi calib) không phải nạp lại firmware — số liệu
 *     lịch sử vẫn quy đổi đúng.
 *
 * Sửa ngưỡng ở đây thì sửa cả main.py, nếu không hai bên hiển thị lệch nhau.
 */

// Bảng dự phòng khi thiết bị chưa hiệu chuẩn: [phần_trăm, raw].
// Số lấy từ đo thực tế: khô = 0, ngâm nước = ~39000.
const DEFAULT_CALIB = [[0, 0], [100, 39000]];

// Khoảng cách raw tối thiểu giữa điểm thấp nhất và cao nhất để bảng được coi
// là dùng được. Hiệu chuẩn hỏng (chạy khi chưa nối dây → mọi điểm đều raw 0)
// tạo ra bảng phẳng lì; nội suy trên đó trả về 100% cho MỌI giá trị khác 0,
// nghĩa là cảm biến vừa chạm nước đã kêu "đầy — cảnh báo". Thà quay về bảng
// mặc định còn hơn.
const MIN_CALIB_SPAN = 1000;

// 1 trạng thái khô + 9 mức ngập. Mỗi mức: ngưỡng % để vào mức đó.
// `key` là khoá i18n phía frontend (translations: waterSensor.levels.<key>).
//
// Các dải rộng ~12% (trừ hai đầu hẹp hơn để bắt lúc vừa chạm nước và lúc sắp
// đầy — hai thời điểm người dùng cần biết chính xác nhất).
const LEVELS = [
  { index: 0, min: 0,  key: "dry" },        // KHÔ
  { index: 1, min: 2,  key: "damp" },       // VỪA CHẠM NƯỚC
  { index: 2, min: 10, key: "veryLow" },    // NGẬP RẤT THẤP
  { index: 3, min: 20, key: "low" },        // NGẬP THẤP
  { index: 4, min: 32, key: "lowMid" },     // NGẬP THẤP–VỪA
  { index: 5, min: 44, key: "moderate" },   // NGẬP VỪA
  { index: 6, min: 56, key: "midHigh" },    // NGẬP VỪA–CAO
  { index: 7, min: 68, key: "high" },       // NGẬP CAO
  { index: 8, min: 80, key: "veryHigh" },   // NGẬP RẤT CAO
  { index: 9, min: 90, key: "critical" },   // ĐẦY — CẢNH BÁO
];

// Thiết bị được coi là ONLINE nếu gửi dữ liệu trong khoảng này.
// Ở nhịp mặc định 2s thì đây là ~22 chu kỳ hụt. Nếu bạn nâng POST_PERIOD lên
// quá ~40s thì phải nới con số này, không thì thiết bị bình thường cũng bị
// coi là mất kết nối.
const ONLINE_WINDOW_SEC = 45;

/** Lọc bảng thô về [[pct, raw], ...] sạch, tăng dần theo raw. */
function cleanPoints(table) {
  if (!Array.isArray(table)) return [];
  return table
    .map((point) => {
      const pct = Number(Array.isArray(point) ? point[0] : point?.percent);
      const raw = Number(Array.isArray(point) ? point[1] : point?.raw);
      return [Math.round(pct), Math.round(raw)];
    })
    .filter(([pct, raw]) => Number.isFinite(pct) && Number.isFinite(raw) && pct >= 0 && pct <= 100 && raw >= 0)
    .sort((a, b) => a[1] - b[1]);
}

/**
 * Bảng hiệu chuẩn có dùng được không: đủ 2 điểm và khoảng raw giữa điểm thấp
 * nhất với cao nhất đủ rộng. Bảng phẳng (hiệu chuẩn khi chưa nối dây → toàn
 * số 0) bị coi là CHƯA hiệu chuẩn, vì dùng nó thì mọi raw khác 0 đều ra 100%.
 */
function isCalibrated(table) {
  const clean = cleanPoints(table);
  return clean.length >= 2 && clean[clean.length - 1][1] - clean[0][1] >= MIN_CALIB_SPAN;
}

/**
 * Chuẩn hoá bảng hiệu chuẩn từ DB/thiết bị về dạng [[pct, raw], ...] tăng dần
 * theo raw. Trả về DEFAULT_CALIB nếu dữ liệu không dùng được.
 */
function normalizeCalibration(table) {
  return isCalibrated(table) ? cleanPoints(table) : DEFAULT_CALIB;
}

/**
 * Nội suy tuyến tính từng đoạn giữa các điểm hiệu chuẩn (giống to_percent()
 * trong main.py). Cảm biến kiểu lược KHÔNG tuyến tính nên quy đổi 2 điểm
 * (khô/đầy) sai khá nhiều ở khoảng giữa.
 */
function rawToPercent(raw, table) {
  const calib = normalizeCalibration(table);
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;

  if (value <= calib[0][1]) return calib[0][0];
  if (value >= calib[calib.length - 1][1]) return calib[calib.length - 1][0];

  for (let i = 1; i < calib.length; i += 1) {
    const [p0, r0] = calib[i - 1];
    const [p1, r1] = calib[i];
    if (value <= r1) {
      if (r1 === r0) return p1;
      return Math.round(p0 + ((value - r0) * (p1 - p0)) / (r1 - r0));
    }
  }
  return calib[calib.length - 1][0];
}

/** Mức (0..5) tương ứng với phần trăm. Không có hysteresis — đó là việc của
 *  firmware, nơi giá trị dao động liên tục; server chỉ thấy mẫu đã lọc. */
function percentToLevel(percent) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  let idx = 0;
  for (const level of LEVELS) {
    if (pct >= level.min) idx = level.index;
  }
  return idx;
}

/** Khoá i18n của một mức. */
function levelKey(index) {
  return LEVELS[index]?.key || "dry";
}

module.exports = {
  DEFAULT_CALIB,
  MIN_CALIB_SPAN,
  cleanPoints,
  isCalibrated,
  LEVELS,
  ONLINE_WINDOW_SEC,
  normalizeCalibration,
  rawToPercent,
  percentToLevel,
  levelKey,
};
