const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ──
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

// ── Routes ──
app.use("/api/auth", authRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n🚀 AquaGuard API Server running on http://localhost:${PORT}`);
  console.log(`   ├── POST /api/auth/register`);
  console.log(`   ├── POST /api/auth/login`);
  console.log(`   └── GET  /api/health\n`);
});
