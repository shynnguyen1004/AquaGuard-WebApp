const { Resend } = require("resend");

// ── Resend client ──
// Lấy API key tại: https://resend.com → API Keys
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Địa chỉ gửi đi. Khi chưa verify domain riêng, dùng "AquaGuard <onboarding@resend.dev>".
// Sau khi verify domain, đổi thành "AquaGuard <no-reply@your-domain.com>".
const EMAIL_FROM = process.env.EMAIL_FROM || "AquaGuard <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Validate email format (đơn giản, đủ dùng)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

/**
 * Gửi 1 email. KHÔNG throw — luôn trả về { ok, ... } để bên gọi
 * dùng kiểu "fire-and-forget", lỗi email không làm hỏng luồng chính.
 *
 * @param {Object} opts
 * @param {string} opts.to       Địa chỉ người nhận
 * @param {string} opts.subject  Tiêu đề
 * @param {string} opts.html     Nội dung HTML
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.warn("✉️  [Email] RESEND_API_KEY chưa cấu hình — bỏ qua gửi email.");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  if (!isValidEmail(to)) {
    console.warn(`✉️  [Email] Địa chỉ nhận không hợp lệ: ${to}`);
    return { ok: false, error: "Invalid recipient email" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: to.trim(),
      subject,
      html,
    });

    if (error) {
      console.error("✉️  [Email] Resend trả lỗi:", error);
      return { ok: false, error: error.message || String(error) };
    }

    console.log(`✉️  [Email] Đã gửi "${subject}" tới ${to} (id: ${data?.id})`);
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("✉️  [Email] Gửi thất bại:", err);
    return { ok: false, error: err.message };
  }
}

// ──────────────────────────────────────────────
// Templates — bọc trong layout chung cho đồng nhất
// ──────────────────────────────────────────────

// Logo AquaGuard (favicon-512x512.png), host trên Cloudinary để hiển thị được trong email
const LOGO_URL =
  "https://res.cloudinary.com/dlim2ia9h/image/upload/w_160/v1781535041/aquaguard-assets/email-logo.png";

function baseLayout({ title, body }) {
  return `
  <div style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${LOGO_URL}" alt="AquaGuard" width="72" height="72" style="display:inline-block;width:72px;height:72px;border:0;outline:none;" />
        <div style="font-size:20px;font-weight:700;color:#38bdf8;margin-top:8px;">AquaGuard</div>
      </div>
      <div style="background:#1e293b;border-radius:16px;padding:32px 28px;color:#e2e8f0;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#f8fafc;">${title}</h1>
        ${body}
      </div>
      <p style="text-align:center;color:#64748b;font-size:12px;margin-top:24px;">
        © ${new Date().getFullYear()} AquaGuard — Hệ thống cảnh báo &amp; cứu hộ lũ lụt.
      </p>
    </div>
  </div>`;
}

/**
 * Email chào mừng sau khi đăng ký thành công.
 */
async function sendWelcomeEmail({ to, displayName }) {
  const name = displayName?.trim() || "bạn";
  const html = baseLayout({
    title: `Chào mừng ${name} đến với AquaGuard!`,
    body: `
      <p style="margin:0 0 14px;line-height:1.6;">
        Tài khoản của bạn đã được tạo thành công. Từ giờ bạn có thể gửi yêu cầu cứu hộ (SOS),
        theo dõi cảnh báo lũ lụt theo thời gian thực và kết nối với đội cứu hộ.
      </p>
      <p style="margin:0 0 20px;line-height:1.6;">
        Hãy đăng nhập và hoàn thiện hồ sơ (địa chỉ, liên hệ khẩn cấp) để chúng tôi hỗ trợ bạn nhanh nhất khi cần.
      </p>
      <p style="margin:0;color:#94a3b8;font-size:13px;">
        Nếu đây không phải là bạn, vui lòng bỏ qua email này.
      </p>`,
  });

  return sendEmail({ to, subject: "Chào mừng đến với AquaGuard", html });
}

/**
 * Email thông báo chung (dùng cho các sự kiện quan trọng: SOS, mời nhóm...).
 */
async function sendNotificationEmail({ to, displayName, heading, message }) {
  const name = displayName?.trim() || "bạn";
  const html = baseLayout({
    title: heading,
    body: `
      <p style="margin:0 0 14px;line-height:1.6;">Xin chào ${name},</p>
      <p style="margin:0;line-height:1.6;">${message}</p>`,
  });

  return sendEmail({ to, subject: heading, html });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
  isValidEmail,
};
