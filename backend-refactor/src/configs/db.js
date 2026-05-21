const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ...(env.isProduction && { ssl: { rejectUnauthorized: false } }),
});

pool
  .query("SELECT NOW()")
  .then(() => console.log("✅ PostgreSQL connected — aquaguard_db"))
  .catch((err) => console.error("❌ PostgreSQL connection error:", err.message));

module.exports = { pool };
