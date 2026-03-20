const express = require("express");
const router = express.Router();
const foodItemController = require("../controllers/foodItemController");

// GET /api/food-items?restaurant_name=REST_NAME   → Get all food items for a restaurant
router.get("/", foodItemController.getFoodItemsByRestaurant);

// GET /api/food-items/:id   → Get a single food item by ID
router.get("/:id", foodItemController.getFoodItemById);

module.exports = router;
