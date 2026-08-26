/**
 * ═══════════════════════════════════════════════════════════════════════
 * ĐIỀU PHỐI CỨU HỘ TỰ ĐỘNG — "bộ não" của tính năng auto-dispatch
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Cơ chế: GIAO THẲNG cho rescuer phù hợp nhất — không hỏi, không chờ nhận.
 *
 *   SOS mới ─→ quét rescuer ĐANG TRỰC & đang online trong bán kính
 *           ─→ chấm điểm (gần nhất + rảnh nhất + tin cậy nhất + GPS mới nhất)
 *           ─→ GIAO NGAY cho người điểm cao nhất
 *                ├── họ bấm bắt đầu   → in_progress, tracking chạy
 *                ├── họ bỏ ca         → giao lại cho người kế (loại họ ra)
 *                └── họ mất tích      → watchdog thu hồi sau
 *                                       STALE_ASSIGNMENT_SECONDS, giao người kế
 *           ─→ hết ứng viên → nới bán kính (5 → 10 → 20 km)
 *           ─→ hết sạch     → dispatch_status='no_candidate' + báo admin
 *
 * Nguyên tắc thiết kế:
 *
 *  1. KHÔNG BAO GIỜ CHẶN NẠN NHÂN. `start()` được gọi fire-and-forget sau khi
 *     POST /api/sos đã trả 201. Mọi lỗi ở đây đều bị nuốt và log.
 *
 *  2. GIAO CHO CÁ NHÂN, GHI SỔ THEO TEAM. `assigned_to` là rescuer cụ thể,
 *     `assigned_group_id` là team của họ — nên GET /api/sos/team của đồng đội
 *     vẫn hoạt động y như cũ, không phải sửa gì.
 *
 *  3. GIAO THẲNG THÌ PHẢI CÓ LƯỚI AN TOÀN. Khi không hỏi ai cả, rủi ro lớn
 *     nhất là giao trúng người vừa tắt máy — request sẽ nằm chết. Watchdog
 *     (chạy trong `sweep`) thu hồi những ca được giao mà rescuer không phản
 *     hồi, rồi chuyển cho người kế.
 *
 *  4. KHÔNG PHỤ THUỘC BỘ NHỚ TIẾN TRÌNH. Backend chạy trên Render free tier,
 *     ngủ sau ~15 phút. Mọi trạng thái nằm trong DB và được watchdog quét lại,
 *     nên server restart giữa chừng vẫn hồi phục đúng.
 */

const pool = require("../db");
const cfg = require("../config/dispatch");
const {
  isRedisReady,
  nearbyUsers,
  getLiveLocation,
} = require("../redisClient");
const {
  createNotification,
  createNotificationsForUsers,
} = require("../utils/notifications");

// ── Transport được tiêm từ index.js (tránh phụ thuộc vòng với WebSocket server) ──
let transport = {
  sendToUser: () => false,
  broadcastToRoom: () => {},
};

/** index.js gọi hàm này sau khi dựng xong WebSocket server. */
function setTransport(next) {
  transport = { ...transport, ...next };
}

// Chống hai luồng cùng điều phối một request (sweeper + phản hồi của rescuer
// có thể chạm nhau). Chỉ có tác dụng trong 1 tiến trình — đủ cho kiến trúc
// single-instance hiện tại; DB vẫn là chốt chặn cuối (xem hasActiveAssignment
// + race guard `WHERE status='pending'` lúc giao).
const inFlight = new Set();

const log = (...args) => console.log("[Dispatch]", ...args);
const warn = (...args) => console.warn("[Dispatch]", ...args);

// ═══════════════════════════════════════════════════════════════════════
// 1. XÁC ĐỊNH TOẠ ĐỘ NẠN NHÂN
// ═══════════════════════════════════════════════════════════════════════

/**
 * Toạ độ nạn nhân theo thứ tự ưu tiên:
 *   1. Toạ độ gửi kèm SOS (chính xác nhất — chụp đúng lúc bấm nút)
 *   2. Vị trí live trong Redis (họ có thể đã di chuyển)
 *   3. Vị trí cuối cùng còn lưu trong user_locations
 * Trả về null nếu không có nguồn nào → không thể auto-dispatch.
 */
async function resolveVictimLocation(request) {
  if (Number.isFinite(request.latitude) && Number.isFinite(request.longitude)) {
    return { lat: request.latitude, lng: request.longitude };
  }

  if (request.user_id) {
    const live = await getLiveLocation(request.user_id);
    if (live) return { lat: live.lat, lng: live.lng };

    try {
      const { rows } = await pool.query(
        `SELECT latitude, longitude FROM user_locations WHERE user_id = $1`,
        [request.user_id]
      );
      if (rows[0]) return { lat: rows[0].latitude, lng: rows[0].longitude };
    } catch (err) {
      warn("resolveVictimLocation query failed:", err.message);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. TÌM ỨNG VIÊN
// ═══════════════════════════════════════════════════════════════════════

/**
 * Bước 1 của việc tìm ứng viên: ai đang ở gần?
 *
 * Gộp HAI nguồn vị trí, Redis được ưu tiên:
 *
 *   1. Redis GEO — vị trí live, chính xác nhất, nhưng hash chỉ sống 60s.
 *   2. user_locations — vị trí cuối cùng còn lưu, bền vững.
 *
 * Vì sao không chỉ dùng Redis? Vì presence live KHÔNG phải tín hiệu đáng tin
 * cho việc "rescuer này có sẵn sàng không". Trình duyệt bóp timer của tab chạy
 * nền và đóng băng hẳn khi điện thoại khoá màn hình, nên một rescuer đang trực,
 * đang cầm máy, vẫn có thể mất presence chỉ vì họ chuyển sang tab khác.
 *
 * Tín hiệu sẵn sàng THẬT là `duty_status='on'` — do chính rescuer bật, bền
 * vững, không phụ thuộc trình duyệt. Presence chỉ quyết định vị trí nào chính
 * xác hơn, và độ cũ của nó đã bị trừ điểm qua tiêu chí `freshness`.
 */
async function findNearbyRescuers(lat, lng, radiusKm) {
  const byId = new Map();

  // ── Nguồn 1: Redis live ──
  if (isRedisReady()) {
    const rows = await nearbyUsers("rescuer", lat, lng, radiusKm);
    for (const r of rows) {
      byId.set(r.userId, {
        id: r.userId,
        distanceKm: r.distanceKm,
        lat: r.lat,
        lng: r.lng,
        fixAgeSeconds: r.ts ? Math.max(0, (Date.now() - r.ts) / 1000) : 0,
        source: "redis",
      });
    }
  }

  // ── Nguồn 2: vị trí cuối cùng của rescuer ĐANG TRỰC ──
  // Chỉ quét người đang trực nên tập rất nhỏ; Redis có rồi thì bỏ qua.
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT ul.user_id AS id,
              ul.latitude,
              ul.longitude,
              EXTRACT(EPOCH FROM (NOW() - ul.updated_at)) AS fix_age_seconds,
              6371 * acos(LEAST(1, GREATEST(-1,
                cos(radians($1)) * cos(radians(ul.latitude)) *
                cos(radians(ul.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(ul.latitude))
              ))) AS distance_km
       FROM user_locations ul
       JOIN users u ON u.id = ul.user_id
       WHERE u.role = 'rescuer'
         AND u.is_active = TRUE
         AND u.duty_status = 'on'
         AND ul.updated_at > NOW() - make_interval(mins => $3)
     ) d
     WHERE d.distance_km <= $4
     ORDER BY d.distance_km ASC
     LIMIT 50`,
    [lat, lng, cfg.FALLBACK_MAX_AGE_MINUTES, radiusKm]
  );

  for (const r of rows) {
    if (byId.has(r.id)) continue; // Redis đã có toạ độ mới hơn
    byId.set(r.id, {
      id: r.id,
      distanceKm: Number(r.distance_km),
      lat: r.latitude,
      lng: r.longitude,
      fixAgeSeconds: Number(r.fix_age_seconds) || 0,
      source: "postgres",
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Bước 2: lọc danh sách "ở gần" thành danh sách "thực sự mời được", và kèm
 * theo các chỉ số để chấm điểm. Tất cả trong MỘT câu SQL.
 *
 * Điều kiện loại:
 *   - không phải rescuer active / đang tắt trực
 *   - không thuộc team active nào (ràng buộc NO_TEAM vẫn giữ)
 *   - chính là người gửi SOS
 *   - ĐÃ từng được giao request này (bỏ ca rồi, hoặc bị watchdog thu hồi) —
 *     không giao lại cho cùng một người
 *
 * DISTINCT ON: một rescuer có thể ở nhiều team — lấy team tham gia gần nhất,
 * khớp với cách PUT /api/sos/:id/accept đang chọn team.
 */
async function findCandidates({ requestId, victimId, nearby }) {
  if (nearby.length === 0) return [];

  const byId = new Map(nearby.map((n) => [n.id, n]));
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (u.id)
            u.id,
            u.display_name,
            u.email,
            m.group_id,
            g.name AS group_name,
            load.active_missions,
            hist.total  AS hist_total,
            hist.misses AS hist_misses
     FROM users u
     JOIN rescue_group_members m ON m.user_id = u.id AND m.join_status = 'active'
     JOIN rescue_groups g        ON g.id = m.group_id AND g.status = 'active'
     CROSS JOIN LATERAL (
       SELECT COUNT(*)::int AS active_missions
       FROM rescue_requests rr
       WHERE rr.assigned_to = u.id
         AND rr.status IN ('assigned', 'in_progress')
     ) load
     CROSS JOIN LATERAL (
       -- Độ tin cậy = đã được giao bao nhiêu ca, bỏ mất bao nhiêu.
       -- 'released'   = tự thả ca sau khi được giao
       -- 'reassigned' = watchdog thu hồi vì mất tích
       SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE o.status IN ('released', 'reassigned'))::int AS misses
       FROM rescue_dispatch_offers o
       WHERE o.rescuer_id = u.id
         AND o.created_at > NOW() - make_interval(days => $4)
     ) hist
     WHERE u.id = ANY($1::int[])
       AND u.role = 'rescuer'
       AND u.is_active = TRUE
       AND u.duty_status = 'on'
       AND u.id <> COALESCE($2, -1)
       AND NOT EXISTS (
         SELECT 1 FROM rescue_dispatch_offers prev
         WHERE prev.request_id = $3 AND prev.rescuer_id = u.id
       )
     ORDER BY u.id, m.joined_at DESC`,
    [Array.from(byId.keys()), victimId, requestId, cfg.HISTORY_WINDOW_DAYS]
  );

  return rows.map((r) => {
    const geo = byId.get(r.id);
    return {
      id: r.id,
      displayName: r.display_name,
      email: r.email,
      groupId: r.group_id,
      groupName: r.group_name,
      activeMissions: r.active_missions,
      histTotal: r.hist_total,
      histMisses: r.hist_misses,
      distanceKm: geo.distanceKm,
      lat: geo.lat,
      lng: geo.lng,
      fixAgeSeconds: geo.fixAgeSeconds,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 3. CHẤM ĐIỂM
// ═══════════════════════════════════════════════════════════════════════

/**
 * Chấm điểm và xếp hạng ứng viên (cao nhất trước).
 *
 * Bốn tiêu chí đều chuẩn hoá về 0..1 (1 = tốt nhất) rồi nhân trọng số theo
 * độ khẩn cấp — xem config/dispatch.js. Chuẩn hoá là điểm mấu chốt: nếu cộng
 * thẳng "km" với "số mission" thì đơn vị khác nhau, trọng số vô nghĩa.
 *
 * Trả về mảng đã sắp xếp, mỗi phần tử kèm `breakdown` để debug/hiển thị
 * cho admin biết vì sao người này được chọn.
 */
function scoreCandidates(candidates, urgency, radiusKm) {
  const w = cfg.WEIGHTS[urgency] || cfg.WEIGHTS.medium;

  return candidates
    .map((c) => {
      // Càng gần càng cao; ở đúng rìa bán kính thì bằng 0.
      const proximity = 1 - Math.min(c.distanceKm / radiusKm, 1);

      // Đo theo CÁ NHÂN: 0 mission = 1.0, 1 = 0.5, 2 = 0.33...
      // Giảm dần chứ không cắt cứng — ca critical vẫn có thể giao cho người
      // đang bận nếu họ gần hơn hẳn.
      const availability = 1 / (1 + c.activeMissions);

      // Tỉ lệ bỏ ca (thả lại / bị thu hồi). Chưa đủ lịch sử thì coi như hoàn
      // toàn tin cậy, tránh phạt oan người mới vào.
      const dropRate =
        c.histTotal >= cfg.MIN_OFFERS_FOR_HISTORY ? c.histMisses / c.histTotal : 0;
      const reliability = 1 - dropRate;

      // GPS càng cũ càng kém tin cậy (họ có thể đã đi xa vị trí này).
      const freshness =
        1 - Math.min(c.fixAgeSeconds / cfg.FRESHNESS_HORIZON_SECONDS, 1);

      const score =
        100 *
        (w.proximity * proximity +
          w.availability * availability +
          w.reliability * reliability +
          w.freshness * freshness);

      return {
        ...c,
        score: Math.round(score * 100) / 100,
        breakdown: { proximity, availability, reliability, freshness },
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. VÒNG ĐỜI LỜI MỜI
// ═══════════════════════════════════════════════════════════════════════

async function loadRequest(requestId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.display_name AS user_name, u.phone_number AS user_phone
     FROM rescue_requests r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.id = $1`,
    [requestId]
  );
  return rows[0] || null;
}


/** Ghi một dòng vào rescue_request_logs (không bao giờ throw). */
async function logChange(requestId, changedBy, oldStatus, newStatus, note = "") {
  try {
    await pool.query(
      `INSERT INTO rescue_request_logs (request_id, changed_by, old_status, new_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId, changedBy, oldStatus, newStatus, note]
    );
  } catch (err) {
    warn("logChange failed:", err.message);
  }
}

/** Có phân công nào của request này đang hiệu lực không? */
async function hasActiveAssignment(requestId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM rescue_dispatch_offers
     WHERE request_id = $1 AND status = 'auto_assigned' LIMIT 1`,
    [requestId]
  );
  return rows.length > 0;
}

/**
 * Hết đường: không còn ai để giao. Gắn cờ để admin nhìn thấy trên dashboard
 * và bắn notification cho toàn bộ admin đang hoạt động.
 *
 * Request VẪN ở trạng thái 'pending' — nó không biến mất, chỉ là chuyển từ
 * "máy đang lo" sang "người phải lo".
 */
async function escalate(requestId, reason) {
  await pool.query(
    `UPDATE rescue_requests SET dispatch_status = 'no_candidate' WHERE id = $1`,
    [requestId]
  );
  await logChange(requestId, null, "pending", "pending", `auto-dispatch dừng: ${reason}`);
  log(`request=${requestId} → no_candidate (${reason})`);

  try {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE`
    );
    if (rows.length === 0) return;

    const REASONS = {
      no_candidate: "không tìm được đội cứu hộ nào đang trực gần khu vực",
      no_location: "yêu cầu không có toạ độ GPS",
      max_attempts: "đã giao tối đa số lượt nhưng đều không thành",
    };

    await createNotificationsForUsers(
      rows.map((r) => r.id),
      {
        type: "dispatch_escalated",
        title: "Cần điều phối thủ công",
        body: `Yêu cầu SOS #${requestId} chưa có người xử lý — ${REASONS[reason] || reason}. Vui lòng phân công đội cứu hộ.`,
        metadata: { requestId, reason },
      }
    );
  } catch (err) {
    warn("escalate notification failed:", err.message);
  }
}

/**
 * Báo cho rescuer biết họ VỪA ĐƯỢC GIAO một ca — và báo citizen biết ai đang tới.
 *
 * Khác hẳn chế độ mời cũ: đây là thông báo, không phải câu hỏi. Rescuer không
 * bấm gì thì nhiệm vụ vẫn là của họ. Vì vậy ở đây có GỬI EMAIL (chế độ mời
 * trước kia thì không, vì lời mời chỉ sống 45s nên email luôn tới muộn).
 */
async function notifyAssignment(assignment, candidate, request) {
  const distanceText = candidate.distanceKm.toFixed(1);

  // 1. Rescuer được giao — WebSocket để hiện ngay trên màn hình
  const delivered = transport.sendToUser(candidate.id, {
    type: "dispatch_assigned",
    assignment: {
      id: assignment.id,
      requestId: request.id,
      distanceKm: Math.round(candidate.distanceKm * 100) / 100,
      urgency: request.urgency,
      location: request.location,
      description: request.description,
      citizenName: request.user_name,
      citizenPhone: request.user_phone,
      latitude: request.latitude,
      longitude: request.longitude,
      images: request.images || [],
      attempt: assignment.attempt,
      needsConfirm: cfg.ASSIGNED_STATUS === "assigned",
    },
  });

  log(
    `GIAO req=${request.id} → rescuer=${candidate.id} lượt=${assignment.attempt} ` +
      `cách=${distanceText}km điểm=${candidate.score} ws=${delivered ? "ok" : "offline"}`
  );

  pool
    .query(`SELECT email, display_name FROM users WHERE id = $1`, [candidate.id])
    .then(({ rows }) => {
      const r = rows[0];
      if (!r) return;
      return createNotification({
        userId: candidate.id,
        type: "dispatch_assigned",
        title: "Bạn được giao nhiệm vụ cứu hộ",
        body: `SOS cách bạn ${distanceText} km tại ${request.location}. Nhiệm vụ đã được giao cho bạn.`,
        metadata: { requestId: request.id, assignmentId: assignment.id },
        email: r.email
          ? {
              to: r.email,
              displayName: r.display_name,
              heading: "Bạn được giao một nhiệm vụ cứu hộ",
              message: `Hệ thống đã giao cho bạn yêu cầu cứu hộ tại <strong>${request.location}</strong> (cách bạn khoảng ${distanceText} km). Hãy mở AquaGuard để bắt đầu di chuyển.`,
            }
          : null,
      });
    })
    .catch((e) => warn("thông báo phân công lỗi:", e.message));

  // 2. Citizen — phân công đã chắc chắn nên báo luôn, không đợi rescuer xác nhận
  transport.sendToUser(request.user_id, {
    type: "sos_assigned",
    requestId: request.id,
    rescuerId: candidate.id,
    rescuerName: candidate.displayName,
  });

  pool
    .query(`SELECT email, display_name FROM users WHERE id = $1`, [request.user_id])
    .then(({ rows }) => {
      const owner = rows[0];
      if (!owner) return;
      return createNotification({
        userId: request.user_id,
        type: "sos_accepted",
        title: "Đội cứu hộ đang đến!",
        body: `${candidate.displayName} đã được phân công tới hỗ trợ bạn.`,
        metadata: { requestId: request.id, rescuerId: candidate.id },
        email: owner.email
          ? {
              to: owner.email,
              displayName: owner.display_name,
              heading: "Đội cứu hộ đã được phân công",
              message: `<strong>${candidate.displayName}</strong> đã được hệ thống phân công tới hỗ trợ bạn. Hãy giữ liên lạc và theo dõi trên AquaGuard.`,
            }
          : null,
      });
    })
    .catch((e) => warn("thông báo citizen lỗi:", e.message));
}

/**
 * MỘT BƯỚC điều phối: chọn rescuer tốt nhất chưa từng được giao ca này, rồi
 * GIAO THẲNG cho họ.
 *
 * An toàn khi gọi lặp: nếu request đã có người, hoặc đang có phân công hiệu
 * lực, hàm thoát ngay. Được gọi lại khi rescuer bỏ ca hoặc watchdog thu hồi.
 */
async function assignBest(requestId) {
  if (!cfg.ENABLED) return;
  if (inFlight.has(requestId)) return;
  inFlight.add(requestId);

  try {
    const request = await loadRequest(requestId);
    if (!request) return;

    // Đã có người xử lý (tự nhận, admin giao, hoặc auto giao rồi) → dừng.
    if (request.status !== "pending") return;
    // Admin đã giành quyền điều phối tay → máy không chen vào nữa.
    if (request.dispatch_status === "manual") return;
    // Đang có phân công hiệu lực → để watchdog lo nếu nó kẹt.
    if (await hasActiveAssignment(requestId)) return;

    // `await` chứ không `return escalate(...)`: trong try/finally, `return p`
    // chạy finally (xoá inFlight) TRƯỚC khi p hoàn tất — dễ mở cửa cho một
    // luồng khác chen vào giữa chừng.
    if (request.dispatch_attempts >= cfg.MAX_ATTEMPTS) {
      await escalate(requestId, "max_attempts");
      return;
    }

    const victim = await resolveVictimLocation(request);
    if (!victim) {
      await escalate(requestId, "no_location");
      return;
    }

    await pool.query(
      `UPDATE rescue_requests SET dispatch_status = 'searching'
       WHERE id = $1 AND status = 'pending' AND dispatch_status <> 'manual'`,
      [requestId]
    );

    // Bậc thang bán kính: người đã từng được giao ca này bị loại trong
    // findCandidates, nên khi bán kính nhỏ "cạn người" nó tự động nới rộng.
    let best = null;
    let usedRadius = null;
    for (const radiusKm of cfg.RADIUS_LADDER_KM) {
      const nearby = await findNearbyRescuers(victim.lat, victim.lng, radiusKm);
      const candidates = await findCandidates({
        requestId,
        victimId: request.user_id,
        nearby,
      });
      if (candidates.length > 0) {
        best = scoreCandidates(candidates, request.urgency, radiusKm)[0];
        usedRadius = radiusKm;
        break;
      }
    }

    if (!best) {
      await escalate(requestId, "no_candidate");
      return;
    }

    const attempt = request.dispatch_attempts + 1;

    // ── Giao thẳng ──
    // `WHERE status='pending'` vẫn là chốt chặn: nếu trong lúc ta đang chấm
    // điểm mà có người tự nhận hoặc admin giao tay, ta phải nhường.
    const updated = await pool.query(
      `UPDATE rescue_requests
       SET status = $1,
           assigned_to = $2,
           assigned_group_id = $3,
           accepted_mode = 'group',
           rescuer_latitude = $4,
           rescuer_longitude = $5,
           assigned_at = NOW(),
           auto_assigned_at = NOW(),
           dispatch_status = 'assigned_direct',
           dispatch_attempts = $6,
           dispatch_radius_km = $7
       WHERE id = $8 AND status = 'pending'
       RETURNING *`,
      [
        cfg.ASSIGNED_STATUS,
        best.id,
        best.groupId,
        best.lat,
        best.lng,
        attempt,
        usedRadius,
        requestId,
      ]
    );
    if (updated.rowCount === 0) return; // ai đó vừa giành mất — nhường

    const { rows } = await pool.query(
      `INSERT INTO rescue_dispatch_offers
         (request_id, rescuer_id, group_id, distance_km, score,
          rescuer_latitude, rescuer_longitude, attempt, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'auto_assigned')
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [requestId, best.id, best.groupId, best.distanceKm, best.score, best.lat, best.lng, attempt]
    );
    if (rows.length === 0) return;

    await logChange(
      requestId,
      best.id,
      "pending",
      cfg.ASSIGNED_STATUS,
      `auto-dispatch giao thẳng: lượt ${attempt}, ${best.distanceKm.toFixed(2)}km, điểm ${best.score}`
    );

    await notifyAssignment(rows[0], best, updated.rows[0]);
  } catch (err) {
    warn(`assignBest(${requestId}) lỗi:`, err.message);
  } finally {
    inFlight.delete(requestId);
  }
}

/**
 * Điểm vào: bắt đầu điều phối cho một SOS vừa tạo.
 * Fire-and-forget — POST /api/sos không được chờ hàm này.
 */
async function start(requestId) {
  if (!cfg.ENABLED) {
    log("auto-dispatch đang TẮT (DISPATCH_ENABLED=false)");
    return;
  }
  log(`bắt đầu điều phối request=${requestId}`);
  return assignBest(requestId);
}

/**
 * Đóng phân công đang hiệu lực của một request.
 *
 * `newStatus` quyết định nó có bị tính vào tỉ lệ bỏ ca hay không:
 *   'released'   — rescuer tự thả  → CÓ tính (hạ điểm tin cậy)
 *   'reassigned' — watchdog thu hồi → CÓ tính
 *   'superseded' — admin đè lên     → KHÔNG tính (không phải lỗi của họ)
 *   'completed'  — xong việc        → KHÔNG tính
 *
 * `exceptRescuerId`: bỏ qua phân công của chính người này. Dùng khi một
 * rescuer bấm bắt đầu ca mà hệ thống đã giao cho họ — phân công đó phải được
 * giữ nguyên 'auto_assigned', không được tự đóng.
 */
async function closeAssignment(
  requestId,
  newStatus = "superseded",
  reason = "",
  { exceptRescuerId = null } = {}
) {
  try {
    const { rows } = await pool.query(
      `UPDATE rescue_dispatch_offers
       SET status = $2, responded_at = NOW()
       WHERE request_id = $1
         AND status = 'auto_assigned'
         AND ($3::int IS NULL OR rescuer_id <> $3)
       RETURNING id, rescuer_id`,
      [requestId, newStatus, exceptRescuerId]
    );
    for (const row of rows) {
      transport.sendToUser(row.rescuer_id, {
        type: "dispatch_assignment_closed",
        assignmentId: row.id,
        requestId,
        reason: reason || newStatus,
      });
    }
    if (rows.length > 0) {
      log(`đóng phân công request=${requestId} → ${newStatus} (${reason || "—"})`);
    }
    return rows;
  } catch (err) {
    warn(`closeAssignment(${requestId}) lỗi:`, err.message);
    return [];
  }
}

/**
 * Đánh dấu request đã được điều phối thủ công → auto-dispatch rút lui.
 * Gọi từ PUT /api/sos/:id/assign (admin).
 */
async function markManual(requestId) {
  try {
    await pool.query(
      `UPDATE rescue_requests SET dispatch_status = 'manual' WHERE id = $1`,
      [requestId]
    );
    // 'superseded' chứ không phải 'released': rescuer bị admin đè lên không
    // phải lỗi của họ, không được tính vào tỉ lệ bỏ ca.
    await closeAssignment(requestId, "superseded", "admin_assigned");
  } catch (err) {
    warn(`markManual(${requestId}) lỗi:`, err.message);
  }
}


// ═══════════════════════════════════════════════════════════════════════
// 6. WATCHDOG — lưới an toàn của chế độ giao thẳng
// ═══════════════════════════════════════════════════════════════════════

let sweeping = false;

/**
 * Thu hồi những ca giao rồi mà chết cứng, giao lại cho người kế.
 *
 * Đây là cái giá phải trả khi không hỏi trước: giao trúng một rescuer vừa tắt
 * máy thì request nằm im vô thời hạn. Watchdog phát hiện bằng hai dấu hiệu
 * cùng lúc, phải thoả CẢ HAI mới thu hồi:
 *
 *   1. Quá STALE_ASSIGNMENT_SECONDS mà request vẫn ở 'assigned'
 *      (rescuer chưa bấm bắt đầu → chưa chắc họ đã thấy)
 *   2. Rescuer KHÔNG còn presence trong Redis (thực sự offline)
 *
 * Chỉ điều kiện 1 thì oan cho người đang lái xe chưa kịp bấm; chỉ điều kiện 2
 * thì oan cho người vừa mất sóng 3 giây. Phải cả hai.
 *
 * Nếu ASSIGNED_STATUS='in_progress' thì không có tín hiệu (1) → watchdog tự
 * vô hiệu, đúng như cảnh báo trong config.
 *
 * Vì sao là interval quét DB chứ không phải setTimeout? Backend chạy Render
 * free tier và ngủ sau ~15 phút — mọi setTimeout đang treo sẽ bốc hơi. Trạng
 * thái nằm trong DB thì lúc server thức dậy, lần quét đầu xử lý bù toàn bộ.
 */
async function sweep() {
  if (!cfg.ENABLED || sweeping) return;
  if (!cfg.STALE_ASSIGNMENT_SECONDS) return; // watchdog bị tắt
  sweeping = true;
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.request_id, o.rescuer_id
       FROM rescue_dispatch_offers o
       JOIN rescue_requests r ON r.id = o.request_id
       WHERE o.status = 'auto_assigned'
         AND r.status = 'assigned'
         AND o.created_at <= NOW() - make_interval(secs => $1)`,
      [cfg.STALE_ASSIGNMENT_SECONDS]
    );
    if (rows.length === 0) return;

    for (const row of rows) {
      // Điều kiện 2: còn online thì tha — họ chỉ chưa kịp bấm.
      const live = await getLiveLocation(row.rescuer_id);
      if (live) continue;

      const closed = await closeAssignment(row.request_id, "reassigned", "rescuer_offline");
      if (closed.length === 0) continue;

      // Trả request về hàng chờ rồi giao lại. assignBest sẽ tự loại rescuer
      // vừa bị thu hồi (findCandidates lọc người đã từng được giao ca này).
      await pool.query(
        `UPDATE rescue_requests
         SET status = 'pending', assigned_to = NULL, assigned_group_id = NULL,
             assigned_at = NULL, rescuer_latitude = NULL, rescuer_longitude = NULL
         WHERE id = $1 AND status = 'assigned'`,
        [row.request_id]
      );
      await logChange(
        row.request_id,
        null,
        "assigned",
        "pending",
        `watchdog thu hồi: rescuer ${row.rescuer_id} offline quá ${cfg.STALE_ASSIGNMENT_SECONDS}s`
      );
      log(`watchdog thu hồi req=${row.request_id} từ rescuer=${row.rescuer_id} → giao lại`);
      await assignBest(row.request_id);
    }
  } catch (err) {
    warn("watchdog lỗi:", err.message);
  } finally {
    sweeping = false;
  }
}

/** index.js gọi lúc khởi động. Trả về handle để clear khi tắt server. */
function startSweeper() {
  if (!cfg.ENABLED) return null;
  const handle = setInterval(sweep, cfg.SWEEP_INTERVAL_MS);
  if (handle.unref) handle.unref();
  log(
    `chế độ GIAO THẲNG (→ ${cfg.ASSIGNED_STATUS}) · tối đa ${cfg.MAX_ATTEMPTS} lượt · ` +
      `bán kính ${cfg.RADIUS_LADDER_KM.join("→")}km · ` +
      (cfg.STALE_ASSIGNMENT_SECONDS
        ? `watchdog mỗi ${cfg.SWEEP_INTERVAL_MS / 1000}s, thu hồi sau ${cfg.STALE_ASSIGNMENT_SECONDS}s`
        : "watchdog TẮT")
  );
  return handle;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. TRUY VẤN (cho route)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Phân công đang hiệu lực của một rescuer — dùng để khôi phục UI sau khi F5
 * (WebSocket push có thể đã trôi qua trong lúc trang chưa sẵn sàng).
 */
async function getActiveAssignmentsForRescuer(rescuerId) {
  const { rows } = await pool.query(
    `SELECT o.id, o.request_id, o.distance_km, o.attempt, o.created_at,
            r.status AS request_status,
            r.location, r.description, r.urgency, r.latitude, r.longitude, r.images,
            u.display_name AS citizen_name, u.phone_number AS citizen_phone
     FROM rescue_dispatch_offers o
     JOIN rescue_requests r ON r.id = o.request_id
     LEFT JOIN users u      ON u.id = r.user_id
     WHERE o.rescuer_id = $1
       AND o.status = 'auto_assigned'
       AND r.status IN ('assigned', 'in_progress')
     ORDER BY o.created_at DESC`,
    [rescuerId]
  );

  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id,
    assignedAt: r.created_at,
    distanceKm: r.distance_km == null ? null : Math.round(r.distance_km * 100) / 100,
    urgency: r.urgency,
    location: r.location,
    description: r.description,
    citizenName: r.citizen_name,
    citizenPhone: r.citizen_phone,
    latitude: r.latitude,
    longitude: r.longitude,
    images: r.images || [],
    attempt: r.attempt,
    // Còn ở 'assigned' nghĩa là rescuer chưa bấm bắt đầu → vẫn phải nhắc họ.
    needsConfirm: r.request_status === "assigned",
  }));
}

/** Dấu vết điều phối của một request — admin xem đã giao cho ai, kết cục ra sao. */
async function getTrail(requestId) {
  const { rows } = await pool.query(
    `SELECT o.id, o.rescuer_id, o.group_id, o.distance_km, o.score, o.attempt,
            o.status, o.expires_at, o.responded_at, o.created_at,
            u.display_name AS rescuer_name,
            g.name         AS group_name
     FROM rescue_dispatch_offers o
     LEFT JOIN users u        ON u.id = o.rescuer_id
     LEFT JOIN rescue_groups g ON g.id = o.group_id
     WHERE o.request_id = $1
     ORDER BY o.attempt ASC, o.created_at ASC`,
    [requestId]
  );
  return rows;
}

module.exports = {
  setTransport,
  start,
  assignBest,
  closeAssignment,
  sweep,
  startSweeper,
  markManual,
  getActiveAssignmentsForRescuer,
  getTrail,
  // Xuất ra để test/tinh chỉnh thuật toán độc lập với DB
  scoreCandidates,
};
