const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Joshwajos@178',
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL successfully!');

  // Check/Create foodzy database
  connection.query('CREATE DATABASE IF NOT EXISTS `foodzy` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', (err) => {
    if (err) {
      console.error('Error creating/verifying database:', err);
      connection.end();
      process.exit(1);
    }
    console.log('Database `foodzy` verified/created.');

    // Switch to foodzy database
    connection.query('USE `foodzy`', (err) => {
      if (err) {
        console.error('Error selecting database:', err);
        connection.end();
        process.exit(1);
      }
      console.log('Switched to `foodzy`.');

      // Let's list existing tables
      connection.query('SHOW TABLES', (err, results) => {
        if (err) {
          console.error('Error showing tables:', err);
          connection.end();
          process.exit(1);
        }
        
        const existingTables = results.map(r => Object.values(r)[0]);
        console.log('Existing tables in `foodzy`:', existingTables);

        // Define our tables in creation order (dependencies first)
        const createTableQueries = [
          // 1. drivers
          "CREATE TABLE IF NOT EXISTS `drivers` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `full_name` varchar(100) NOT NULL, \n" +
          "  `phone` varchar(15) NOT NULL, \n" +
          "  `email` varchar(100) DEFAULT NULL, \n" +
          "  `password` varchar(255) NOT NULL, \n" +
          "  `profile_image` text, \n" +
          "  `vehicle_type` varchar(50) DEFAULT NULL, \n" +
          "  `vehicle_number` varchar(30) DEFAULT NULL, \n" +
          "  `is_online` tinyint(1) DEFAULT '0', \n" +
          "  `current_latitude` decimal(10,8) DEFAULT NULL, \n" +
          "  `current_longitude` decimal(11,8) DEFAULT NULL, \n" +
          "  `rating` decimal(2,1) DEFAULT '5.0', \n" +
          "  `total_orders` int DEFAULT '0', \n" +
          "  `total_earnings` decimal(10,2) DEFAULT '0.00', \n" +
          "  `today_earnings` decimal(10,2) DEFAULT '0.00', \n" +
          "  `login_hours` int DEFAULT '0', \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  `completed_orders` int DEFAULT '0', \n" +
          "  `bank_name` varchar(100) DEFAULT NULL, \n" +
          "  `account_holder` varchar(100) DEFAULT NULL, \n" +
          "  `account_number` varchar(50) DEFAULT NULL, \n" +
          "  `ifsc_code` varchar(20) DEFAULT NULL, \n" +
          "  `bank_verified` tinyint(1) DEFAULT '0', \n" +
          "  `current_area` varchar(100) DEFAULT NULL, \n" +
          "  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  UNIQUE KEY `phone` (`phone`) \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 2. orders
          "CREATE TABLE IF NOT EXISTS `orders` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `customer_name` varchar(100) DEFAULT NULL, \n" +
          "  `customer_phone` varchar(15) DEFAULT NULL, \n" +
          "  `restaurant_name` varchar(100) DEFAULT NULL, \n" +
          "  `pickup_address` text, \n" +
          "  `delivery_address` text, \n" +
          "  `order_amount` decimal(10,2) DEFAULT NULL, \n" +
          "  `delivery_fee` decimal(10,2) DEFAULT NULL, \n" +
          "  `distance_km` decimal(5,2) DEFAULT NULL, \n" +
          "  `status` enum('pending','assigned','confirmed','driver_reached','picked','otp_pending','delivered','cancelled') DEFAULT 'pending', \n" +
          "  `assigned_driver_id` int DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  `payment_method` enum('cash','upi') DEFAULT 'cash', \n" +
          "  `restaurant_latitude` decimal(10,7) DEFAULT NULL, \n" +
          "  `restaurant_longitude` decimal(10,7) DEFAULT NULL, \n" +
          "  `customer_latitude` decimal(10,7) DEFAULT NULL, \n" +
          "  `customer_longitude` decimal(10,7) DEFAULT NULL, \n" +
          "  `delivery_otp` varchar(6) DEFAULT NULL, \n" +
          "  `vendor_confirmed` tinyint(1) DEFAULT '0', \n" +
          "  `pickup_verified` tinyint(1) DEFAULT '0', \n" +
          "  `total_amount` decimal(10,2) DEFAULT '0.00', \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `assigned_driver_id` (`assigned_driver_id`), \n" +
          "  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 3. cash_deposits
          "CREATE TABLE IF NOT EXISTS `cash_deposits` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `amount` decimal(10,2) DEFAULT NULL, \n" +
          "  `deposit_date` date DEFAULT NULL, \n" +
          "  `status` enum('pending','verified') DEFAULT 'pending', \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `cash_deposits_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 4. driver_location_history
          "CREATE TABLE IF NOT EXISTS `driver_location_history` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `latitude` decimal(10,8) DEFAULT NULL, \n" +
          "  `longitude` decimal(11,8) DEFAULT NULL, \n" +
          "  `area_name` varchar(100) DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `driver_location_history_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 5. driver_sessions
          "CREATE TABLE IF NOT EXISTS `driver_sessions` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `login_time` datetime DEFAULT NULL, \n" +
          "  `logout_time` datetime DEFAULT NULL, \n" +
          "  `total_hours` decimal(5,2) DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  `is_online` tinyint(1) DEFAULT '0', \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `driver_sessions_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 6. earnings
          "CREATE TABLE IF NOT EXISTS `earnings` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `order_id` int DEFAULT NULL, \n" +
          "  `delivery_earning` decimal(10,2) DEFAULT NULL, \n" +
          "  `bonus_earning` decimal(10,2) DEFAULT NULL, \n" +
          "  `total_earning` decimal(10,2) DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  KEY `order_id` (`order_id`), \n" +
          "  CONSTRAINT `earnings_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, \n" +
          "  CONSTRAINT `earnings_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 7. incentives
          "CREATE TABLE IF NOT EXISTS `incentives` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `target_orders` int DEFAULT NULL, \n" +
          "  `bonus_amount` decimal(10,2) DEFAULT NULL, \n" +
          "  `shift_start` time DEFAULT NULL, \n" +
          "  `shift_end` time DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`) \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 8. notification_logs
          "CREATE TABLE IF NOT EXISTS `notification_logs` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `order_id` int DEFAULT NULL, \n" +
          "  `title` varchar(255) DEFAULT NULL, \n" +
          "  `message` text, \n" +
          "  `type` varchar(50) DEFAULT NULL, \n" +
          "  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  KEY `order_id` (`order_id`), \n" +
          "  CONSTRAINT `notification_logs_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, \n" +
          "  CONSTRAINT `notification_logs_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 9. notifications
          "CREATE TABLE IF NOT EXISTS `notifications` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `title` varchar(255) DEFAULT NULL, \n" +
          "  `message` text, \n" +
          "  `is_read` tinyint(1) DEFAULT '0', \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 10. payout_requests
          "CREATE TABLE IF NOT EXISTS `payout_requests` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `amount` decimal(10,2) DEFAULT NULL, \n" +
          "  `status` varchar(30) DEFAULT 'pending', \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  `approved_date` timestamp NULL DEFAULT NULL, \n" +
          "  `payout_type` varchar(50) DEFAULT NULL, \n" +
          "  `reference_id` varchar(100) DEFAULT NULL, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `payout_requests_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 11. payouts
          "CREATE TABLE IF NOT EXISTS `payouts` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `amount` decimal(10,2) DEFAULT NULL, \n" +
          "  `payout_type` varchar(50) DEFAULT NULL, \n" +
          "  `status` enum('pending','paid') DEFAULT 'pending', \n" +
          "  `reference_id` varchar(100) DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 12. realtime_tracking
          "CREATE TABLE IF NOT EXISTS `realtime_tracking` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `order_id` int DEFAULT NULL, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `latitude` decimal(10,8) DEFAULT NULL, \n" +
          "  `longitude` decimal(11,8) DEFAULT NULL, \n" +
          "  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `order_id` (`order_id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `realtime_tracking_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, \n" +
          "  CONSTRAINT `realtime_tracking_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 13. support_tickets
          "CREATE TABLE IF NOT EXISTS `support_tickets` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `title` varchar(255) DEFAULT NULL, \n" +
          "  `description` text, \n" +
          "  `status` enum('open','closed','in_progress') DEFAULT 'open', \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

          // 14. wallet_transactions
          "CREATE TABLE IF NOT EXISTS `wallet_transactions` ( \n" +
          "  `id` int NOT NULL AUTO_INCREMENT, \n" +
          "  `driver_id` int DEFAULT NULL, \n" +
          "  `type` enum('earning','incentive','cash_deduction','salary') DEFAULT NULL, \n" +
          "  `amount` decimal(10,2) DEFAULT NULL, \n" +
          "  `description` varchar(255) DEFAULT NULL, \n" +
          "  `status` varchar(50) DEFAULT NULL, \n" +
          "  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, \n" +
          "  PRIMARY KEY (`id`), \n" +
          "  KEY `driver_id` (`driver_id`), \n" +
          "  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE \n" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        ];

        // Execute table creation sequentially
        let index = 0;
        function executeNext() {
          if (index >= createTableQueries.length) {
            console.log('All tables created/verified successfully!');
            connection.end();
            process.exit(0);
          }

          const sql = createTableQueries[index];
          // Get table name from SQL
          const match = sql.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/i);
          const tableName = match ? match[1] : 'unknown';

          connection.query(sql, (err) => {
            if (err) {
              console.error(`Error creating table "${tableName}":`, err);
              connection.end();
              process.exit(1);
            }
            console.log(`Table "${tableName}" verified/created successfully.`);
            index++;
            executeNext();
          });
        }

        executeNext();
      });
    });
  });
});
