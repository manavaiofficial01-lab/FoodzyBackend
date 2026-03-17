const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");

// GET /api/restaurants       → All restaurants
router.get("/", restaurantController.getAllRestaurants);

// GET /api/restaurants/:id   → Single restaurant by ID
router.get("/:id", restaurantController.getRestaurantById);

module.exports = router;
