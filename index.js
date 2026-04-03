const express = require("express");
const path = require("path");

const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const db = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const zoneRoutes = require("./routes/zoneRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const foodItemRoutes = require("./routes/foodItemRoutes");
const exploreRoutes = require("./routes/exploreRoutes");


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/food-items", foodItemRoutes);
app.use("/api/explore", exploreRoutes);


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
