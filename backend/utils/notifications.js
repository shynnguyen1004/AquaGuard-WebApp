const pool = require("../db");
const { sendNotificationEmail } = require("./email");

/**
 * Tạo 1 notification in-app cho 1 user. KHÔNG throw — luôn nuốt lỗi để không
 * làm hỏng luồng chính (giống pattern fire-and-forget của utils/email.js).
 *
 * @param {Object} opts
 * @param {number} opts.userId        ID người nhận
 * @param {string} opts.type          Loại noti (welcome, family_request, sos_accepted, ...)
 * @param {string} opts.title         Tiêu đề
 * @param {string} [opts.body]        Nội dung
 * @param {Object} [opts.metadata]    Dữ liệu kèm theo (vd { requestId })
 * @param {Object} [opts.email]       Nếu có → mirror qua email (fire-and-forget).
 *                                    { to, displayName, heading, message }
 * @returns {Promise<number|null>} id notification vừa tạo, hoặc null nếu lỗi
 */
async function createNotification({ userId, type, title, body = "", metadata = {}, email = null }) {
  if (!userId || !type || !title) return null;

  let notifId = null;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, type, title, body, JSON.stringify(metadata || {})]
    );
    notifId = result.rows[0]?.id ?? null;
  } catch (err) {
    console.error("[Notif] Failed to create notification:", err.message);
  }

  // Mirror qua email nếu được yêu cầu (không await — fire-and-forget)
  if (email && email.to) {
    sendNotificationEmail({
      to: email.to,
      displayName: email.displayName,
      heading: email.heading || title,
      message: email.message || body,
    }).catch((e) => console.error("[Notif] mirror email error:", e.message));
  }

  return notifId;
}

/**
 * Tạo cùng 1 notification cho nhiều user (bulk INSERT bằng unnest).
 * Dùng cho family fan-out hoặc admin broadcast. KHÔNG gửi email ở đây
 * (broadcast email dễ thành spam) — gọi createNotification riêng nếu cần email.
 *
 * @param {number[]} userIds
 * @param {Object} opts { type, title, body, metadata }
 * @returns {Promise<number>} số notification đã tạo
 */
async function createNotificationsForUsers(userIds, { type, title, body = "", metadata = {} }) {
  const ids = (userIds || []).filter((id) => Number.isInteger(id));
  if (ids.length === 0 || !type || !title) return 0;

  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, metadata)
       SELECT uid, $2, $3, $4, $5
       FROM unnest($1::int[]) AS uid
       RETURNING id`,
      [ids, type, title, body, JSON.stringify(metadata || {})]
    );
    return result.rowCount;
  } catch (err) {
    console.error("[Notif] Failed to bulk-create notifications:", err.message);
    return 0;
  }
}

module.exports = { createNotification, createNotificationsForUsers };
