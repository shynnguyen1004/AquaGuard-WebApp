const asyncHandler = require("../../../middleware/asyncHandler");
const AuthService = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const data = await AuthService.register(req.body);
  res.status(201).json({ success: true, message: "Registration successful!", data });
});

const login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  res.json({ success: true, message: "Sign in successful!", data });
});

module.exports = { register, login };
