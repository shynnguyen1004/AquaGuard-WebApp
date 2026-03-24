const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const sosRoutes = require("./routes/sos");

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ──
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

// Thêm domain Vercel từ biến môi trường
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n🚀 AquaGuard API Server running on port ${PORT}`);
  console.log(`   ├── POST /api/auth/register`);
  console.log(`   ├── POST /api/auth/login`);
  console.log(`   └── GET  /api/health\n`);
});
