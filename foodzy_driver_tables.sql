USE `foodzy`;

-- --------------------------------------------------------
-- 1. Table structure for table `drivers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `drivers` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `full_name` varchar(100) NOT NULL, 
  `phone` varchar(15) NOT NULL, 
  `email` varchar(100) DEFAULT NULL, 
  `password` varchar(255) NOT NULL, 
  `profile_image` text, 
  `vehicle_type` varchar(50) DEFAULT NULL, 
  `vehicle_number` varchar(30) DEFAULT NULL, 
  `is_online` tinyint(1) DEFAULT '0', 
  `current_latitude` decimal(10,8) DEFAULT NULL, 
  `current_longitude` decimal(11,8) DEFAULT NULL, 
  `rating` decimal(2,1) DEFAULT '5.0', 
  `total_orders` int DEFAULT '0', 
  `total_earnings` decimal(10,2) DEFAULT '0.00', 
  `today_earnings` decimal(10,2) DEFAULT '0.00', 
  `login_hours` int DEFAULT '0', 
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, 
  `completed_orders` int DEFAULT '0', 
  `bank_name` varchar(100) DEFAULT NULL, 
  `account_holder` varchar(100) DEFAULT NULL, 
  `account_number` varchar(50) DEFAULT NULL, 
  `ifsc_code` varchar(20) DEFAULT NULL, 
  `bank_verified` tinyint(1) DEFAULT '0', 
  `current_area` varchar(100) DEFAULT NULL, 
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
  PRIMARY KEY (`id`), 
  UNIQUE KEY `phone` (`phone`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table structure for table `orders`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `customer_name` varchar(100) DEFAULT NULL, 
  `customer_phone` varchar(15) DEFAULT NULL, 
  `restaurant_name` varchar(100) DEFAULT NULL, 
  `pickup_address` text, 
  `delivery_address` text, 
  `order_amount` decimal(10,2) DEFAULT NULL, 
  `delivery_fee` decimal(10,2) DEFAULT NULL, 
  `distance_km` decimal(5,2) DEFAULT NULL, 
  `status` enum('pending','assigned','confirmed','driver_reached','picked','otp_pending','delivered','cancelled') DEFAULT 'pending', 
  `assigned_driver_id` int DEFAULT NULL, 
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP, 
  `payment_method` enum('cash','upi') DEFAULT 'cash', 
  `restaurant_latitude` decimal(10,7) DEFAULT NULL, 
  `restaurant_longitude` decimal(10,7) DEFAULT NULL, 
  `customer_latitude` decimal(10,7) DEFAULT NULL, 
  `customer_longitude` decimal(10,7) DEFAULT NULL, 
  `delivery_otp` varchar(6) DEFAULT NULL, 
  `vendor_confirmed` tinyint(1) DEFAULT '0', 
  `pickup_verified` tinyint(1) DEFAULT '0', 
  `total_amount` decimal(10,2) DEFAULT '0.00', 
  PRIMARY KEY (`id`), 
  KEY `assigned_driver_id` (`assigned_driver_id`), 
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table structure for table `cash_deposits`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cash_deposits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `deposit_date` date DEFAULT NULL,
  `status` enum('pending','verified') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `cash_deposits_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table structure for table `driver_location_history`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `driver_location_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `area_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `driver_location_history_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table structure for table `driver_sessions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `driver_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `login_time` datetime DEFAULT NULL,
  `logout_time` datetime DEFAULT NULL,
  `total_hours` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_online` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `driver_sessions_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table structure for table `earnings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `earnings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `delivery_earning` decimal(10,2) DEFAULT NULL,
  `bonus_earning` decimal(10,2) DEFAULT NULL,
  `total_earning` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `earnings_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `earnings_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table structure for table `incentives`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `incentives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `target_orders` int DEFAULT NULL,
  `bonus_amount` decimal(10,2) DEFAULT NULL,
  `shift_start` time DEFAULT NULL,
  `shift_end` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table structure for table `notification_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `type` varchar(50) DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `notification_logs_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notification_logs_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Table structure for table `notifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Table structure for table `payout_requests`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payout_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_date` timestamp NULL DEFAULT NULL,
  `payout_type` varchar(50) DEFAULT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `payout_requests_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Table structure for table `payouts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payout_type` varchar(50) DEFAULT NULL,
  `status` enum('pending','paid') DEFAULT 'pending',
  `reference_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Table structure for table `realtime_tracking`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `realtime_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `realtime_tracking_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `realtime_tracking_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. Table structure for table `support_tickets`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `status` enum('open','closed','in_progress') DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14. Table structure for table `wallet_transactions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int DEFAULT NULL,
  `type` enum('earning','incentive','cash_deduction','salary') DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
