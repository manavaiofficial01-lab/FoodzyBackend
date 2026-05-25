const db = require('./config/db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS food_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NULL,
  items JSON NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  payment_method VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  promo_code VARCHAR(100) NULL,
  razorpay_payment_id VARCHAR(255) NULL,
  payment_completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  customer_lat DOUBLE NULL,
  customer_lon DOUBLE NULL,
  receipt_reference VARCHAR(255) NULL,
  razorpay_order_id VARCHAR(255) NULL,
  razorpay_signature VARCHAR(255) NULL,
  delivery_time TIMESTAMP NULL,
  driver_name VARCHAR(255) NULL,
  driver_mobile VARCHAR(50) NULL,
  otp VARCHAR(10) NULL,
  delivery_distance_km DECIMAL(10, 2) NULL,
  order_type VARCHAR(100) NULL,
  restaurant_name VARCHAR(255) NULL,
  category VARCHAR(255) NULL,
  delivery_charges DECIMAL(10, 2) NULL,
  delivery_charges_breakdown TEXT NULL,
  delivery_calculation_method VARCHAR(255) NULL,
  driver_status VARCHAR(100) DEFAULT 'order_placed',
  cash_collected BOOLEAN DEFAULT FALSE,
  payment_verified BOOLEAN DEFAULT FALSE,
  accepted_manually BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  is_warehouse_pickup BOOLEAN DEFAULT FALSE,
  is_ecommerce BOOLEAN DEFAULT FALSE,
  cash_collected_amount DECIMAL(10, 2) DEFAULT 0.00,
  driver_order_earnings DECIMAL(10, 2) NULL,
  pickup_proof_timestamp TIMESTAMP NULL,
  pickup_proof_image TEXT NULL,
  restaurant_status VARCHAR(50) NULL,
  restaurant_earnings DECIMAL(10, 2) DEFAULT 0.00,
  warehouse VARCHAR(255) NULL,
  is_settled BOOLEAN DEFAULT FALSE,
  driver_assigned_notified_at TIMESTAMP NULL,
  cash INT DEFAULT 0,
  upi INT DEFAULT 0,
  customer_verified BOOLEAN NULL,
  vendor_accepted BOOLEAN NULL
);
`;

db.query(createTableQuery, (err, results) => {
  if (err) {
    console.error('Error creating food_orders table in MySQL:', err);
  } else {
    console.log('Table "food_orders" created successfully in local MySQL database "foodzy".');
  }
  process.exit(err ? 1 : 0);
});
