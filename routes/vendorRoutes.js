const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");

// POST /api/vendor/login
router.post("/login", vendorController.login);

// GET /api/vendor/orders/:restaurantName
router.get("/orders/:restaurantName", vendorController.getOrders);

// PUT /api/vendor/orders/:orderId/status
router.put("/orders/:orderId/status", vendorController.updateOrderStatus);

// PUT /api/vendor/status/:restaurantId
router.put("/status/:restaurantId", vendorController.updateHotelStatus);

// GET /api/vendor/food-items/:restaurantName
router.get("/food-items/:restaurantName", vendorController.getFoodItems);

// PUT /api/vendor/food-items/:itemId/stock
router.put("/food-items/:itemId/stock", vendorController.toggleFoodStock);

// PUT /api/vendor/fcm-token
router.put("/fcm-token", vendorController.registerFCMToken);

module.exports = router;
