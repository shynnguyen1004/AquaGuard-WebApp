const { verifyUserToken } = require("../helpers/jwt");

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  try {
    const token = authHeader.split(" ")[1];
    req.user = verifyUserToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
}

module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
