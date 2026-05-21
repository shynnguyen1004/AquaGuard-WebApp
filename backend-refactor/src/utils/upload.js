const multer = require("multer");
const cloudinary = require("../configs/cloudinary");

// TODO[security/#8]: add magic-byte sniff — mimetype is client-controlled.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

function uploadToCloudinary(buffer, folder = "sos-images") {
  if (!cloudinary.isConfigured) {
    return Promise.reject(
      new Error("Image upload unavailable: CLOUDINARY_URL is not configured on the server.")
    );
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", quality: "auto", fetch_format: "auto" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { upload, uploadToCloudinary };
