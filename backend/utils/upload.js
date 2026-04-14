const cloudinary = require("cloudinary").v2;
const multer = require("multer");

// Cloudinary auto-configures from CLOUDINARY_URL env var
cloudinary.config();

// Multer: store files in memory buffer (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * @param {Buffer} buffer — image file buffer
 * @param {string} folder — Cloudinary folder name
 * @returns {Promise<string>} — secure HTTPS URL of the uploaded image
 */
async function uploadToCloudinary(buffer, folder = "sos-images") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto",
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { upload, uploadToCloudinary };
