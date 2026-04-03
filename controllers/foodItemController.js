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

// Get all food items for a specific category, filtered by user location if provided
exports.getFoodItemsByCategory = (req, res) => {
  const { category, lat, lon, radius } = req.query;
  
  if (!category) {
    return res.status(400).json({ error: "category query parameter is required" });
  }

  const userLat  = parseFloat(lat);
  const userLon  = parseFloat(lon);
  const maxKm    = parseFloat(radius) || 25; // default 25km

  const hasCoords = !isNaN(userLat) && !isNaN(userLon);

  let sql, params;

  if (hasCoords) {
    // Haversine JOIN — filter food items by restaurant proximity
    sql = `
      SELECT f.*, 
        r.open_time, r.close_time, r.hotel_status, r.latitude as rest_lat, r.longitude as rest_lon,
        ROUND(
          6371 * ACOS(
            LEAST(1, 
              COS(RADIANS(?)) * COS(RADIANS(r.latitude))
              * COS(RADIANS(r.longitude) - RADIANS(?))
              + SIN(RADIANS(?)) * SIN(RADIANS(r.latitude))
            )
          ), 2
        ) AS distance_km
      FROM food_items f
      JOIN restaurants r ON f.restaurant_name = r.name
      WHERE f.category = ?
      HAVING distance_km <= ?
      ORDER BY FIELD(r.hotel_status, 'open', 'close') ASC, f.food_position ASC
    `;
    params = [userLat, userLon, userLat, category, maxKm];
  } else {
    // Fallback — return all for category without distance sorting
    sql = `
      SELECT f.*, r.open_time, r.close_time, r.hotel_status
      FROM food_items f
      JOIN restaurants r ON f.restaurant_name = r.name
      WHERE f.category = ? 
      ORDER BY FIELD(r.hotel_status, 'open', 'close') ASC, f.food_position ASC
    `;
    params = [category];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching food items by category:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
};
