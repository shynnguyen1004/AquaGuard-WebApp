/**
 * ═══════════════════════════════════════════════════════════════════════
 * CẢM BIẾN MỰC NƯỚC — API cho thiết bị ESP32 và cho chủ thiết bị
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Hai loại client, hai cách xác thực khác nhau:
 *
 *   • BOARD ESP32  → POST /api/sensors/ingest, header `X-Device-Key`.
 *     Board không có người ngồi đăng nhập, cũng không giữ nổi JWT hết hạn,
 *     nên dùng key dài hạn. Server chỉ lưu SHA-256 của key.
 *
 *   • TRÌNH DUYỆT  → mọi route còn lại, JWT như phần còn lại của app.
 *
 * Ghi dữ liệu: bảng `water_sensors` luôn giữ ảnh chụp mới nhất (1 UPDATE mỗi
 * lần board gửi), còn `water_sensor_readings` — chuỗi vẽ biểu đồ — chỉ ghi khi
 * mực nước đổi đáng kể hoặc đã quá SAMPLE_MIN_GAP_MS. Board gửi mỗi 2s nhưng
 * chuỗi lưu lại chỉ dày cỡ 3 điểm/phút khi nước đứng yên.
 */

const crypto = require("crypto");
const express = require("express");
const pool = require("../db");
const { authMiddleware, requireRoles } = require("../middleware/auth");
const { createNotification } = require("../utils/notifications");
const {
  ONLINE_WINDOW_SEC,
  cleanPoints,
  isCalibrated,
  rawToPercent,
  percentToLevel,
  levelKey,
} = require("../config/waterLevels");

const router = express.Router();

// Khoảng cách tối thiểu giữa hai điểm ghi vào chuỗi số đo. Thiết bị gửi mỗi
// ~2s; ghi hết thì một tháng vài trăm nghìn dòng mà biểu đồ chẳng đẹp thêm.
const SAMPLE_MIN_GAP_MS = 20 * 1000;
// ...trừ khi mực nước đổi từ ngần này % trở lên thì ghi ngay (bắt lũ lên nhanh).
const SAMPLE_DELTA_PCT = 1;
// Đã báo động rồi thì im trong khoảng này, trừ khi nước dâng lên MỨC cao hơn.
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
// Nhưng kể cả khi leo mức, hai cảnh báo phải cách nhau ít nhất ngần này —
// dải mức giờ chỉ rộng ~12%, nước dâng nhanh có thể nhảy mấy mức trong vài giây.
const ALERT_ESCALATION_MIN_GAP_MS = 60 * 1000;
// Tụt dưới (ngưỡng - ngần này) mới coi là "hết báo động" và cho phép báo lại.
const ALERT_CLEAR_MARGIN = 5;

// Trần số thiết bị mỗi tài khoản. Rộng tay vì giờ chủ sở hữu là ĐỘI cứu hộ
// triển khai cả khu, không phải một hộ dân lắp một cái ở sân.
const MAX_SENSORS_PER_USER = 50;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Sinh device key mới. Trả về { key, hash, prefix }. Key CHỈ hiện đúng 1 lần. */
function generateDeviceKey() {
  const key = `aqg_${crypto.randomBytes(24).toString("base64url")}`;
  return {
    key,
    hash: crypto.createHash("sha256").update(key).digest("hex"),
    prefix: key.slice(0, 12),
  };
}

function hashKey(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

/**
 * Đẩy message tới mọi socket của một user, qua registry always-on mà index.js
 * đã đặt vào app (`userSockets`). Không mở kết nối mới, không phụ thuộc vòng.
 */
function pushToUser(req, userId, message) {
  const userSockets = req.app.get("userSockets");
  const sockets = userSockets?.get(userId);
  if (!sockets || sockets.size === 0) return false;
  const payload = JSON.stringify(message);
  let delivered = false;
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
      delivered = true;
    }
  });
  return delivered;
}

/** Dạng thiết bị trả về cho frontend (không bao giờ kèm key/hash). */
function shapeSensor(row) {
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
  const online = Boolean(
    lastSeen && Date.now() - lastSeen.getTime() < ONLINE_WINDOW_SEC * 1000
  );
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.device_key_prefix,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address || "",
    calibrated: isCalibrated(row.calibration),
    alertEnabled: row.alert_enabled,
    alertThreshold: row.alert_threshold,
    percent: row.last_percent,
    raw: row.last_raw,
    level: row.last_level,
    levelKey: levelKey(row.last_level ?? 0),
    lastSeenAt: row.last_seen_at,
    online,
    createdAt: row.created_at,
  };
}

/**
 * Mệnh đề WHERE để thao tác lên MỘT thiết bị.
 *
 * Admin đụng được mọi thiết bị; rescuer chỉ đụng được thiết bị mình tạo. Quy
 * tắc này áp cho cả sửa, xoay key lẫn xoá — cho admin quyền xoá mà không cho
 * sửa thì giao diện sẽ hiện nút rồi báo 404, tệ hơn là không có nút.
 *
 * Trả về { clause, values } để ghép thẳng vào query.
 */
function ownedBy(user, id) {
  return user.role === "admin"
    ? { clause: "id = $1", values: [id] }
    : { clause: "id = $1 AND user_id = $2", values: [id, user.id] };
}

/**
 * Dạng thiết bị cho màn GIÁM SÁT (rescuer/admin). Khác bản của chủ thiết bị ở
 * hai điểm: có thông tin chủ sở hữu + chuỗi số đo gần đây để vẽ sparkline, và
 * KHÔNG có `keyPrefix` — đó là một mẩu bí mật của người khác, người giám sát
 * không có việc gì phải biết.
 */
function shapeMonitorSensor(row, user) {
  const base = shapeSensor(row);
  delete base.keyPrefix;
  return {
    ...base,
    // Server tự chấm quyền thay vì để giao diện đoán: admin sửa/xoá được mọi
    // thiết bị, rescuer chỉ thiết bị mình tạo. Giao diện chỉ việc ẩn/hiện nút.
    canManage: user.role === "admin" || row.user_id === user.id,
    owner: {
      id: row.user_id,
      displayName: row.owner_name || "",
      // Số điện thoại chỉ dành cho admin — rescuer liên lạc qua luồng SOS,
      // không cần danh bạ của mọi người đã lắp cảm biến.
      ...(user.role === "admin" ? { phoneNumber: row.owner_phone || "" } : {}),
    },
    history: Array.isArray(row.history)
      ? row.history.map((h) => ({ percent: h.percent, at: h.at }))
      : [],
  };
}

// ══════════════════════════════════════════════
// PHẦN 1 — THIẾT BỊ GỬI SỐ ĐO (không dùng JWT)
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
// POST /api/sensors/ingest
// Header: X-Device-Key: aqg_...
// Body:   { raw, percent?, voltage_mv?, calibration? }
//
// `raw` là nguồn sự thật: server quy đổi lại bằng bảng hiệu chuẩn đang lưu,
// nên đổi hiệu chuẩn không cần nạp lại firmware. `percent` do board gửi chỉ
// dùng khi thiếu raw.
// ──────────────────────────────────────────────
router.post("/ingest", async (req, res) => {
  const key = req.headers["x-device-key"] || req.body?.deviceKey;
  if (!key) {
    return res.status(401).json({ success: false, message: "Missing device key" });
  }

  try {
    const found = await pool.query(
      `SELECT s.*, u.display_name, u.email
       FROM water_sensors s
       JOIN users u ON u.id = s.user_id
       WHERE s.device_key_hash = $1`,
      [hashKey(key)]
    );
    const sensor = found.rows[0];
    if (!sensor) {
      return res.status(401).json({ success: false, message: "Unknown device key" });
    }

    // ── Hiệu chuẩn: board có thể gửi kèm calib.json của nó ở lần gửi đầu ──
    // Bảng hỏng thì KHÔNG ghi đè: giữ nguyên bảng cũ (hoặc để trống và dùng
    // bảng mặc định) còn hơn lưu một bảng làm mọi số đo thành 100%.
    let calibration = sensor.calibration;
    if (Array.isArray(req.body?.calibration)) {
      if (isCalibrated(req.body.calibration)) {
        calibration = cleanPoints(req.body.calibration);
        await pool.query(`UPDATE water_sensors SET calibration = $2 WHERE id = $1`, [
          sensor.id,
          JSON.stringify(calibration),
        ]);
      } else {
        console.warn(`[Sensor] thiết bị ${sensor.id} gửi bảng hiệu chuẩn không dùng được — bỏ qua`);
      }
    }

    // ── Quy đổi ──
    const raw = Number.isFinite(Number(req.body?.raw)) ? Math.round(Number(req.body.raw)) : null;
    const reportedPct = Number(req.body?.percent);
    const percent =
      raw !== null
        ? rawToPercent(raw, calibration)
        : Math.max(0, Math.min(100, Math.round(Number.isFinite(reportedPct) ? reportedPct : 0)));
    if (raw === null && !Number.isFinite(reportedPct)) {
      return res.status(400).json({ success: false, message: "raw or percent required" });
    }
    const level = percentToLevel(percent);
    const voltageMv = Number.isFinite(Number(req.body?.voltage_mv))
      ? Math.round(Number(req.body.voltage_mv))
      : raw !== null
        ? Math.round((raw * 3100) / 65535)
        : null;

    // ── Lấy mẫu thưa: chỉ ghi chuỗi khi đổi đáng kể hoặc đã đủ lâu ──
    const lastSeen = sensor.last_seen_at ? new Date(sensor.last_seen_at).getTime() : 0;
    const shouldStore =
      !lastSeen ||
      Date.now() - lastSeen >= SAMPLE_MIN_GAP_MS ||
      Math.abs((sensor.last_percent ?? 0) - percent) >= SAMPLE_DELTA_PCT;

    if (shouldStore) {
      await pool.query(
        `INSERT INTO water_sensor_readings (sensor_id, raw, percent, level, voltage_mv)
         VALUES ($1, $2, $3, $4, $5)`,
        [sensor.id, raw, percent, level, voltageMv]
      );
    }

    // ── Báo động: leo lên MỨC cao hơn thì báo ngay, cùng mức thì chờ cooldown ──
    const threshold = sensor.alert_threshold;
    const lastAlertAt = sensor.last_alert_at ? new Date(sensor.last_alert_at).getTime() : 0;
    let alertLevel = sensor.last_alert_level || 0;
    let firedAlert = false;

    const sinceLastAlert = Date.now() - lastAlertAt;
    if (percent < threshold - ALERT_CLEAR_MARGIN) {
      alertLevel = 0; // nước rút → cho phép báo lại lần sau
    } else if (
      sensor.alert_enabled &&
      percent >= threshold &&
      // Ngưỡng người dùng đặt là thứ quyết định — không có tầng lọc theo mức
      // nào khác, để thanh trượt trên web nói gì thì hệ thống làm đúng thế.
      (level > alertLevel
        ? sinceLastAlert >= ALERT_ESCALATION_MIN_GAP_MS
        : sinceLastAlert >= ALERT_COOLDOWN_MS)
    ) {
      alertLevel = level;
      firedAlert = true;
    }

    // ── Ảnh chụp mới nhất (luôn ghi — đây là tín hiệu "còn sống" của thiết bị) ──
    await pool.query(
      `UPDATE water_sensors
       SET last_raw = $2, last_percent = $3, last_level = $4, last_seen_at = NOW(),
           last_alert_level = $5,
           last_alert_at = CASE WHEN $6 THEN NOW() ELSE last_alert_at END
       WHERE id = $1`,
      [sensor.id, raw, percent, level, alertLevel, firedAlert]
    );

    // ── Đẩy realtime cho chủ thiết bị (nếu họ đang mở web) ──
    pushToUser(req, sensor.user_id, {
      type: "sensor_reading",
      sensorId: sensor.id,
      name: sensor.name,
      raw,
      percent,
      level,
      levelKey: levelKey(level),
      at: new Date().toISOString(),
    });

    if (firedAlert) {
      const title = `Cảnh báo ngập: ${sensor.name}`;
      // Người nhận là thành viên đội đã lắp thiết bị, không phải hộ dân —
      // nên lời nhắc là việc cần làm của người trực.
      const body = `Cảm biến "${sensor.name}"${sensor.address ? ` (${sensor.address})` : ""} đo được mực nước ${percent}% (ngưỡng ${threshold}%). Kiểm tra khu vực và cảnh báo người dân xung quanh nếu cần.`;
      // fire-and-forget — số đo tiếp theo không được chờ email
      createNotification({
        userId: sensor.user_id,
        type: "water_sensor_alert",
        title,
        body,
        metadata: { sensorId: sensor.id, percent, level },
        email: sensor.email
          ? {
              to: sensor.email,
              displayName: sensor.display_name,
              heading: title,
              message: body,
            }
          : null,
      }).catch((err) => console.error("[Sensor] alert notification failed:", err.message));

      pushToUser(req, sensor.user_id, {
        type: "sensor_alert",
        sensorId: sensor.id,
        name: sensor.name,
        percent,
        level,
        levelKey: levelKey(level),
      });
    }

    // Board dùng phần trả về để chớp LED / hiện lên serial.
    return res.json({
      success: true,
      data: { percent, level, stored: shouldStore, alert: firedAlert },
    });
  } catch (err) {
    console.error("[Sensor] ingest error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════
// PHẦN 2 — CHỦ THIẾT BỊ (JWT)
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
// GET /api/sensors — thiết bị của tôi + số đo mới nhất
// ──────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM water_sensors WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.user.id]
    );
    return res.json({ success: true, data: result.rows.map(shapeSensor) });
  } catch (err) {
    console.error("[Sensor] list error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/sensors/monitor — TOÀN BỘ cảm biến trong hệ thống
// Dành cho rescuer + admin (Trung tâm Giám sát). Người dân chỉ thấy thiết bị
// của mình qua GET /api/sensors.
//
// Một query duy nhất kéo cả chuỗi số đo gần đây (LATERAL) — danh sách 50 thiết
// bị mà gọi 50 query nữa thì màn hình poll 5 giây sẽ giết database.
// ──────────────────────────────────────────────
router.get("/monitor", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
              u.display_name AS owner_name,
              u.phone_number AS owner_phone,
              COALESCE(h.history, '[]'::json) AS history
       FROM water_sensors s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('percent', r.percent, 'at', r.recorded_at)
                         ORDER BY r.recorded_at) AS history
         FROM (
           SELECT percent, recorded_at
           FROM water_sensor_readings
           WHERE sensor_id = s.id
             AND recorded_at >= NOW() - interval '6 hours'
           ORDER BY recorded_at DESC
           LIMIT 24
         ) r
       ) h ON TRUE
       ORDER BY s.last_percent DESC NULLS LAST, s.id ASC`
    );

    const data = result.rows.map((row) => shapeMonitorSensor(row, req.user));

    // Xếp theo mức độ khẩn: đang vượt ngưỡng trước, rồi tới còn sống, rồi mất
    // kết nối — rescuer mở trang là thấy ngay chỗ cần lo.
    const severity = (s) => {
      if (!s.online) return 3;
      if (s.percent != null && s.percent >= s.alertThreshold) return 0;
      if (s.level >= 5) return 1;
      return 2;
    };
    data.sort((a, b) => severity(a) - severity(b) || (b.percent ?? -1) - (a.percent ?? -1));

    return res.json({
      success: true,
      data,
      summary: {
        total: data.length,
        online: data.filter((s) => s.online).length,
        offline: data.filter((s) => !s.online).length,
        warning: data.filter((s) => s.online && s.percent != null && s.percent >= s.alertThreshold).length,
        critical: data.filter((s) => s.online && s.level === 9).length,
      },
    });
  } catch (err) {
    console.error("[Sensor] monitor error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// POST /api/sensors — ghép nối một board mới
//
// CHỈ cứu hộ và quản trị. Cảm biến là thiết bị của đội triển khai, không phải
// thứ ai cũng tự đăng ký: người tạo chịu trách nhiệm lắp, hiệu chuẩn và nhận
// cảnh báo của nó. Người dân xem tình hình ngập qua bản đồ và cảnh báo chung.
//
// Trả về deviceKey ĐÚNG MỘT LẦN (server chỉ giữ hash). Mất thì xoay key mới.
// ──────────────────────────────────────────────
router.post("/", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const count = await pool.query(
      `SELECT COUNT(*)::int AS n FROM water_sensors WHERE user_id = $1`,
      [req.user.id]
    );
    if (count.rows[0].n >= MAX_SENSORS_PER_USER) {
      return res.status(400).json({
        success: false,
        message: `Mỗi tài khoản chỉ ghép được tối đa ${MAX_SENSORS_PER_USER} cảm biến.`,
      });
    }

    const name = String(req.body?.name || "").trim().slice(0, 80) || "Cảm biến mực nước";
    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    const address = String(req.body?.address || "").trim();
    const calibration = isCalibrated(req.body?.calibration)
      ? cleanPoints(req.body.calibration)
      : null;

    const { key, hash, prefix } = generateDeviceKey();

    const result = await pool.query(
      `INSERT INTO water_sensors
         (user_id, name, device_key_hash, device_key_prefix,
          latitude, longitude, address, calibration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        name,
        hash,
        prefix,
        Number.isFinite(lat) ? lat : null,
        Number.isFinite(lng) ? lng : null,
        address,
        calibration ? JSON.stringify(calibration) : null,
      ]
    );

    return res.status(201).json({
      success: true,
      data: { ...shapeSensor(result.rows[0]), deviceKey: key },
    });
  } catch (err) {
    console.error("[Sensor] create error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/sensors/:id — đổi tên / ngưỡng / vị trí / hiệu chuẩn
// ──────────────────────────────────────────────
router.put("/:id", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const scope = ownedBy(req.user, id);
    const fields = [];
    const values = [...scope.values];
    const push = (sql, value) => {
      values.push(value);
      fields.push(`${sql} = $${values.length}`);
    };

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim().slice(0, 80);
      if (!name) return res.status(400).json({ success: false, message: "Tên không được để trống" });
      push("name", name);
    }
    if (req.body?.alertThreshold !== undefined) {
      const threshold = Math.round(Number(req.body.alertThreshold));
      if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
        return res.status(400).json({ success: false, message: "Ngưỡng phải trong khoảng 1-100" });
      }
      push("alert_threshold", threshold);
    }
    if (req.body?.alertEnabled !== undefined) push("alert_enabled", Boolean(req.body.alertEnabled));
    if (req.body?.address !== undefined) push("address", String(req.body.address).trim());
    if (req.body?.latitude !== undefined && req.body?.longitude !== undefined) {
      const lat = Number(req.body.latitude);
      const lng = Number(req.body.longitude);
      push("latitude", Number.isFinite(lat) ? lat : null);
      push("longitude", Number.isFinite(lng) ? lng : null);
    }
    if (Array.isArray(req.body?.calibration)) {
      if (!isCalibrated(req.body.calibration)) {
        return res.status(400).json({
          success: false,
          message: "Bảng hiệu chuẩn không hợp lệ (các điểm gần như bằng nhau). Chạy lại calibrate.py.",
        });
      }
      push("calibration", JSON.stringify(cleanPoints(req.body.calibration)));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Không có gì để cập nhật" });
    }

    const result = await pool.query(
      `UPDATE water_sensors SET ${fields.join(", ")}
       WHERE ${scope.clause}
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cảm biến" });
    }
    return res.json({ success: true, data: shapeSensor(result.rows[0]) });
  } catch (err) {
    console.error("[Sensor] update error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// POST /api/sensors/:id/rotate-key — cấp key mới (key cũ hết hiệu lực ngay)
// ──────────────────────────────────────────────
router.post("/:id/rotate-key", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const scope = ownedBy(req.user, id);
    const { key, hash, prefix } = generateDeviceKey();
    const result = await pool.query(
      `UPDATE water_sensors
       SET device_key_hash = $${scope.values.length + 1}, device_key_prefix = $${scope.values.length + 2}
       WHERE ${scope.clause}
       RETURNING *`,
      [...scope.values, hash, prefix]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cảm biến" });
    }
    return res.json({ success: true, data: { ...shapeSensor(result.rows[0]), deviceKey: key } });
  } catch (err) {
    console.error("[Sensor] rotate-key error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/sensors/:id — gỡ thiết bị (kéo theo toàn bộ số đo)
//
// Admin gỡ được MỌI thiết bị (dọn thiết bị hỏng, thiết bị của người đã rời
// đội); rescuer chỉ gỡ được thiết bị mình tạo.
// ──────────────────────────────────────────────
router.delete("/:id", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const scope = ownedBy(req.user, id);
    const result = await pool.query(
      `DELETE FROM water_sensors WHERE ${scope.clause} RETURNING id`,
      scope.values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cảm biến" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("[Sensor] delete error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/sensors/:id/readings?hours=6 — chuỗi số đo để vẽ biểu đồ
// ──────────────────────────────────────────────
router.get("/:id/readings", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const hours = Math.min(Math.max(Number(req.query.hours) || 6, 1), 168);

    // Người dân chỉ đọc được thiết bị của mình; rescuer/admin đọc được tất cả
    // (Trung tâm Giám sát cần vẽ biểu đồ cho thiết bị của người khác).
    const canSeeAll = ["rescuer", "admin"].includes(req.user.role);
    const owned = await pool.query(
      canSeeAll
        ? `SELECT id FROM water_sensors WHERE id = $1`
        : `SELECT id FROM water_sensors WHERE id = $1 AND user_id = $2`,
      canSeeAll ? [id] : [id, req.user.id]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cảm biến" });
    }

    const result = await pool.query(
      `SELECT percent, level, raw, recorded_at
       FROM water_sensor_readings
       WHERE sensor_id = $1 AND recorded_at >= NOW() - ($2 || ' hours')::interval
       ORDER BY recorded_at ASC
       LIMIT 1000`,
      [id, String(hours)]
    );

    return res.json({
      success: true,
      data: result.rows.map((r) => ({
        percent: r.percent,
        level: r.level,
        raw: r.raw,
        at: r.recorded_at,
      })),
    });
  } catch (err) {
    console.error("[Sensor] readings error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
