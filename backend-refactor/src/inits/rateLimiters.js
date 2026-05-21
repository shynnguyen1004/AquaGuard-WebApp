const { rateLimit } = require("../middleware/rateLimit");

const authLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

const authRegister = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many registration attempts. Please try again later.",
});

const forgotPassword = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

module.exports = { authLogin, authRegister, forgotPassword };
