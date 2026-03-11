const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 2, // Low limit to avoid "max_user_connections" errors
  queueLimit: 0
});

// Use the pool for queries. The .promise() wrapper is often useful but we'll stick to callbacks for now to match your existing code.
console.log("Database connection pool created.");

module.exports = db;
