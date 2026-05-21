require("dotenv").config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[env] Missing required environment variable: ${name}`);
  return v;
}

// TODO[security/#1,#2]: drop JWT_SECRET / ROLE_PASSWORD fallbacks; switch ROLE_PASSWORD compare to timingSafeEqual.
const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5001,

  DATABASE_URL: required("DATABASE_URL"),

  JWT_SECRET: process.env.JWT_SECRET || "aquaguard_jwt_secret_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SALT_ROUNDS: Number(process.env.SALT_ROUNDS) || 10,
  ROLE_PASSWORD: process.env.ROLE_PASSWORD || "123456",

  FRONTEND_URL: process.env.FRONTEND_URL || "",

  CLOUDINARY_URL: process.env.CLOUDINARY_URL || "",

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID || "",
};

env.isProduction =
  env.NODE_ENV === "production" ||
  (!!env.DATABASE_URL &&
    !env.DATABASE_URL.includes("localhost") &&
    !env.DATABASE_URL.includes("@postgres:"));

module.exports = env;
