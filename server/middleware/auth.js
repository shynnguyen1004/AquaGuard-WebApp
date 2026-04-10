const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "aquaguard_jwt_secret_2026";

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header.
 * Sets req.user = { id, phone_number, role }
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
}

/**
 * Require the authenticated user to have the "admin" role.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
}

/**
 * Require the authenticated user to have one of the specified roles.
 * @param {string[]} roles - Allowed roles
 */
function requireRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
    }
    next();
  };
}

module.exports = { authMiddleware, requireAdmin, requireRoles };
