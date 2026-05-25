const db = require("../config/db");

// Vendor Login
exports.login = (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const sql = `
    SELECT id, name, username, hotel_status, rating, category, restaurant_image 
    FROM restaurants 
    WHERE username = ? AND password = ?
  `;
  
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error("Database error during vendor login:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    res.status(200).json({ 
      success: true, 
      vendor: results[0] 
    });
  });
};

// Get Orders for Restaurant (both Food and E-commerce)
exports.getOrders = (req, res) => {
  const { restaurantName } = req.params;
  
  const foodSql = `
    SELECT *, FALSE AS is_ecommerce FROM food_orders 
    WHERE restaurant_name = ?
  `;

  const ecommerceSql = `
    SELECT *, TRUE AS is_ecommerce FROM ecommerce_orders 
    WHERE restaurant_name = ?
  `;

  db.query(foodSql, [restaurantName], (err, foodResults) => {
    if (err) {
      console.error("Error fetching vendor food orders:", err);
      return res.status(500).json({ error: err.message });
    }

    db.query(ecommerceSql, [restaurantName], (err2, ecommerceResults) => {
      if (err2) {
        console.error("Error fetching vendor ecommerce orders:", err2);
        return res.status(500).json({ error: err2.message });
      }

      // Combine and sort by created_at DESC
      const combined = [...foodResults, ...ecommerceResults].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      // Safely parse JSON items list for each order
      const parsedOrders = combined.map(row => {
        try {
          row.items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
        } catch (e) {
          row.items = [];
        }
        return row;
      });

      res.status(200).json(parsedOrders);
    });
  });
};

// Update Status of an Order (status, restaurant_status, vendor_accepted)
exports.updateOrderStatus = (req, res) => {
  const { orderId } = req.params;
  const { status, restaurant_status, vendor_accepted, isEcommerce } = req.body;

  let updateFields = [];
  let params = [];

  if (status !== undefined) {
    updateFields.push("status = ?");
    params.push(status);
  }
  if (restaurant_status !== undefined) {
    updateFields.push("restaurant_status = ?");
    params.push(restaurant_status);
  }
  if (vendor_accepted !== undefined) {
    updateFields.push("vendor_accepted = ?");
    params.push(vendor_accepted ? 1 : 0);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: "No fields to update provided" });
  }

  params.push(orderId);
  
  // Dynamically select food_orders or ecommerce_orders table
  const tableName = (isEcommerce === true || isEcommerce === "true" || isEcommerce === 1) 
    ? "ecommerce_orders" 
    : "food_orders";
    
  const sql = `UPDATE ${tableName} SET ${updateFields.join(", ")} WHERE id = ?`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error updating order status:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ 
      success: true, 
      message: "Order updated successfully" 
    });
  });
};

// Update Hotel/Restaurant Status (open / close)
exports.updateHotelStatus = (req, res) => {
  const { restaurantId } = req.params;
  const { hotel_status } = req.body;

  if (hotel_status !== "open" && hotel_status !== "close") {
    return res.status(400).json({ error: "Invalid status. Must be 'open' or 'close'." });
  }

  const sql = "UPDATE restaurants SET hotel_status = ? WHERE id = ?";

  db.query(sql, [hotel_status, restaurantId], (err, results) => {
    if (err) {
      console.error("Error updating restaurant status:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ 
      success: true, 
      hotel_status 
    });
  });
};

// Get Food Items for Restaurant
exports.getFoodItems = (req, res) => {
  const { restaurantName } = req.params;

  const sql = `
    SELECT * FROM food_items 
    WHERE restaurant_name = ? 
    ORDER BY food_position ASC, id DESC
  `;

  db.query(sql, [restaurantName], (err, results) => {
    if (err) {
      console.error("Error fetching restaurant food items:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
};

// Toggle Food Item Stock Status
exports.toggleFoodStock = (req, res) => {
  const { itemId } = req.params;
  const { stock } = req.body;

  const sql = "UPDATE food_items SET stock = ? WHERE id = ?";

  db.query(sql, [stock ? 1 : 0, itemId], (err, results) => {
    if (err) {
      console.error("Error toggling food item stock:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ 
      success: true, 
      stock: stock ? 1 : 0 
    });
  });
};

// Register FCM Token for Restaurant
exports.registerFCMToken = (req, res) => {
  const { restaurantId, fcmToken } = req.body;

  if (!restaurantId || !fcmToken) {
    return res.status(400).json({ error: "restaurantId and fcmToken are required" });
  }

  const sql = "UPDATE restaurants SET fcm_token = ? WHERE id = ?";

  db.query(sql, [fcmToken, restaurantId], (err, results) => {
    if (err) {
      console.error("Error registering FCM token in database:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ 
      success: true, 
      message: "FCM token registered successfully" 
    });
  });
};
