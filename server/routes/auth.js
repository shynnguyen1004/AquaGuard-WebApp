const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "aquaguard_jwt_secret_2026";
const SALT_ROUNDS = 10;

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

module.exports = router;
