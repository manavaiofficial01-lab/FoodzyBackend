const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");

const admin = require("./firebase.config");

const db = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const zoneRoutes = require("./routes/zoneRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const foodItemRoutes = require("./routes/foodItemRoutes");
const exploreRoutes = require("./routes/exploreRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const ecommerceCartRoutes = require("./routes/ecommerceCartRoutes");
const ecommerceOrderRoutes = require("./routes/ecommerceOrderRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const pollingController = require("./controllers/pollingController");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Driver App Backend Routes
const driverAuthRoutes = require('./driver_backend/routes/authRoutes');
const driverAppRoutes = require('./driver_backend/routes/driverRoutes');
const driverOrderRoutes = require('./driver_backend/routes/orderRoutes');
const driverProfileRoutes = require('./driver_backend/routes/profileRoutes');
const driverWalletRoutes = require('./driver_backend/routes/walletRoutes');
const driverEarningsRoutes = require('./driver_backend/routes/earningsRoutes');
const driverPayoutRoutes = require('./driver_backend/routes/payoutRoutes');
const driverSupportRoutes = require('./driver_backend/routes/supportRoutes');
const driverSessionRoutes = require('./driver_backend/routes/sessionRoutes');
const driverProgressRoutes = require('./driver_backend/routes/progressRoutes');
const { protect } = require('./driver_backend/middleware/authMiddleware');


// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Auth: ${req.headers.authorization ? 'Yes' : 'No'} - ${duration}ms\n`;
    try {
      fs.appendFileSync(path.join(__dirname, "debug_http_requests.txt"), logLine);
    } catch (e) {
      console.error("Error writing http log:", e);
    }
  });
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes
app.use("/api", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/food-items", foodItemRoutes);
app.use("/api/explore", exploreRoutes);
app.use("/api/orders", driverOrderRoutes); // Mount driver order routes first to capture /available etc.
app.use("/api/orders", orderRoutes);       // Mount main backend order routes (handles wildcards)
app.use("/api/cart", cartRoutes);
app.use("/api/delivery-charges", deliveryRoutes);
app.use("/api/ecommerce-cart", ecommerceCartRoutes);
app.use("/api/ecommerce-orders", ecommerceOrderRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/driver", driverRoutes);

// Driver App Backend endpoints
app.use('/api/auth', driverAuthRoutes);
app.use('/api/drivers', protect, driverAppRoutes);
app.use('/api/profile', protect, driverProfileRoutes);
app.use('/api/wallet', protect, driverWalletRoutes);
app.use('/api/earnings', protect, driverEarningsRoutes);
app.use('/api/payouts', protect, driverPayoutRoutes);
app.use('/api/support', protect, driverSupportRoutes);
app.use('/api/session', protect, driverSessionRoutes);
app.use('/api/progress', protect, driverProgressRoutes);


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
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port} and listening on 0.0.0.0 (all interfaces)`);
  
  // Database Migration & Start Order Polling
  db.query("ALTER TABLE restaurants ADD COLUMN fcm_token TEXT DEFAULT NULL", (err) => {
    if (err && err.errno !== 1060) {
      console.error("[Migration] Error adding fcm_token column:", err.message);
    } else {
      console.log("[Migration] Verified fcm_token column in restaurants table.");
    }
    
    // Create reviews table if not exists
    db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        is_ecommerce TINYINT(1) NOT NULL DEFAULT 0,
        user_id INT NOT NULL,
        customer_name VARCHAR(255) NULL,
        customer_phone VARCHAR(50) NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_order_review (order_id, is_ecommerce)
      )
    `, (reviewErr) => {
      if (reviewErr) {
        console.error("[Migration] Error creating reviews table:", reviewErr.message);
      } else {
        console.log("[Migration] Verified reviews table is ready.");
      }

      // Create warehouse table in foodzy DB (needed by active order check)
      db.query(`
        CREATE TABLE IF NOT EXISTS warehouse (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          latitude DOUBLE NOT NULL,
          longitude DOUBLE NOT NULL,
          address TEXT DEFAULT NULL,
          zone VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8
      `, (whErr) => {
        if (whErr) {
          console.error("[Migration] Error creating warehouse table:", whErr.message);
        } else {
          console.log("[Migration] Verified warehouse table is ready.");
          db.query(`
            INSERT INTO warehouse (name, latitude, longitude, address, zone)
            VALUES ('Manapparai Warehouse', 10.605852, 78.410038, 'Main Bazaar, Manapparai', 'Manapparai')
            ON DUPLICATE KEY UPDATE zone='Manapparai'
          `, (seedErr) => {
            if (seedErr) console.error("[Migration] Error seeding warehouse:", seedErr.message);
            else console.log("[Migration] Seeded warehouse data.");
          });
        }
        
        // Run high-performance database optimizations for 100M+ orders
        const { ensureDatabaseOptimizations } = require('./config/ensureOptimizations');
        ensureDatabaseOptimizations().catch(err => console.error("[DB-OPTIMIZE] Error:", err));
      });

      pollingController.startPolling();
    });
  });
});
