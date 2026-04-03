-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: bgjf1okkhavlallinkb6-mysql.services.clever-cloud.com:3306
-- Generation Time: Mar 29, 2026 at 11:58 AM
-- Server version: 8.0.22-13
-- PHP Version: 8.2.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: `foodzy`
--
CREATE DATABASE IF NOT EXISTS `foodzy` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `foodzy`;

-- --------------------------------------------------------

--
-- Table structure for table `app_zone`
--

CREATE TABLE IF NOT EXISTS `app_zone` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `zone_name` text NOT NULL,
  `latitude` decimal(9,6) NOT NULL,
  `longitude` decimal(9,6) NOT NULL,
  `radius_in_km` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `app_zone`
--

INSERT INTO `app_zone` (`id`, `zone_name`, `latitude`, `longitude`, `radius_in_km`, `created_at`, `updated_at`) VALUES
(1, 'Manapparai', 10.605852, 78.410038, 25.00, '2025-11-18 20:50:05', '2025-11-18 20:50:05');

-- --------------------------------------------------------

--
-- Table structure for table `food_categories`
--

CREATE TABLE IF NOT EXISTS `food_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `image` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `food_categories`
--

INSERT INTO `food_categories` (`id`, `name`, `image`, `created_at`, `updated_at`) VALUES
(85, 'Offers', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Foffers.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(86, 'Biryani', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fbiryani.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(87, 'Pizza', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fpizza.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(88, 'Burger', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fburger.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(89, 'Fried Chicken', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffriedchicken.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(90, 'Crispy', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fcrispy.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(91, 'Snacks', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fsnacks.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(92, 'Chicken', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fchicken.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(93, 'Pasta', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fpasta.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(94, 'Maggi', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmaggi.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(95, 'Chilli Chicken', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fchilli%20chicken.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(96, 'Mutton', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmutton.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(97, 'Sea Foods', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffish.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(98, 'South Indian', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fidli.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(99, 'Dosa', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fdosa.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(100, 'Parotta', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fparotta.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(101, 'Fried Rice', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffriedrice.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(102, 'Naan & Gravy', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fnorthindian.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(103, 'Noodles', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fnoodles.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(104, 'Rolls', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Frolls.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(105, 'Momos', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmomos.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(106, 'Sandwich', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fsandwich.jpg?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(107, 'Soup', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fsoup.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(108, 'Veg', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fveg.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(109, 'Sweets', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fswwts.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(110, 'Cake\'s', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fcakes.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(111, 'Bday Cake', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fbdaycake.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(112, 'Ice Cream', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ficecream.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(113, 'Coffee', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fcoffee.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(114, 'Tea', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ftea.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(115, 'Fresh Juice', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ffreshjuice.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(116, 'Shakes', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fshakes.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(117, 'Mocktail', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmocktail.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21'),
(118, 'Mojito', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fmojito.png?alt=media', '2025-12-23 19:11:21', '2025-12-23 19:11:21');

-- --------------------------------------------------------

--
-- Table structure for table `food_items`
--

CREATE TABLE IF NOT EXISTS `food_items` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `category` text NOT NULL,
  `restaurant_name` text NOT NULL,
  `rating` decimal(2,1) DEFAULT '4.5',
  `review_count` int DEFAULT '0',
  `veg` tinyint(1) DEFAULT '1',
  `popular` tinyint(1) DEFAULT '0',
  `bestseller` tinyint(1) DEFAULT '0',
  `calories` int DEFAULT NULL,
  `prep_time` text,
  `image_url` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `profit` decimal(10,2) DEFAULT NULL,
  `food_position` int DEFAULT '0',
  `morning` text,
  `afternoon` text,
  `evening` text,
  `night` tinyint(1) DEFAULT '0',
  `zone_name` text,
  `stock` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `restaurants`
--

CREATE TABLE IF NOT EXISTS `restaurants` (
  `id` varchar(50) NOT NULL,
  `position` int DEFAULT NULL,
  `name` text NOT NULL,
  `open_time` text,
  `close_time` text,
  `rating` decimal(2,1) DEFAULT NULL,
  `category` text,
  `delivery_time` text,
  `min_order` text,
  `tags` json DEFAULT NULL,
  `offer` text,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `reviews_count` int DEFAULT '0',
  `hotel_status` enum('open','close') DEFAULT 'open',
  `password` text,
  `username` text,
  `restaurant_image` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `restaurants`
--

INSERT INTO `restaurants` (`id`, `position`, `name`, `open_time`, `close_time`, `rating`, `category`, `delivery_time`, `min_order`, `tags`, `offer`, `latitude`, `longitude`, `reviews_count`, `hotel_status`, `password`, `username`, `restaurant_image`) VALUES
('1', 1, 'Guhan Veg and Non Veg Food Space', '11:00 AM', '11:00 PM', 4.5, 'Both', '30-40 min', '₹49', '["North Indian", "Chinese", "Biryani"]', '55% OFF', 10.6054173, 78.4101004, 420, 'open', 'manavai_vendor_614', 'manavai_guhan', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fguhan.jpg?alt=media&token=8eee5ac0-93e5-473d-a15d-24227251ec53'),
('11', 6, 'Paalpandi Tiffin Centre', '6:00 PM', '11:00 PM', 4.6, 'Both', '30-40 min', '₹49', '["Tiffin", "South Indian"]', '50% OFF', 10.6093165, 78.4233348, 230, 'open', 'manavai_vendor_604', 'manavai_paalpandi', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fpaalpaandi.jpg?alt=media&token=ef18da9f-4972-4de0-83f4-0333f43f63bc'),
('13', 7, 'Namma Ooru Kulfi', '05:00 PM', '11:00 PM', 4.9, 'Bakery', '25-35 min', '₹49', '["Ice Cream", "Kulfi"]', '55% OFF', 10.6030353, 78.4163730, 183, 'open', 'manavai_vendor_307', 'manavai_gulfi', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fkulf.jpg?alt=media&token=e31342ee-1a50-4439-8f0a-ce7f4058ffa1'),
('14', 8, 'Madurai Jigarthanda', '09:00 AM', '09:00 PM', 4.9, 'Bakery', '25-35 min', '₹49', '["Jigarthanda", "Madurai Famous"]', '55% OFF', 10.6086174, 78.4249351, 183, 'open', 'manavai_vendor_811', 'manavai_jigarthanda', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fjigarthanda-recipe10.jpg?alt=media&token=2b293e84-eeb2-42dc-9ef3-453356b85cdf'),
('16', 9, 'Suvai Biriyani', '10:00 AM', '11:00 PM', 4.9, 'Non Veg', '10-15 min', '₹39', '["Biryani", "100% Hallal"]', '65% OFF', 10.6033770, 78.4166920, 310, 'open', 'manavai_vendor_901', 'manavai_suvai_biriyani', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fsuvai.jpg?alt=media&token=a6571ab4-2ef6-448b-8383-86efa7f58509'),
('17', 10, 'Ambur Dum Biryani', '10:00 AM', '10:00 PM', 4.9, 'Non Veg', '10-15 min', '₹39', '["Biryani", "100% Hallal"]', '65% OFF', 10.6056225, 78.4190260, 290, 'open', 'manavai_vendor_119', 'manavai_dumbiriyani', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fdumbiryani.jpg?alt=media&token=0beb6abc-e803-4266-a47e-fe21794285f5'),
('2', 2, 'Munch Bakery', '9:30 AM', '10:00 PM', 4.3, 'Bakery', '25-35 min', '₹100', '["Sweets", "Snacks", "Bakery"]', '65% OFF', 10.6073960, 78.4200890, 133, 'open', 'manavai_vendor_208', 'manavai_munchbakery', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fmunch%20bakery.jpg?alt=media&token=ed384f48-7fa6-44af-bac2-d4320693277a'),
('20', 11, 'Sangam Hotel', '8:30 AM', '11:00 PM', 4.7, 'Both', '30-40 min', '₹49', '["Tiffin", "South Indian", "Chettinadu"]', '40% OFF', 10.6073820, 78.4200650, 190, 'open', 'manavai_vendor_802', 'manavai_sangam_hotel', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fsangam.jpg?alt=media&token=c553ad29-ae21-42ce-9b2d-82151e674099'),
('21', 12, 'Melting Point', '10:00 AM', '11:00 PM', 4.9, 'Bakery', '10-15 min', '₹39', '["Milkshakes", "Budget Friendly"]', '75% OFF', 10.6041900, 78.4177045, 310, 'open', 'manavai_vendor_109', 'manavai_meltingpoint', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fmelting%20pint.webp?alt=media&token=2d23af2e-bc14-4783-994a-0c3dc72e7ead'),
('22', 13, 'Gowri Shankar Pure Veg Restaurant', '8:30 AM', '11:00 PM', 4.9, 'Veg', '10-15 min', '₹39', '["Milkshakes", "Budget Friendly"]', '65% OFF', 10.6056174, 78.4060577, 310, 'open', 'manavai_vendor_515', 'manavai_gowrishankar', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fgowri.jpg?alt=media&token=4edeaaee-81db-49b4-a0fa-65e0c5381734'),
('23', 14, 'Food Park - Family Garden Restaurant', '8:30 AM', '11:00 PM', 4.9, 'Non Veg', '10-15 min', '₹39', '["Grill Chicken", "Broast Chicken"]', '85% OFF', 10.6055691, 78.4060502, 278, 'open', 'manavai_vendor_416', 'manavai_foodpark', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Ffoodpark.jpg?alt=media&token=4423ac23-6007-407d-95bc-1351f2a2d2c9'),
('24', 15, 'Namma Veetu Biryani', '11:00 AM', '2:00 PM', 4.9, 'Both', '10-15 min', '₹39', '["Biriyani", "100% Hallal"]', '65% OFF', 10.6057943, 78.4156086, 120, 'open', 'manavai_vendor_269', 'manavai_nvb', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fnvb.jpg?alt=media&token=471aba6f-26f7-4e97-954b-20115440138e'),
('25', 16, 'Gokula Vilas', '6:00 PM', '10:00 PM', 4.7, 'Both', '15-20 min', '₹39', '["Parrato", "100% Hallal", "Idli"]', '75% OFF', 10.6057943, 78.4156086, 119, 'open', 'manavai_vendor_346', 'manavai_gokula_vilas', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fgokula%20vilas.webp?alt=media&token=d6e0fe3e-26a9-4e3f-9d05-65c1835d030a'),
('26', 17, 'Hotel Vasantham', '8:30 AM', '10:30 PM', 4.2, 'Veg', '15-20 min', '₹39', '["Parrato", "100% Pure Veg", "Idli"]', '75% OFF', 10.6169470, 78.4307400, 236, 'open', 'manavai_vendor_575', 'manavai_vasantham', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fvasantham.jpg?alt=media&token=c87869f0-fc7d-4adb-bb89-a22e6accac18'),
('28', 18, 'DSK Sea Foods', '6:30 PM', '9:30 PM', 4.6, 'Non Veg', '30-40 min', '₹39', '["Fish Chilli", "Thava Fish", "100% Fresh Fish"]', '85% OFF', 10.6053262, 78.4104645, 271, 'open', 'manavai_vendor_888', 'manavai_dskfishstall', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fdsk.jpg?alt=media&token=73a04c39-ffe1-4007-9c8f-8c3d333dd4ea'),
('29', 19, 'Al Quddus Cafe', '3:30 PM', '10:00 PM', 4.6, 'Non Veg', '30-40 min', '₹39', '["Milkshake", "Fried Chicken", "100% Hallal"]', '85% OFF', 10.6051049, 78.4233992, 220, 'open', 'manavai_vendor_986', 'manavai_alqudduscafe', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fal%20quddus%20cafe.jpg?alt=media&token=a55209ef-2051-4bbf-ad70-21dedd761565'),
('32', 20, 'Heavens Chicken', '11:00 AM', '10:30 PM', 4.9, 'Non Veg', '10-15 min', '₹59', '["Fried Chicken", "100% Hallal"]', '45% OFF', 10.6033770, 78.4166920, 210, 'open', 'manavai_vendor_713', 'manavai_heavenschicken', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fheavens.jpeg?alt=media&token=7a5655f3-eb8c-47ff-bf60-9014eccd455f'),
('33', 21, 'TN 45 Cafe', '12:00 PM', '10:00 PM', 4.7, 'Non Veg', '10-15 min', '₹59', '["Fried Chicken", "Pizza", "Burger"]', '65% OFF', 10.6058000, 78.4157334, 150, 'open', 'manavai_vendor_872', 'manavai_tn45cafe', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fmunch.jpg?alt=media&token=6e77d95d-bf56-4234-be1a-d5e7d0f5278f'),
('35', 22, 'Meenatchi Bhavan', '8:30 AM', '11:00 PM', 4.4, 'Veg', '10-15 min', '₹59', '["Pure Veg", "Full Meals"]', '75% OFF', 10.6058056, 78.4183056, 120, 'open', 'manavai_vendor_768', 'manavai_meenatchibhavan', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fmeenatchi%20bhavan.jpg?alt=media&token=b0be2763-e50c-4aa6-b1df-a20036f65f10'),
('38', 23, 'Aariya Bhavan Sweets & Snacks', '09:00 AM', '10:00 PM', 4.8, 'Bakery', '10-15 min', '₹29', '["Sweets", "Snacks"]', '75% OFF', 10.6088830, 78.4184676, 124, 'open', 'manavai_vendor_109', 'manavai_aryabhavansweets', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fairyabhavan.webp?alt=media&token=6c0bd8cf-f3de-4f46-9321-44966b910759'),
('39', 24, '306 Cafe', '08:30 AM', '10:30 PM', 4.9, 'Bakery', '10-15 min', '₹29', '["Fried Chicken", "Burger", "Nuggets"]', '75% OFF', 10.6073959, 78.4243498, 311, 'open', 'manavai_vendor_789', 'manavai_306cafe', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2F306%20cafe.webp?alt=media&token=998ffb4d-1210-4d44-b617-fd6345ca6218'),
('40', 25, 'Kavish Cloud Kitchen', '9:30 AM', '10:00 PM', 4.9, 'Non Veg', '10-15 min', '₹39', '["Home Made Foods", "100% Hygine"]', '85% OFF', 10.6107947, 78.42337231, 208, 'open', 'manavai_vendor_908', 'manavai_kavish', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fkavish.jpeg?alt=media&token=a89b56a5-5d2c-4939-ab1c-ceb1f2db913c'),
('41', 26, 'Frozen Feast', '10:30 AM', '10:30 PM', 4.9, 'Non Veg', '10-15 min', '₹39', '["Pizza", "Crab Lollipop", ""]', '85% OFF', 10.6019374, 78.4220812, 258, 'open', 'manavai_vendor_698', 'manavai_frozenfeast', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Ffrozen%20feast.jpg?alt=media&token=abab5885-830e-4ecd-ad3b-9a8751422e55'),
('42', 27, 'A1 Chilli Chicken', '11:30 AM', '10:30 PM', 4.9, 'Non Veg', '10-15 min', '₹39', '["Only Chilli Chicken", "100% Fresh Chicken"]', '75% OFF', 10.6073626, 78.4210153, 99, 'open', 'manavai_vendor_969', 'manavai_a1chilli', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fa1-chilli-chicken-1200.jpg?alt=media&token=a3b55771-cae5-4a75-977d-ce535f737de4'),
('43', 28, 'NICKEY BOYS UNLIMITED BRIYANI', '9:00 AM', '11:00 PM', 4.7, 'Non-Veg', '25-35 min', '₹49', '["Beef", "Chicken", "Biryani"]', '55% OFF', 10.6005014, 78.4113828, 153, 'open', 'manavai_vendor_857', 'manavai_nickeyboy', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fnickeyboy.jpg?alt=media&token=ab8bac2c-5373-4c30-bc15-54ab46170a44'),
('44', 29, 'Manavai Atho Time', '5:30 PM', '9:30 PM', 4.8, 'Both', '30-40 min', '₹49', '["Atho", "Burma Style Foods"]', '55% OFF', 10.6071759, 78.4248351, 320, 'open', 'manavai_vendor_696', 'manavai_athotime', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fatho.jpg?alt=media&token=77ff6415-3bfc-4e07-99fd-7910ee6c62d1'),
('45', 30, 'We Chai', '9:30 AM', '9:30 PM', 4.6, 'Non Veg', '30-40 min', '₹39', '["Coffee", "Tea", "100% Quality"]', '85% OFF', 10.6068230, 78.4255180, 235, 'open', 'manavai_vendor_901', 'manavai_wechai', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fwechai.webp?alt=media&token=c4cd5453-af26-4cff-8602-22003243a970'),
('7', 3, 'Nellai Karupatty Coffee', '10:30 AM', '11:00 PM', 4.3, 'Bakery', '25-35 min', '₹100', '["Sweets", "Snacks", "Bakery"]', '35% OFF', 10.6065083, 78.4110329, 143, 'open', 'manavai_vendor_406', 'manavai_nellaikarupattycoffee', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Fnellai%20karupatty%20coffee.jpg?alt=media&token=1413e2e1-ff4c-484d-bc74-7d823e744815'),
('8', 4, 'Only Rosemilk', '11:00 AM', '8:00 PM', 4.4, 'Bakery', '25-35 min', '₹100', '["Rosemilk", "Milkshake"]', '75% OFF', 10.6057843, 78.4168649, 93, 'open', 'manavai_vendor_505', 'manavai_onlyrosemilk', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FRestraunts%2Frose-milk-recipe90.webp?alt=media&token=539d9012-1b89-443a-b702-e7daabf126d8'),
('9', 5, 'Fantasy Scoops', '10:00 AM', '09:00 PM', 4.9, 'Bakery', '25-35 min', '₹19', '["Ice Cream", "Milkshake", "Snacks"]', '75% OFF', 10.6072411, 78.4206977, 312, 'open', 'manavai_vendor_317', 'manavai_fantasyscoops', 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/steamed-momos-wontons-1957616-hero-01-1c59e22bad0347daa8f0dfe12894bc3c.jpg?alt=media&token=7e313ec4-f5ea-4d3d-af1c-70f2ed79f610');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `zone` varchar(100) DEFAULT NULL,
  `address` text,
  `device_id` varchar(255) DEFAULT NULL,
  `platform` enum('android','ios','web') DEFAULT 'android',
  `fcm_token` text,
  `jwt_token` text,
  `profile_picture` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `latitude`, `longitude`, `zone`, `address`, `device_id`, `platform`, `fcm_token`, `jwt_token`, `profile_picture`, `created_at`, `updated_at`) VALUES
(1, 'vicky', 'kmvignesh1406@gmail.com', '+919442011620', 10.6089317, 78.4233267, 'Manapparai', 'JC5F+H8G, , Manapparai, 621306', NULL, 'android', 'fjvlu3v-Qqy8DqO_TsdTVc:APA91bHukgOpVC3o5iyHEmw3h3cyR9UzDUXE0L-3dKIOlcDbXUjNv1m7D6iqY1MNgILFBXUF_kWCt5P_OXaqB2OyjeCUDmH8fnKZSek9-TJOXHmmnDN1kzs', 'SqMT3zy78FftfuwngZba80rMGH82', 'https://lh3.googleusercontent.com/a/ACg8ocL-pe6nf1GCtKkiAA2MB9s-6n0Hus6aIof230Q60qnetXQxyQ=s96-c', '2026-03-11 10:58:15', '2026-03-25 17:22:03');

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
