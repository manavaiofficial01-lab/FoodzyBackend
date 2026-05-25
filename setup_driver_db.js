const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

console.log('🔄 Connecting to MySQL server to create "foodzy_driver" database...');

const createDatabaseQuery = `
CREATE DATABASE IF NOT EXISTS foodzy_driver DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
`;

connection.query(createDatabaseQuery, (err) => {
  if (err) {
    console.error('❌ Error creating foodzy_driver database:', err.message);
    connection.end();
    process.exit(1);
  }
  
  console.log('✅ Database "foodzy_driver" created or verified.');
  
  // Connect directly to foodzy_driver database
  const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'foodzy_driver',
    multipleStatements: true
  });
  
  const setupTablesQuery = `
  -- 1. Driver details
  CREATE TABLE IF NOT EXISTS driver (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_phone VARCHAR(50) UNIQUE NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) DEFAULT '123456',
    latitude DOUBLE DEFAULT NULL,
    longitude DOUBLE DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    fcm_token TEXT DEFAULT NULL,
    daily_duty_hours DECIMAL(5,2) DEFAULT 10.00,
    duty_start_time VARCHAR(50) DEFAULT '09:00',
    duty_end_time VARCHAR(50) DEFAULT '21:00',
    vehicle_type VARCHAR(100) DEFAULT 'bike',
    vehicle_number VARCHAR(100) DEFAULT 'N/A',
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_orders INT DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    device_id VARCHAR(255) DEFAULT NULL,
    app_version VARCHAR(100) DEFAULT NULL,
    logined_at TIMESTAMP NULL DEFAULT NULL,
    logged_out TIMESTAMP NULL DEFAULT NULL,
    last_active TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 2. Location History
  CREATE TABLE IF NOT EXISTS driver_location_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_phone VARCHAR(50) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 3. Daily Incentives logs
  CREATE TABLE IF NOT EXISTS driver_daily_incentives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_mobile VARCHAR(50) NOT NULL,
    driver_name VARCHAR(255) DEFAULT 'Driver',
    date DATE NOT NULL,
    orders_count INT DEFAULT 0,
    earnings DECIMAL(10,2) DEFAULT 0.00,
    active_hours DECIMAL(5,2) DEFAULT 0.00,
    is_continuous_shift TINYINT(1) DEFAULT 1,
    incentive_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_driver_date (driver_mobile, date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 4. Driver Wallet
  CREATE TABLE IF NOT EXISTS driver_wallet (
    driver_mobile VARCHAR(50) PRIMARY KEY,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_paid DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    next_allowed_request_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 5. Daily Incentive Configs
  CREATE TABLE IF NOT EXISTS daily_incentive_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week INT DEFAULT NULL,
    tiers JSON NOT NULL,
    description TEXT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 6. Payout Requests
  CREATE TABLE IF NOT EXISTS payout_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_mobile VARCHAR(50) NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 7. Driver Payouts Settled
  CREATE TABLE IF NOT EXISTS driver_payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_mobile VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'processing',
    transaction_id VARCHAR(255) DEFAULT NULL,
    payment_method VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    bank_account_last4 VARCHAR(4) DEFAULT NULL,
    processed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 8. Order modifications log
  CREATE TABLE IF NOT EXISTS order_modifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    old_items JSON DEFAULT NULL,
    new_items JSON DEFAULT NULL,
    old_total DECIMAL(10,2) DEFAULT NULL,
    new_total DECIMAL(10,2) DEFAULT NULL,
    modified_by VARCHAR(100) DEFAULT 'driver',
    modifier_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 9. Warehouses
  CREATE TABLE IF NOT EXISTS warehouse (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    address TEXT DEFAULT NULL,
    zone VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 10. Login Logs
  CREATE TABLE IF NOT EXISTS driver_login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_mobile VARCHAR(50) NOT NULL,
    login_time TIMESTAMP NULL DEFAULT NULL,
    logout_time TIMESTAMP NULL DEFAULT NULL,
    created_date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

  -- 11. Banners
  CREATE TABLE IF NOT EXISTS driver_banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `;

  console.log('🔄 Creating tables in "foodzy_driver" database...');
  
  db.query(setupTablesQuery, (tablesErr) => {
    if (tablesErr) {
      console.error('❌ Error creating tables:', tablesErr.message);
      db.end();
      connection.end();
      process.exit(1);
    }
    
    console.log('✅ Tables created successfully.');
    
    // Seed initial configurations
    const seedQueries = `
    -- Seed test driver (Vicky) if not exists
    INSERT INTO driver (driver_phone, driver_name, password, status, daily_duty_hours, duty_start_time, duty_end_time, vehicle_type, vehicle_number, rating)
    VALUES ('+919442011620', 'vicky', '123456', 'offline', 10.00, '09:00', '21:00', 'bike', 'TN-45-AB-1234', 5.00)
    ON DUPLICATE KEY UPDATE driver_name='vicky';

    -- Seed daily incentive default config if not exists
    INSERT INTO daily_incentive_configs (day_of_week, tiers, description, is_active)
    SELECT NULL, '[{"target": 3, "reward": 30}, {"target": 5, "reward": 50}, {"target": 7, "reward": 100}, {"target": 10, "reward": 750}]', 'Daily Bumper Guarantee', 1
    WHERE NOT EXISTS (SELECT 1 FROM daily_incentive_configs WHERE day_of_week IS NULL);

    -- Seed a dummy warehouse if not exists
    INSERT INTO warehouse (name, latitude, longitude, address, zone)
    VALUES ('Manapparai Warehouse', 10.605852, 78.410038, 'Main Bazaar, Manapparai', 'Manapparai')
    ON DUPLICATE KEY UPDATE zone='Manapparai';

    -- Seed a dummy banner if not exists
    INSERT INTO driver_banners (title, image_url, active)
    SELECT 'Welcome to Foodzy Driver Family!', 'https://via.placeholder.com/600x300.png?text=Welcome+Foodzy+Driver', 1
    WHERE NOT EXISTS (SELECT 1 FROM driver_banners);
    `;
    
    console.log('🔄 Seeding initial driver, config, warehouse and banner data...');
    
    db.query(seedQueries, (seedErr) => {
      if (seedErr) {
        console.error('❌ Error seeding data:', seedErr.message);
      } else {
        console.log('✅ Seeding completed successfully!');
      }
      
      db.end();
      connection.end();
      console.log('🎉 Setup driver database process completed!');
      process.exit(0);
    });
  });
});
