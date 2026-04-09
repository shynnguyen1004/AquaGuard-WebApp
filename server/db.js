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

const startupSchemaStatements = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT ''",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT ''",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(15) DEFAULT ''",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP",
];

async function ensureStartupSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of startupSchemaStatements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log("✅ Required user profile columns are ready");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to ensure user profile schema:", err.message);
  } finally {
    client.release();
  }
}

// Test connection on startup
pool.query("SELECT NOW()")
  .then(async () => {
    console.log("✅ PostgreSQL connected — aquaguard_db");
    await ensureStartupSchema();
  })
  .catch((err) => console.error("❌ PostgreSQL connection error:", err.message));

module.exports = pool;
