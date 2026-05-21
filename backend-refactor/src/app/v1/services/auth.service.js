const bcrypt = require("bcrypt");
const env = require("../../../configs/env");
const { signUserToken } = require("../../../helpers/jwt");
const { isPhoneVN, parseDob } = require("../../../utils/validators");
const User = require("../models/user.model");

const VALID_GENDERS = ["male", "female", "other"];

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    if (code) this.code = code;
  }
}

function buildUserPayload(user, token) {
  return {
    user: {
      id: user.id,
      uid: `phone_${user.id}`,
      phoneNumber: user.phone_number,
      displayName: user.display_name,
      role: user.role,
      avatarUrl: user.avatar_url || "",
    },
    accessToken: token,
  };
}

async function register(input) {
  const {
    phone_number,
    password,
    display_name,
    role,
    role_password,
    gender,
    date_of_birth,
  } = input;

  if (!phone_number || !password) {
    throw new HttpError(400, "Phone number and password are required.");
  }

  if (role === "admin" || role === "rescuer") {
    // TODO[security/#2]: use crypto.timingSafeEqual + drop default ROLE_PASSWORD.
    if (!role_password || role_password !== env.ROLE_PASSWORD) {
      throw new HttpError(403, "Incorrect role password.");
    }
  }

  if (!isPhoneVN(phone_number)) {
    throw new HttpError(400, "Invalid phone number format (for example: +84901234567).");
  }
  if (password.length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters.");
  }
  if (gender && !VALID_GENDERS.includes(gender)) {
    throw new HttpError(400, "Invalid gender value.");
  }

  let parsedDob = null;
  if (date_of_birth) {
    try {
      parsedDob = parseDob(date_of_birth);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    if (parsedDob && parsedDob > new Date()) {
      throw new HttpError(400, "Invalid date of birth.");
    }
  }

  const existing = await User.existsByPhone(phone_number);
  if (existing.rows.length > 0) {
    throw new HttpError(409, "This phone number is already registered.");
  }

  const passwordHash = await bcrypt.hash(password, env.SALT_ROUNDS);

  const result = await User.insert({
    phone: phone_number,
    passwordHash,
    displayName: display_name || "User",
    role: role || "citizen",
    gender: gender || "",
    dob: parsedDob ? parsedDob.toISOString().slice(0, 10) : null,
  });

  const user = result.rows[0];
  const token = signUserToken(user);
  return buildUserPayload(user, token);
}

async function login(input) {
  const { phone_number, password } = input;
  if (!phone_number || !password) {
    throw new HttpError(400, "Phone number and password are required.");
  }
  if (!isPhoneVN(phone_number)) {
    throw new HttpError(400, "Invalid phone number format (for example: +84901234567).");
  }

  const result = await User.findByPhone(phone_number);
  if (result.rows.length === 0) {
    throw new HttpError(401, "Incorrect phone number or password.");
  }

  const user = result.rows[0];
  if (!user.is_active) {
    throw new HttpError(403, "This account has been locked.");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new HttpError(401, "Incorrect phone number or password.");
  }

  const token = signUserToken(user);
  await User.touchUpdatedAt(user.id);
  return buildUserPayload(user, token);
}

module.exports = { register, login, HttpError };
