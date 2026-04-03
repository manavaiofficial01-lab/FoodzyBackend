const express = require("express");
const router = express.Router();
const foodItemController = require("../controllers/foodItemController");

// GET /api/food-items?category=CAT_NAME   → Get all food items for a category
// (This utilizes the same root path but handles either restaurant_name or category query params)
router.get("/", (req, res) => {
  if (req.query.category) {
    return foodItemController.getFoodItemsByCategory(req, res);
  }
  return foodItemController.getFoodItemsByRestaurant(req, res);
});

// GET /api/food-items/:id   → Get a single food item by ID
router.get("/:id", foodItemController.getFoodItemById);

module.exports = router;
