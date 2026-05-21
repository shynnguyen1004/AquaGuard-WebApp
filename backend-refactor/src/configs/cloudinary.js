const cloudinary = require("cloudinary").v2;
const env = require("./env");

const cloudinaryConfigured = Boolean(env.CLOUDINARY_URL);

if (cloudinaryConfigured) {
  // Library auto-reads CLOUDINARY_URL from env.
  cloudinary.config();
} else {
  console.warn("[cloudinary] CLOUDINARY_URL not set — image uploads will fail at runtime.");
}

module.exports = cloudinary;
module.exports.isConfigured = cloudinaryConfigured;
