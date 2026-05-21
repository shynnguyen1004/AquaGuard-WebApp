const asyncHandler = require("../../../middleware/asyncHandler");
const PasswordService = require("../services/password.service");

const forgotPassword = asyncHandler(async (req, res) => {
  await PasswordService.requestOtp(req.body.phone_number);
  res.json({ success: true, message: "OTP sent to your phone number." });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const data = await PasswordService.verifyOtp(req.body.phone_number, req.body.otp);
  res.json({ success: true, message: "OTP verified successfully.", data });
});

const resetPassword = asyncHandler(async (req, res) => {
  await PasswordService.resetPassword(
    req.body.phone_number,
    req.body.sessionToken,
    req.body.newPassword
  );
  res.json({ success: true, message: "Password reset successful. Please sign in again." });
});

module.exports = { forgotPassword, verifyOtp, resetPassword };
