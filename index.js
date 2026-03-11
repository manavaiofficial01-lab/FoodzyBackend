const express = require("express");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const mysql = require("mysql2");
const catalyst = require("zcatalyst-sdk-node");
dotenv.config();


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.stack);
    return;
  }
  console.log("Connected to the database as id " + db.threadId);
});

app.get("/", (req, res) => {
  res.send("Foodzy Backend is running!");
});

// Route to check DB connection status
app.get("/db-status", (req, res) => {
  db.query("SELECT 1", (err, results) => {
    if (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
    res.json({ status: "success", message: "Database is connected!" });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
