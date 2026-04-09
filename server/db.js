const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production" ||
  (process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("localhost") &&
    !process.env.DATABASE_URL.includes("@postgres:"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Bật SSL khi kết nối cloud database (Neon, Supabase, etc.)
  ...(isProduction && {
    ssl: { rejectUnauthorized: false },
  }),
});

// Test connection on startup
pool.query("SELECT NOW()")
  .then(() => console.log("✅ PostgreSQL connected — aquaguard_db"))
  .catch((err) => console.error("❌ PostgreSQL connection error:", err.message));

module.exports = pool;
