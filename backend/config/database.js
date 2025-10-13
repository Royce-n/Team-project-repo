const { Pool } = require("pg");

let pool;

const connectDB = async () => {
  try {
    const isLocal =
      process.env.DATABASE_URL &&
      process.env.DATABASE_URL.includes("localhost");

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false, // Disable SSL for this database
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout for remote connections
    });

    // Test the connection
    const client = await pool.connect();
    console.log("Connected to PostgreSQL database");
    client.release();

    return pool;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return pool;
};

const query = async (text, params) => {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

const getClient = async () => {
  const pool = getPool();
  return await pool.connect();
};

module.exports = {
  connectDB,
  getPool,
  query,
  getClient,
};
