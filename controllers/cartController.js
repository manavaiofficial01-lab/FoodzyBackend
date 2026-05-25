const db = require('../config/db');

/**
 * Helper function to check if a user has exceeded the lifetime limit for a food item.
 */
const checkFoodItemLimit = (userMobile, productId, requestedQuantity) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT lifetime_limit, limit_updated_at, name FROM food_items WHERE id = ?',
      [productId],
      (err, foodRows) => {
        if (err) return reject(err);
        if (!foodRows || foodRows.length === 0) {
          return resolve({ allowed: true });
        }
        const food = foodRows[0];
        const limit = parseInt(food.lifetime_limit) || 0;
        if (limit === 0) {
          return resolve({ allowed: true });
        }

        const limitUpdatedAt = food.limit_updated_at || new Date(0);

        db.query(
          'SELECT reset_at FROM user_limit_resets WHERE phone = ?',
          [userMobile],
          (err, resetRows) => {
            if (err) return reject(err);

            let sinceTime = limitUpdatedAt;
            if (resetRows && resetRows.length > 0) {
              const userResetAt = new Date(resetRows[0].reset_at);
              if (userResetAt > sinceTime) {
                sinceTime = userResetAt;
              }
            }

            db.query(
              "SELECT items FROM food_orders WHERE customer_phone = ? AND status = 'delivered' AND created_at >= ?",
              [userMobile, sinceTime],
              (err, orderRows) => {
                if (err) return reject(err);

                let purchasedCount = 0;
                for (const row of orderRows) {
                  try {
                    const itemsList = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
                    if (Array.isArray(itemsList)) {
                      for (const item of itemsList) {
                        if (String(item.id) === String(productId)) {
                          purchasedCount += parseInt(item.quantity) || 0;
                        }
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing order items JSON:', e);
                  }
                }

                if (purchasedCount + requestedQuantity > limit) {
                  return resolve({
                    allowed: false,
                    message: `You can only purchase a maximum of ${limit} of "${food.name}". You have already purchased ${purchasedCount} since the limit was last set/updated.`,
                    limit,
                    purchasedCount
                  });
                }
                resolve({ allowed: true });
              }
            );
          }
        );
      }
    );
  });
};

/**
 * Get all cart items for a specific user mobile
 */
exports.getCart = (req, res) => {
  const { userMobile } = req.params;
  
  if (!userMobile) {
    return res.status(400).json({ success: false, message: 'User mobile number is required' });
  }

  const query = 'SELECT * FROM food_cart_items WHERE user_mobile = ? ORDER BY created_at DESC';
  
  db.query(query, [userMobile], (err, results) => {
    if (err) {
      console.error('Error fetching cart from MySQL:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error while fetching cart', error: err.message });
    }

    let items = [];
    let restaurant = null;

    if (results && results.length > 0) {
      items = results.map(row => {
        // Reconstruct the image object if possible, otherwise use standard structure
        let imageObj = null;
        try {
          imageObj = typeof row.product_image === 'string' && row.product_image.trim().startsWith('{') 
            ? JSON.parse(row.product_image) 
            : { uri: row.product_image };
        } catch (e) {
          imageObj = { uri: row.product_image };
        }

        return {
          cartKey: `${row.product_id}_${row.size || 'Default'}_${row.color || ''}`,
          id: String(row.product_id),
          name: row.product_name,
          price: parseFloat(row.price),
          originalPrice: parseFloat(row.original_price),
          image: imageObj,
          veg: true, // Standard default for compatibility
          size: row.size || 'Small',
          color: row.color || '',
          quantity: parseInt(row.quantity),
          restaurant: row.restaurant,
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null
        };
      });

      // Extract restaurant name/details from first item
      restaurant = {
        name: results[0].restaurant || null
      };
    }

    return res.status(200).json({
      success: true,
      items,
      restaurant
    });
  });
};

/**
 * Add or update an item in the cart
 */
exports.addToCart = (req, res) => {
  const {
    user_mobile,
    product_id,
    product_name,
    product_image,
    price,
    original_price,
    quantity,
    size,
    color,
    restaurant,
    latitude,
    longitude
  } = req.body;

  if (!user_mobile || !product_id || !product_name || price === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required cart item fields' });
  }

  const parseCoordinate = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const parseFloatSafe = (val) => {
    if (val === undefined || val === null || val === '') return 0.0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0.0 : parsed;
  };

  const parseIntSafe = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const parsed = parseInt(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle product image saving (if it's an object, stringify it)
  const imageStr = typeof product_image === 'object' ? JSON.stringify(product_image) : product_image;
  const sizeVal = size || '';
  const colorVal = color || '';
  const qtyVal = parseIntSafe(quantity || 1);

  // Check user purchase limit first
  checkFoodItemLimit(user_mobile, parseIntSafe(product_id), qtyVal)
    .then(limitCheck => {
      if (!limitCheck.allowed) {
        return res.status(400).json({ success: false, message: limitCheck.message });
      }

      const sql = `
        INSERT INTO food_cart_items 
        (id, user_mobile, product_id, product_name, product_image, price, original_price, quantity, size, color, restaurant, latitude, longitude)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        quantity = VALUES(quantity),
        price = VALUES(price),
        original_price = VALUES(original_price),
        updated_at = CURRENT_TIMESTAMP
      `;

      const values = [
        user_mobile,
        parseIntSafe(product_id),
        product_name,
        imageStr,
        parseFloatSafe(price),
        parseFloatSafe(original_price || price),
        qtyVal,
        sizeVal,
        colorVal,
        restaurant || null,
        parseCoordinate(latitude),
        parseCoordinate(longitude)
      ];

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error inserting/updating cart item in MySQL:', err.message);
          return res.status(500).json({ success: false, message: 'Internal server error while adding to cart', error: err.message });
        }
        return res.status(200).json({ success: true, message: 'Item saved to cart' });
      });
    })
    .catch(err => {
      console.error('Error in limit check:', err);
      return res.status(500).json({ success: false, message: 'Internal server error during limit check', error: err.message });
    });
};

/**
 * Update cart item quantity
 */
exports.updateQuantity = (req, res) => {
  const { user_mobile, product_id, size, color, quantity } = req.body;

  if (!user_mobile || !product_id || quantity === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
  }

  const sizeVal = size || '';
  const colorVal = color || '';
  const qtyVal = parseInt(quantity);

  if (qtyVal <= 0) {
    // Delete item if quantity is 0 or less
    const sql = 'DELETE FROM food_cart_items WHERE user_mobile = ? AND product_id = ? AND size = ? AND color = ?';
    db.query(sql, [user_mobile, parseInt(product_id), sizeVal, colorVal], (err, result) => {
      if (err) {
        console.error('Error deleting item from cart in MySQL:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error while updating cart', error: err.message });
      }
      return res.status(200).json({ success: true, message: 'Item removed from cart (quantity 0)' });
    });
  } else {
    // Check limit first
    checkFoodItemLimit(user_mobile, parseInt(product_id), qtyVal)
      .then(limitCheck => {
        if (!limitCheck.allowed) {
          return res.status(400).json({ success: false, message: limitCheck.message });
        }

        // Update quantity
        const sql = 'UPDATE food_cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_mobile = ? AND product_id = ? AND size = ? AND color = ?';
        db.query(sql, [qtyVal, user_mobile, parseInt(product_id), sizeVal, colorVal], (err, result) => {
          if (err) {
            console.error('Error updating item quantity in MySQL:', err.message);
            return res.status(500).json({ success: false, message: 'Internal server error while updating quantity', error: err.message });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
          }
          return res.status(200).json({ success: true, message: 'Cart quantity updated' });
        });
      })
      .catch(err => {
        console.error('Error in limit check:', err);
        return res.status(500).json({ success: false, message: 'Internal server error during limit check', error: err.message });
      });
  }
};

/**
 * Delete a specific cart item
 */
exports.removeFromCart = (req, res) => {
  const { userMobile, productId } = req.params;
  const { size, color } = req.query;

  if (!userMobile || !productId) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
  }

  const sizeVal = size || '';
  const colorVal = color || '';

  const sql = 'DELETE FROM food_cart_items WHERE user_mobile = ? AND product_id = ? AND size = ? AND color = ?';
  db.query(sql, [userMobile, parseInt(productId), sizeVal, colorVal], (err, result) => {
    if (err) {
      console.error('Error removing item from cart in MySQL:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error while removing item', error: err.message });
    }
    return res.status(200).json({ success: true, message: 'Item removed from cart' });
  });
};

/**
 * Clear the entire cart for a user
 */
exports.clearCart = (req, res) => {
  const { userMobile } = req.params;

  if (!userMobile) {
    return res.status(400).json({ success: false, message: 'User mobile number is required' });
  }

  const sql = 'DELETE FROM food_cart_items WHERE user_mobile = ?';
  db.query(sql, [userMobile], (err, result) => {
    if (err) {
      console.error('Error clearing cart in MySQL:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error while clearing cart', error: err.message });
    }
    return res.status(200).json({ success: true, message: 'Cart cleared successfully' });
  });
};
