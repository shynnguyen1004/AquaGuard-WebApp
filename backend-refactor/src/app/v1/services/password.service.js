const bcrypt = require("bcrypt");
const crypto = require("crypto");
const env = require("../../../configs/env");
const { twilioClient, VERIFY_SERVICE_SID } = require("../../../configs/twilio");
const logger = require("../../../utils/logger");
const { HttpError } = require("./auth.service");
const User = require("../models/user.model");

// In-memory rate limit store — resets on server restart.
const otpRateLimits = new Map();

async function requestOtp(phone) {
  if (!phone) throw new HttpError(400, "Phone number is required.");

  const lastSent = otpRateLimits.get(phone);
  if (lastSent && Date.now() - lastSent < 60000) {
    const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
    throw new HttpError(429, `Please wait ${remaining} seconds before requesting another OTP.`);
  }

  const userResult = await User.findByPhone(phone);
  if (userResult.rows.length === 0) {
    throw new HttpError(404, "This phone number does not exist in the system.");
  }

  try {
    await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });
  } catch (err) {
    if (err.code === 60203) {
      throw new HttpError(429, "Too many OTP requests. Please try again later.");
    }
    throw new HttpError(500, "Failed to send SMS. Please try again.");
  }

  otpRateLimits.set(phone, Date.now());
  logger.info(`📱 [Twilio] OTP sent to ${phone}`);
}

async function verifyOtp(phone, otp) {
  if (!phone || !otp) throw new HttpError(400, "Phone number and OTP are required.");

  let check;
  try {
    check = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code: otp });
  } catch (err) {
    if (err.status === 404) {
      throw new HttpError(400, "The OTP has expired. Please request a new one.");
    }
    throw new HttpError(500, "Server error. Please try again.");
  }

  if (check.status !== "approved") {
    throw new HttpError(400, "The OTP is incorrect or has expired.");
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await User.setResetToken(phone, sessionToken, sessionExpiry);
  return { sessionToken };
}

async function resetPassword(phone, sessionToken, newPassword) {
  if (!phone || !sessionToken || !newPassword) {
    throw new HttpError(400, "Missing required information.");
  }
  if (newPassword.length < 6) {
    throw new HttpError(400, "New password must be at least 6 characters.");
  }

  const result = await User.getResetToken(phone);
  if (result.rows.length === 0) throw new HttpError(404, "Phone number not found.");

  const { reset_token, reset_token_expiry } = result.rows[0];
  if (!reset_token || reset_token !== sessionToken) {
    throw new HttpError(400, "Your reset session has expired. Please start again.");
  }
  if (new Date() > new Date(reset_token_expiry)) {
    throw new HttpError(400, "Your reset session has expired. Please start again.");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.SALT_ROUNDS);
  await User.setPasswordAndClearReset(phone, passwordHash);
}

module.exports = { requestOtp, verifyOtp, resetPassword };
