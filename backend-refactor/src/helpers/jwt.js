const jwt = require("jsonwebtoken");
const env = require("../configs/env");

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, phone_number: user.phone_number, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function verifyUserToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signUserToken, verifyUserToken };
