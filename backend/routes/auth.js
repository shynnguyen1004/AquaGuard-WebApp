const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");
const { authMiddleware, requireAdmin, requireRoles } = require("../middleware/auth");

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
const ROLE_PASSWORD = process.env.ROLE_PASSWORD || "123456";

// Rate limit store for OTP requests (in-memory, resets on server restart)
const otpRateLimits = new Map();



async function findActiveGroupMembership(userId) {
  const result = await pool.query(
    `SELECT
        g.id,
        g.name,
        g.description,
        g.created_by,
        g.leader_id,
        g.status,
        g.created_at,
        g.updated_at,
        m.member_role,
        m.joined_at
     FROM rescue_group_members m
     INNER JOIN rescue_groups g ON g.id = m.group_id
     WHERE m.user_id = $1
       AND m.join_status = 'active'
       AND g.status = 'active'
     ORDER BY m.joined_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function buildMyRescueGroupPayload(userId) {
  const activeGroup = await findActiveGroupMembership(userId);

  let group = null;
  if (activeGroup) {
    const [membersRes, invitesRes] = await Promise.all([
      pool.query(
        `SELECT
            m.id,
            m.member_role,
            m.join_status,
            m.joined_at,
            u.id AS user_id,
            u.phone_number,
            u.display_name,
            u.avatar_url,
            u.is_active
         FROM rescue_group_members m
         INNER JOIN users u ON u.id = m.user_id
         WHERE m.group_id = $1
           AND m.join_status = 'active'
         ORDER BY
           CASE m.member_role WHEN 'leader' THEN 0 WHEN 'co_leader' THEN 1 ELSE 2 END,
           u.display_name ASC`,
        [activeGroup.id]
      ),
      pool.query(
        `SELECT
            i.id,
            i.invited_phone_number,
            i.status,
            i.created_at,
            u.id AS user_id,
            u.display_name,
            u.avatar_url
         FROM rescue_group_invites i
         LEFT JOIN users u ON u.id = i.invited_user_id
         WHERE i.group_id = $1
           AND i.status = 'pending'
         ORDER BY i.created_at DESC`,
        [activeGroup.id]
      ),
    ]);

    group = {
      id: activeGroup.id,
      name: activeGroup.name,
      description: activeGroup.description || "",
      createdBy: activeGroup.created_by,
      leaderId: activeGroup.leader_id,
      memberRole: activeGroup.member_role,
      joinedAt: activeGroup.joined_at,
      status: activeGroup.status,
      createdAt: activeGroup.created_at,
      updatedAt: activeGroup.updated_at,
      members: membersRes.rows.map((row) => ({
        id: row.user_id,
        displayName: row.display_name,
        phoneNumber: row.phone_number,
        avatarUrl: row.avatar_url || "",
        isActive: row.is_active,
        memberRole: row.member_role,
        joinStatus: row.join_status,
        joinedAt: row.joined_at,
      })),
      pendingInvites: invitesRes.rows.map((row) => ({
        id: row.id,
        phoneNumber: row.invited_phone_number,
        status: row.status,
        createdAt: row.created_at,
        userId: row.user_id,
        displayName: row.display_name || "",
        avatarUrl: row.avatar_url || "",
      })),
    };
  }

  const receivedInvitesRes = await pool.query(
    `SELECT
        i.id,
        i.status,
        i.created_at,
        g.id AS group_id,
        g.name AS group_name,
        g.description AS group_description,
        inviter.id AS inviter_id,
        inviter.display_name AS inviter_name,
        inviter.phone_number AS inviter_phone
     FROM rescue_group_invites i
     INNER JOIN rescue_groups g ON g.id = i.group_id
     INNER JOIN users inviter ON inviter.id = i.invited_by
     WHERE i.invited_user_id = $1
       AND i.status = 'pending'
       AND g.status = 'active'
     ORDER BY i.created_at DESC`,
    [userId]
  );

  return {
    group,
    canAcceptMission: activeGroup
      ? ["leader", "co_leader"].includes(activeGroup.member_role)
      : false,
    pendingInvites: receivedInvitesRes.rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      group: {
        id: row.group_id,
        name: row.group_name,
        description: row.group_description || "",
      },
      inviter: {
        id: row.inviter_id,
        displayName: row.inviter_name,
        phoneNumber: row.inviter_phone,
      },
    })),
  };
}

/**
 * POST /api/auth/register
 * Body: { phone_number, password, display_name?, role? }
 */
router.post("/register", async (req, res) => {
  try {
    const { phone_number, password, display_name, role, role_password, gender, date_of_birth } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required.",
      });
    }

    // Validate role password for admin/rescuer
    if (role === "admin" || role === "rescuer") {
      if (!role_password || role_password !== ROLE_PASSWORD) {
        return res.status(403).json({
          success: false,
          message: "Incorrect role password.",
        });
      }
    }

    // Validate phone format (Vietnamese phone: +84xxxxxxxxx)
    const phoneRegex = /^\+84\d{9,10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format (for example: +84901234567).",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Validate gender if provided
    if (gender && !["male", "female", "other"].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender value.",
      });
    }

    // Validate date_of_birth if provided
    let parsedDob = null;
    if (date_of_birth) {
      const dobStr = String(date_of_birth).trim();
      const normalizedDob = dobStr.includes("T") ? dobStr.split("T")[0] : dobStr;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob)) {
        return res.status(400).json({ success: false, message: "Invalid date of birth format." });
      }
      parsedDob = new Date(`${normalizedDob}T00:00:00`);
      if (isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
        return res.status(400).json({ success: false, message: "Invalid date of birth." });
      }
    }

    // Check if phone already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1",
      [phone_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already registered.",
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user with gender and date_of_birth
    const result = await pool.query(
      `INSERT INTO users (phone_number, password_hash, display_name, role, gender, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, phone_number, display_name, role, avatar_url, is_active, created_at, gender, date_of_birth`,
      [
        phone_number,
        password_hash,
        display_name || "User",
        role || "citizen",
        gender || "",
        parsedDob ? parsedDob.toISOString().slice(0, 10) : null,
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
      message: "Registration successful!",
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
      message: "Server error. Please try again.",
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
    const phoneRegex = /^\+84\d{9,10}$/;

    // Validate
    if (!phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required.",
      });
    }

    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format (for example: +84901234567).",
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
        message: "Incorrect phone number or password.",
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "This account has been locked.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect phone number or password.",
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
      message: "Sign in successful!",
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
      message: "Server error. Please try again.",
    });
  }
});

/**
 * GET /api/auth/users
 * List all users from PostgreSQL
 */
router.get("/users", authMiddleware, requireAdmin, async (req, res) => {
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
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * GET /api/auth/rescuers
 * List rescue team members for admin and rescuer roles
 * Enhanced: includes hasActiveGroup and hasPendingInviteFromMe for Quick Invite
 */
router.get("/rescuers", authMiddleware, requireRoles(["admin", "rescuer"]), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id, u.phone_number, u.display_name, u.role, u.avatar_url, u.is_active, u.created_at, u.updated_at,
         CASE WHEN EXISTS (
           SELECT 1 FROM rescue_group_members m
           INNER JOIN rescue_groups g ON g.id = m.group_id
           WHERE m.user_id = u.id AND m.join_status = 'active' AND g.status = 'active'
         ) THEN true ELSE false END AS has_active_group,
         CASE WHEN EXISTS (
           SELECT 1 FROM rescue_group_invites i
           WHERE i.invited_user_id = u.id AND i.invited_by = $1 AND i.status = 'pending'
         ) THEN true ELSE false END AS has_pending_invite_from_me
       FROM users u
       WHERE u.role = 'rescuer'
       ORDER BY u.is_active DESC, u.display_name ASC, u.created_at DESC`,
      [req.user.id]
    );

    const rescuers = result.rows.map((u) => ({
      id: u.id,
      uid: `phone_${u.id}`,
      phoneNumber: u.phone_number,
      displayName: u.display_name,
      role: u.role,
      avatarUrl: u.avatar_url || "",
      isActive: u.is_active,
      hasActiveGroup: u.has_active_group,
      hasPendingInviteFromMe: u.has_pending_invite_from_me,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    return res.json({ success: true, data: rescuers });
  } catch (err) {
    console.error("Fetch rescuers error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * GET /api/auth/rescue-groups/my
 * Get the current rescuer's active group and pending invites
 */
router.get("/rescue-groups/my", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("Fetch my rescue group error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * POST /api/auth/rescue-groups
 * Create a new rescue group. One active group per rescuer.
 */
router.post("/rescue-groups", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Group name is required." });
    }

    const existingMembership = await client.query(
      `SELECT 1
       FROM rescue_group_members m
       INNER JOIN rescue_groups g ON g.id = m.group_id
       WHERE m.user_id = $1
         AND m.join_status = 'active'
         AND g.status = 'active'
       LIMIT 1`,
      [req.user.id]
    );

    if (existingMembership.rows.length > 0) {
      return res.status(409).json({ success: false, message: "You are already in an active rescue group." });
    }

    await client.query("BEGIN");

    const groupRes = await client.query(
      `INSERT INTO rescue_groups (name, description, created_by, leader_id)
       VALUES ($1, $2, $3, $3)
       RETURNING *`,
      [name.trim(), description?.trim() || "", req.user.id]
    );

    const group = groupRes.rows[0];

    await client.query(
      `INSERT INTO rescue_group_members (group_id, user_id, member_role, join_status)
       VALUES ($1, $2, 'leader', 'active')`,
      [group.id, req.user.id]
    );

    await client.query("COMMIT");

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create rescue group error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/rescue-groups/:id/invite
 * Leader/co-leader invites a rescuer by phone number
 */
router.post("/rescue-groups/:id/invite", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const { phone_number } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, message: "Invalid group." });
    }

    if (!phone_number) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const phoneRegex = /^\+84\d{9,10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ success: false, message: "Invalid phone number format." });
    }

    const permissionRes = await pool.query(
      `SELECT member_role
       FROM rescue_group_members
       WHERE group_id = $1
         AND user_id = $2
         AND join_status = 'active'
       LIMIT 1`,
      [groupId, req.user.id]
    );

    const memberRole = permissionRes.rows[0]?.member_role;
    if (!memberRole || !["leader", "co_leader"].includes(memberRole)) {
      return res.status(403).json({ success: false, message: "Only a group leader can invite members." });
    }

    const groupRes = await pool.query(
      "SELECT id, status FROM rescue_groups WHERE id = $1 LIMIT 1",
      [groupId]
    );

    if (groupRes.rows.length === 0 || groupRes.rows[0].status !== "active") {
      return res.status(404).json({ success: false, message: "Rescue group not found." });
    }

    const userRes = await pool.query(
      `SELECT id, role, phone_number, display_name
       FROM users
       WHERE phone_number = $1
       LIMIT 1`,
      [phone_number]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No rescuer account found with this phone number." });
    }

    const invitedUser = userRes.rows[0];
    if (invitedUser.role !== "rescuer") {
      return res.status(400).json({ success: false, message: "This phone number does not belong to a rescuer account." });
    }

    if (invitedUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot invite yourself." });
    }

    const activeMembershipRes = await pool.query(
      `SELECT group_id
       FROM rescue_group_members
       WHERE user_id = $1
         AND join_status = 'active'
       LIMIT 1`,
      [invitedUser.id]
    );

    if (activeMembershipRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This rescuer is already in an active group." });
    }

    const existingInviteRes = await pool.query(
      `SELECT id
       FROM rescue_group_invites
       WHERE group_id = $1
         AND invited_user_id = $2
         AND status = 'pending'
       LIMIT 1`,
      [groupId, invitedUser.id]
    );

    if (existingInviteRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A pending invite already exists for this rescuer." });
    }

    await pool.query(
      `INSERT INTO rescue_group_invites (group_id, invited_user_id, invited_phone_number, invited_by, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [groupId, invitedUser.id, invitedUser.phone_number, req.user.id]
    );

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("Invite rescue group member error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * POST /api/auth/rescue-group-invites/:id/accept
 * Accept a rescue group invite
 */
router.post("/rescue-group-invites/:id/accept", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  const client = await pool.connect();
  try {
    const inviteId = Number(req.params.id);
    if (!inviteId) {
      return res.status(400).json({ success: false, message: "Invalid invite." });
    }

    await client.query("BEGIN");

    const inviteRes = await client.query(
      `SELECT i.*, g.status AS group_status
       FROM rescue_group_invites i
       INNER JOIN rescue_groups g ON g.id = i.group_id
       WHERE i.id = $1
         AND i.invited_user_id = $2
         AND i.status = 'pending'
       LIMIT 1`,
      [inviteId, req.user.id]
    );

    const invite = inviteRes.rows[0];
    if (!invite || invite.group_status !== "active") {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Invite not found or no longer active." });
    }

    const existingMembershipRes = await client.query(
      `SELECT 1
       FROM rescue_group_members m
       INNER JOIN rescue_groups g ON g.id = m.group_id
       WHERE m.user_id = $1
         AND m.join_status = 'active'
         AND g.status = 'active'
       LIMIT 1`,
      [req.user.id]
    );

    if (existingMembershipRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "You are already in an active group." });
    }

    await client.query(
      `UPDATE rescue_group_invites
       SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [inviteId]
    );

    await client.query(
      `INSERT INTO rescue_group_members (group_id, user_id, member_role, join_status)
       VALUES ($1, $2, 'member', 'active')
       ON CONFLICT (group_id, user_id)
       DO UPDATE SET member_role = 'member', join_status = 'active', joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
      [invite.group_id, req.user.id]
    );

    await client.query(
      `UPDATE rescue_group_invites
       SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
       WHERE invited_user_id = $1
         AND id <> $2
         AND status = 'pending'`,
      [req.user.id, inviteId]
    );

    await client.query("COMMIT");

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Accept rescue group invite error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/rescue-group-invites/:id/decline
 * Decline a rescue group invite
 */
router.post("/rescue-group-invites/:id/decline", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const inviteId = Number(req.params.id);
    if (!inviteId) {
      return res.status(400).json({ success: false, message: "Invalid invite." });
    }

    const result = await pool.query(
      `UPDATE rescue_group_invites
       SET status = 'declined', responded_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND invited_user_id = $2
         AND status = 'pending'
       RETURNING id`,
      [inviteId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invite not found or already handled." });
    }

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("Decline rescue group invite error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * PUT /api/auth/users/:id/role
 * Update a user's role
 */
router.put("/users/:id/role", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["citizen", "rescuer", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }

    const result = await pool.query(
      "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, role",
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Update role error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
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
        message: "Phone number is required.",
      });
    }

    // Rate limit: 60 seconds between OTP requests per phone
    const lastSent = otpRateLimits.get(phone_number);
    if (lastSent && Date.now() - lastSent < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remaining} seconds before requesting another OTP.`,
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
        message: "This phone number does not exist in the system.",
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
      message: "OTP sent to your phone number.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);

    // Handle Twilio-specific errors
    if (err.code === 60203) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send SMS. Please try again.",
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
        message: "Phone number and OTP are required.",
      });
    }

    // Verify OTP via Twilio Verify
    const verificationCheck = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone_number, code: otp });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "The OTP is incorrect or has expired.",
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
      message: "OTP verified successfully.",
      data: { sessionToken },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);

    // Twilio returns 404 if verification not found/expired
    if (err.status === 404) {
      return res.status(400).json({
        success: false,
        message: "The OTP has expired. Please request a new one.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
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
        message: "Missing required information.",
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
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
        message: "Phone number not found.",
      });
    }

    const { reset_token, reset_token_expiry } = result.rows[0];

    if (!reset_token || reset_token !== sessionToken) {
      return res.status(400).json({
        success: false,
        message: "Your reset session has expired. Please start again.",
      });
    }

    if (new Date() > new Date(reset_token_expiry)) {
      return res.status(400).json({
        success: false,
        message: "Your reset session has expired. Please start again.",
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
      message: "Password reset successful. Please sign in again.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
});

// ============================================================
// ── Rescue Group Management (Phase 1) ──
// ============================================================

/**
 * GET /api/auth/rescue-groups/:id/stats
 * Get team stats: active missions, completed missions, team size
 */
router.get("/rescue-groups/:id/stats", authMiddleware, requireRoles(["rescuer", "admin"]), async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: "Invalid group." });

    // Verify membership
    const memberCheck = await pool.query(
      `SELECT 1 FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, req.user.id]
    );
    if (memberCheck.rows.length === 0 && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not a member of this group." });
    }

    const [statsRes, sizeRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'in_progress') AS active_missions,
           COUNT(*) FILTER (WHERE status = 'resolved') AS completed_missions,
           COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'in_progress')) AS pending_missions
         FROM rescue_requests
         WHERE assigned_group_id = $1`,
        [groupId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS team_size
         FROM rescue_group_members
         WHERE group_id = $1 AND join_status = 'active'`,
        [groupId]
      ),
    ]);

    const stats = statsRes.rows[0];
    return res.json({
      success: true,
      data: {
        activeMissions: parseInt(stats.active_missions) || 0,
        completedMissions: parseInt(stats.completed_missions) || 0,
        pendingMissions: parseInt(stats.pending_missions) || 0,
        teamSize: sizeRes.rows[0]?.team_size || 0,
      },
    });
  } catch (err) {
    console.error("Fetch group stats error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * PUT /api/auth/rescue-groups/:id
 * Edit group name and description (leader only)
 */
router.put("/rescue-groups/:id", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const { name, description } = req.body;

    if (!groupId) return res.status(400).json({ success: false, message: "Invalid group." });
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Group name is required." });

    // Check leader permission
    const permRes = await pool.query(
      `SELECT member_role FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, req.user.id]
    );
    if (!permRes.rows[0] || permRes.rows[0].member_role !== "leader") {
      return res.status(403).json({ success: false, message: "Only the group leader can edit group info." });
    }

    await pool.query(
      `UPDATE rescue_groups SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [name.trim(), (description || "").trim(), groupId]
    );

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("Edit rescue group error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * PUT /api/auth/rescue-groups/:id/members/:userId/role
 * Promote or demote a member (leader only)
 * Body: { role: 'co_leader' | 'member' }
 */
router.put("/rescue-groups/:id/members/:userId/role", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const { role } = req.body;

    if (!groupId || !targetUserId) return res.status(400).json({ success: false, message: "Invalid parameters." });
    if (!["co_leader", "member"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'co_leader' or 'member'." });
    }
    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own role." });
    }

    // Check leader permission
    const permRes = await pool.query(
      `SELECT member_role FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, req.user.id]
    );
    if (!permRes.rows[0] || permRes.rows[0].member_role !== "leader") {
      return res.status(403).json({ success: false, message: "Only the group leader can change member roles." });
    }

    const result = await pool.query(
      `UPDATE rescue_group_members SET member_role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $2 AND user_id = $3 AND join_status = 'active' AND member_role != 'leader'
       RETURNING id`,
      [role, groupId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found or cannot change leader role." });
    }

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("Change member role error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * DELETE /api/auth/rescue-groups/:id/members/:userId
 * Remove a member from the group (leader/co_leader)
 */
router.delete("/rescue-groups/:id/members/:userId", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    if (!groupId || !targetUserId) return res.status(400).json({ success: false, message: "Invalid parameters." });
    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: "Use the leave endpoint to leave the group." });
    }

    // Check permission (leader or co_leader)
    const permRes = await pool.query(
      `SELECT member_role FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, req.user.id]
    );
    const callerRole = permRes.rows[0]?.member_role;
    if (!callerRole || !["leader", "co_leader"].includes(callerRole)) {
      return res.status(403).json({ success: false, message: "Only leaders can remove members." });
    }

    // Can't remove the leader
    const targetRes = await pool.query(
      `SELECT member_role FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, targetUserId]
    );
    if (!targetRes.rows[0]) {
      return res.status(404).json({ success: false, message: "Member not found." });
    }
    if (targetRes.rows[0].member_role === "leader") {
      return res.status(400).json({ success: false, message: "Cannot remove the group leader." });
    }
    // Co-leaders can only remove regular members
    if (callerRole === "co_leader" && targetRes.rows[0].member_role === "co_leader") {
      return res.status(403).json({ success: false, message: "Co-leaders cannot remove other co-leaders." });
    }

    await pool.query(
      `UPDATE rescue_group_members SET join_status = 'removed', updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active'`,
      [groupId, targetUserId]
    );

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("Remove member error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * POST /api/auth/rescue-groups/:id/leave
 * Leave the current group (any member except leader)
 */
router.post("/rescue-groups/:id/leave", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: "Invalid group." });

    const memberRes = await pool.query(
      `SELECT member_role FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, req.user.id]
    );

    if (memberRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "You are not a member of this group." });
    }
    if (memberRes.rows[0].member_role === "leader") {
      return res.status(400).json({ success: false, message: "Leader cannot leave. Transfer leadership or disband the group." });
    }

    await pool.query(
      `UPDATE rescue_group_members SET join_status = 'left', updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active'`,
      [groupId, req.user.id]
    );

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data, message: "You have left the group." });
  } catch (err) {
    console.error("Leave group error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * DELETE /api/auth/rescue-groups/:id
 * Disband the group (leader only). Sets group status to archived, removes all members.
 */
router.delete("/rescue-groups/:id", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  const client = await pool.connect();
  try {
    const groupId = Number(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: "Invalid group." });

    // Check leader
    const permRes = await pool.query(
      `SELECT member_role FROM rescue_group_members
       WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
      [groupId, req.user.id]
    );
    if (!permRes.rows[0] || permRes.rows[0].member_role !== "leader") {
      return res.status(403).json({ success: false, message: "Only the group leader can disband the group." });
    }

    await client.query("BEGIN");

    // Archive the group
    await client.query(
      `UPDATE rescue_groups SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [groupId]
    );

    // Remove all active members
    await client.query(
      `UPDATE rescue_group_members SET join_status = 'left', updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $1 AND join_status = 'active'`,
      [groupId]
    );

    // Cancel all pending invites
    await client.query(
      `UPDATE rescue_group_invites SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
       WHERE group_id = $1 AND status = 'pending'`,
      [groupId]
    );

    await client.query("COMMIT");

    const data = await buildMyRescueGroupPayload(req.user.id);
    return res.json({ success: true, data, message: "Group has been disbanded." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Disband group error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  } finally {
    client.release();
  }
});

/**
 * GET /api/auth/profile
 * Get the authenticated user's full profile
 */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, phone_number, display_name, email, role, avatar_url,
              gender, date_of_birth, emergency_contact,
              address, latitude, longitude, location_updated_at,
              is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const u = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: u.id,
        phoneNumber: u.phone_number,
        displayName: u.display_name,
        email: u.email || "",
        role: u.role,
        avatarUrl: u.avatar_url || "",
        gender: u.gender || "",
        dateOfBirth: u.date_of_birth || null,
        emergencyContact: u.emergency_contact || "",
        address: u.address || "",
        latitude: u.latitude,
        longitude: u.longitude,
        locationUpdatedAt: u.location_updated_at,
        isActive: u.is_active,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * PUT /api/auth/profile
 * Update the authenticated user's profile
 * Body: { displayName, email, gender, dateOfBirth, emergencyContact, address, latitude, longitude }
 */
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      displayName,
      email,
      gender,
      dateOfBirth,
      emergencyContact,
      address,
      latitude,
      longitude,
    } = req.body;

    // Validate gender
    if (gender && !["male", "female", "other"].includes(gender)) {
      return res.status(400).json({ success: false, message: "Invalid gender value." });
    }

    // Validate date of birth (accept today => age 0)
    let parsedDob = null;
    if (dateOfBirth !== undefined && dateOfBirth !== null && String(dateOfBirth).trim() !== "") {
      const rawDob = String(dateOfBirth).trim();
      const normalizedDob = rawDob.includes("T") ? rawDob.split("T")[0] : rawDob;
      const dobPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobPattern.test(normalizedDob)) {
        return res.status(400).json({ success: false, message: "Invalid date of birth format." });
      }

      parsedDob = new Date(`${normalizedDob}T00:00:00`);
      if (isNaN(parsedDob.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date of birth." });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDob > today) {
        return res.status(400).json({ success: false, message: "Date of birth cannot be in the future." });
      }
    }

    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let paramIdx = 1;

    if (displayName !== undefined) {
      fields.push(`display_name = $${paramIdx++}`);
      values.push(displayName.trim() || "User");
    }
    if (email !== undefined) {
      fields.push(`email = $${paramIdx++}`);
      values.push(email.trim());
    }
    if (gender !== undefined) {
      fields.push(`gender = $${paramIdx++}`);
      values.push(gender);
    }
    if (dateOfBirth !== undefined) {
      fields.push(`date_of_birth = $${paramIdx++}`);
      values.push(parsedDob ? parsedDob.toISOString().slice(0, 10) : null);
    }
    if (emergencyContact !== undefined) {
      fields.push(`emergency_contact = $${paramIdx++}`);
      values.push(emergencyContact.trim());
    }
    if (address !== undefined) {
      fields.push(`address = $${paramIdx++}`);
      values.push(address.trim());
    }
    if (latitude !== undefined && longitude !== undefined) {
      fields.push(`latitude = $${paramIdx++}`);
      values.push(latitude);
      fields.push(`longitude = $${paramIdx++}`);
      values.push(longitude);
      fields.push(`location_updated_at = CURRENT_TIMESTAMP`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update." });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const u = result.rows[0];
    return res.json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        id: u.id,
        phoneNumber: u.phone_number,
        displayName: u.display_name,
        email: u.email || "",
        role: u.role,
        avatarUrl: u.avatar_url || "",
        gender: u.gender || "",
        dateOfBirth: u.date_of_birth || null,
        emergencyContact: u.emergency_contact || "",
        address: u.address || "",
        latitude: u.latitude,
        longitude: u.longitude,
        locationUpdatedAt: u.location_updated_at,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
