/**
 * Cấu hình thuật toán điều phối cứu hộ tự động.
 *
 * Toàn bộ "núm vặn" của thuật toán nằm ở đây — services/dispatch.js chỉ chứa
 * logic. Muốn thuật toán chọn khác đi thì sửa file này, không đụng vào logic.
 * Mọi giá trị đều override được bằng biến môi trường để tinh chỉnh trên Render
 * mà không cần deploy lại code.
 */

const num = (envVal, fallback) => {
  const n = Number(envVal);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

module.exports = {
  // Tắt toàn bộ auto-dispatch (request sẽ nằm pending chờ admin như trước đây).
  ENABLED: process.env.DISPATCH_ENABLED !== "false",

  /**
   * Trạng thái đặt cho request khi hệ thống GIAO THẲNG.
   *
   *   'assigned'    — nhiệm vụ đã là của rescuer đó (không ai giành được nữa),
   *                   nhưng họ vẫn bấm "Nhận nhiệm vụ" để báo đã bắt đầu đi.
   *                   Bước xác nhận này chính là tín hiệu watchdog dùng để phát
   *                   hiện người được giao đang mất tích. KHUYẾN NGHỊ.
   *
   *   'in_progress' — bỏ luôn bước xác nhận, coi như rescuer đã lên đường ngay
   *                   khi được giao. Không cần thao tác nào, nhưng đổi lại
   *                   watchdog mất tín hiệu và không phát hiện được ca chết.
   */
  ASSIGNED_STATUS: process.env.DISPATCH_ASSIGNED_STATUS === "in_progress"
    ? "in_progress"
    : "assigned",

  /**
   * Watchdog: rescuer được giao mà sau ngần này giây vẫn chưa bấm bắt đầu
   * (request còn ở 'assigned') VÀ đã offline → thu hồi, giao cho người kế.
   *
   * Đây là lưới an toàn của chế độ giao thẳng: không có nó, giao nhầm cho một
   * người vừa tắt máy là request nằm chết vĩnh viễn.
   * Đặt 0 để tắt watchdog.
   */
  STALE_ASSIGNMENT_SECONDS: Number(process.env.DISPATCH_STALE_ASSIGNMENT ?? 120),

  // Số lần giao lại tối đa cho một request trước khi bỏ cuộc và báo admin.
  MAX_ATTEMPTS: num(process.env.DISPATCH_MAX_ATTEMPTS, 5),

  // Bậc thang bán kính. Thuật toán thử bán kính nhỏ trước; chỉ khi không còn
  // ứng viên MỚI nào trong bán kính đó mới nới rộng ra.
  RADIUS_LADDER_KM: (process.env.DISPATCH_RADIUS_LADDER || "5,10,20")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0),

  // Chu kỳ watchdog quét phân công bị kẹt.
  SWEEP_INTERVAL_MS: num(process.env.DISPATCH_SWEEP_INTERVAL_MS, 15_000),

  // Nguồn vị trí phụ (user_locations) chỉ nhận toạ độ mới hơn ngưỡng này (phút).
  // Dùng cho rescuer đang trực nhưng presence Redis đã hết hạn — ví dụ tab chạy
  // nền bị trình duyệt bóp timer, hoặc điện thoại vừa khoá màn hình.
  // Cũ hơn ngưỡng này thì toạ độ không còn đáng tin để điều phối.
  FALLBACK_MAX_AGE_MINUTES: num(process.env.DISPATCH_FALLBACK_MAX_AGE_MIN, 60),

  // Cần ít nhất bao nhiêu lần được giao trong lịch sử thì điểm "độ tin cậy"
  // mới có ý nghĩa. Dưới ngưỡng này, rescuer được coi là hoàn toàn tin cậy để
  // không bị phạt oan lúc chưa có dữ liệu.
  MIN_OFFERS_FOR_HISTORY: num(process.env.DISPATCH_MIN_OFFERS_HISTORY, 3),
  HISTORY_WINDOW_DAYS: num(process.env.DISPATCH_HISTORY_WINDOW_DAYS, 7),

  /**
   * Trọng số chấm điểm theo độ khẩn cấp của request.
   *
   * Bốn tiêu chí, mỗi tiêu chí chuẩn hoá về thang 0..1 (1 = tốt nhất):
   *   proximity    — càng gần càng cao
   *   availability — càng ít mission đang ôm càng cao (đo theo CÁ NHÂN)
   *   reliability  — càng ít BỎ CA sau khi được giao càng cao
   *   freshness    — toạ độ GPS càng mới càng cao
   *
   * Lưu ý: từ chế độ giao thẳng, rescuer không còn "từ chối" được nữa, nên
   * reliability đo bằng TỈ LỆ BỎ CA (nhận rồi thả lại) thay cho tỉ lệ từ chối.
   *
   * Mỗi hàng phải cộng lại bằng 1.0.
   *
   * Ý đồ: ca `critical` gần như chỉ quan tâm khoảng cách (cứu nhanh là trên
   * hết, kể cả người đó đang bận); ca `low` cân bằng tải nhiều hơn để không
   * vắt kiệt vài rescuer chăm chỉ.
   */
  WEIGHTS: {
    critical: { proximity: 0.70, availability: 0.10, reliability: 0.15, freshness: 0.05 },
    high:     { proximity: 0.60, availability: 0.18, reliability: 0.17, freshness: 0.05 },
    medium:   { proximity: 0.50, availability: 0.25, reliability: 0.20, freshness: 0.05 },
    low:      { proximity: 0.40, availability: 0.35, reliability: 0.20, freshness: 0.05 },
  },

  // Tuổi GPS (giây) mà tại đó điểm freshness về 0. Khớp với TTL presence Redis.
  FRESHNESS_HORIZON_SECONDS: num(process.env.DISPATCH_FRESHNESS_HORIZON, 60),
};
