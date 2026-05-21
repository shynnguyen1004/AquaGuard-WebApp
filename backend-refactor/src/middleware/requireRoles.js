const { ROLES } = require("../constants/roles");

function requireRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
}

module.exports = { requireRoles, requireAdmin };
