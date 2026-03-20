const db = require("../config/db");

// Get all food items for a specific restaurant
exports.getFoodItemsByRestaurant = (req, res) => {
  const { restaurant_name } = req.query;
  
  if (!restaurant_name) {
    return res.status(400).json({ error: "restaurant_name query parameter is required" });
  }

  const sql = "SELECT * FROM food_items WHERE restaurant_name = ? ORDER BY food_position ASC";
  
  db.query(sql, [restaurant_name], (err, results) => {
    if (err) {
      console.error("Error fetching food items:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
};

// Get a single food item by ID
exports.getFoodItemById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM food_items WHERE id = ?";
  
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: "Food item not found" });
    }
    res.status(200).json(results[0]);
  });
};
