const db = require("../config/db");

// Get all food items for a specific restaurant
exports.getFoodItemsByRestaurant = (req, res) => {
  const { restaurant_name } = req.query;
  
  if (!restaurant_name) {
    return res.status(400).json({ error: "restaurant_name query parameter is required" });
  }

  const sql = "SELECT * FROM food_items WHERE restaurant_name = ? ORDER BY CASE WHEN food_position = 0 THEN 999999 ELSE food_position END ASC, id ASC";
  
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
      ORDER BY FIELD(r.hotel_status, 'open', 'close') ASC, CASE WHEN f.food_position = 0 THEN 999999 ELSE f.food_position END ASC, f.id ASC
    `;
    params = [userLat, userLon, userLat, category, maxKm];
  } else {
    // Fallback — return all for category without distance sorting
    sql = `
      SELECT f.*, r.open_time, r.close_time, r.hotel_status
      FROM food_items f
      JOIN restaurants r ON f.restaurant_name = r.name
      WHERE f.category = ? 
      ORDER BY FIELD(r.hotel_status, 'open', 'close') ASC, CASE WHEN f.food_position = 0 THEN 999999 ELSE f.food_position END ASC, f.id ASC
    `;
    params = [category];
  }

  db.query(sql, params, (err, foodItems) => {
    if (err) {
      console.error("Error fetching food items by category:", err);
      return res.status(500).json({ error: err.message });
    }

    // Fetch from products table for this category
    const productsSql = "SELECT * FROM products WHERE category = ?";
    db.query(productsSql, [category], (err, productsList) => {
      if (err) {
        console.error("Error fetching products by category:", err);
        return res.status(500).json({ error: err.message });
      }

      const protocol = req.protocol || 'http';
      const host = req.headers.host || 'localhost:3000';
      const requestIp = host.split(':')[0];
      const adminUrl = `http://${requestIp}:5000`;

      // Format products to match food_items shape for App
      const mappedProducts = productsList.map(p => {
        let imgUrl = p.main_image_url || '';
        if (imgUrl && imgUrl.startsWith('/uploads/')) {
          imgUrl = `${adminUrl}${imgUrl}`;
        }
        
        let price = parseFloat(p.price) || 0;
        let originalPrice = null;
        if (p.discount) {
          const discountPct = parseFloat(p.discount);
          if (!isNaN(discountPct) && discountPct > 0 && discountPct < 100) {
            originalPrice = Math.round(price / (1 - (discountPct / 100)));
          }
        }

        return {
          id: p.id,
          name: p.name,
          price: price,
          original_price: originalPrice,
          profit: parseFloat(p.profit) || 0,
          category: p.category,
          restaurant_name: p.brand || 'Store',
          rating: parseFloat(p.rating) || 0,
          review_count: parseInt(p.reviews) || 0,
          veg: 0,
          popular: 0,
          bestseller: 0,
          calories: null,
          prep_time: null,
          image_url: imgUrl,
          food_position: 0,
          morning: 'Yes',
          afternoon: 'Yes',
          evening: 'Yes',
          night: 1,
          zone_name: p.zone || null,
          stock: (parseInt(p.stock) || 0) > 0 ? 1 : 0,
          sub_category_id: p.sub_category_id,
          weight: null,
          open_time: '09:00 AM',
          close_time: '09:00 PM',
          hotel_status: 'open',
          is_product: true
        };
      });

      // Format food items image URLs if relative
      const mappedFoodItems = foodItems.map(f => {
        let imgUrl = f.image_url || '';
        if (imgUrl && imgUrl.startsWith('/uploads/')) {
          imgUrl = `${protocol}://${host}${imgUrl}`;
        }
        return {
          ...f,
          image_url: imgUrl
        };
      });

      res.status(200).json([...mappedFoodItems, ...mappedProducts]);
    });
  });
};
