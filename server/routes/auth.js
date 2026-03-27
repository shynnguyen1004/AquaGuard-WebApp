const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

// ── Twilio Verify SDK ──
const twilio = require("twilio");
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "aquaguard_jwt_secret_2026";
const SALT_ROUNDS = 10;

// Rate limit store for OTP requests (in-memory, resets on server restart)
const otpRateLimits = new Map();

/**
 * POST /api/auth/register
 * Body: { phone_number, password, display_name?, role? }
 */
router.post("/register", async (req, res) => {
  try {
    const { phone_number, password, display_name, role } = req.body;

    // Validate required fields
    if (!phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại và mật khẩu là bắt buộc",
      });
    }

    // Validate phone format (Vietnamese phone: +84xxxxxxxxx)
    const phoneRegex = /^\+84\d{9,10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ (VD: +84901234567)",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // Check if phone already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1",
      [phone_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Số điện thoại này đã được đăng ký",
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (phone_number, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, phone_number, display_name, role, avatar_url, is_active, created_at`,
      [
        phone_number,
        password_hash,
        display_name || "User",
        role || "citizen",
      ]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, phone_number: user.phone_number, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      data: {
        user: {
          id: user.id,
          uid: `phone_${user.id}`,
          phoneNumber: user.phone_number,
          displayName: user.display_name,
          role: user.role,
          avatarUrl: user.avatar_url || "",
        },
        accessToken: token,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại",
    });
  }
});

/**
 * POST /api/auth/login
 * Body: { phone_number, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    // Validate
    if (!phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại và mật khẩu là bắt buộc",
      });
    }

    // Find user by phone
    const result = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phone_number]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, phone_number: user.phone_number, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Update last login
    await pool.query(
      "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        user: {
          id: user.id,
          uid: `phone_${user.id}`,
          phoneNumber: user.phone_number,
          displayName: user.display_name,
          role: user.role,
          avatarUrl: user.avatar_url || "",
        },
        accessToken: token,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại",
    });
  }
});

/**
 * GET /api/auth/users
 * List all users from PostgreSQL
 */
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, phone_number, display_name, role, avatar_url, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    const users = result.rows.map((u) => ({
      id: u.id,
      uid: `phone_${u.id}`,
      phoneNumber: u.phone_number,
      displayName: u.display_name,
      role: u.role,
      avatarUrl: u.avatar_url || "",
      isActive: u.is_active,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    return res.json({ success: true, data: users });
  } catch (err) {
    console.error("Fetch users error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * PUT /api/auth/users/:id/role
 * Update a user's role
 */
router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["citizen", "rescuer", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role không hợp lệ" });
    }

    const result = await pool.query(
      "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, role",
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User không tồn tại" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Update role error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { phone_number }
 * Send OTP via Twilio Verify API
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại là bắt buộc",
      });
    }

    // Rate limit: 60 seconds between OTP requests per phone
    const lastSent = otpRateLimits.get(phone_number);
    if (lastSent && Date.now() - lastSent < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Vui lòng chờ ${remaining} giây trước khi gửi lại OTP`,
      });
    }

    // Check if phone exists in DB
    const userResult = await pool.query(
      "SELECT id, phone_number FROM users WHERE phone_number = $1",
      [phone_number]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Số điện thoại không tồn tại trong hệ thống",
      });
    }

    // Send OTP via Twilio Verify
    await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phone_number, channel: "sms" });

    // Update rate limit
    otpRateLimits.set(phone_number, Date.now());

    console.log(`📱 [Twilio] OTP sent to ${phone_number}`);

    return res.json({
      success: true,
      message: "Mã OTP đã được gửi đến số điện thoại của bạn",
    });
  } catch (err) {
    console.error("Forgot password error:", err);

    // Handle Twilio-specific errors
    if (err.code === 60203) {
      return res.status(429).json({
        success: false,
        message: "Đã gửi quá nhiều OTP. Vui lòng thử lại sau",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi gửi SMS, vui lòng thử lại",
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { phone_number, otp }
 * Verify OTP via Twilio Verify, return session token for password reset
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại và mã OTP là bắt buộc",
      });
    }

    // Verify OTP via Twilio Verify
    const verificationCheck = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone_number, code: otp });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không đúng hoặc đã hết hạn",
      });
    }

    // OTP is valid — generate session token for password reset
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store session token in DB
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE phone_number = $3",
      [sessionToken, sessionExpiry, phone_number]
    );

    return res.json({
      success: true,
      message: "Xác thực OTP thành công",
      data: { sessionToken },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);

    // Twilio returns 404 if verification not found/expired
    if (err.status === 404) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP đã hết hạn. Vui lòng gửi lại",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại",
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { phone_number, sessionToken, newPassword }
 * Verify session token and reset password
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { phone_number, sessionToken, newPassword } = req.body;

    if (!phone_number || !sessionToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    // Verify session token
    const result = await pool.query(
      "SELECT reset_token, reset_token_expiry FROM users WHERE phone_number = $1",
      [phone_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Số điện thoại không tồn tại",
      });
    }

    const { reset_token, reset_token_expiry } = result.rows[0];

    if (!reset_token || reset_token !== sessionToken) {
      return res.status(400).json({
        success: false,
        message: "Phiên đã hết hạn. Vui lòng thực hiện lại",
      });
    }

    if (new Date() > new Date(reset_token_expiry)) {
      return res.status(400).json({
        success: false,
        message: "Phiên đã hết hạn. Vui lòng thực hiện lại",
      });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password and clear reset token
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $2",
      [password_hash, phone_number]
    );

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại",
    });
  }
});

module.exports = router;
