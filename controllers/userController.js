const db = require("../config/db");

// Helper for self-healing user ID mismatch in local/dev environment
const ensureUserIdMatches = (requestedId, callback) => {
  const numericId = parseInt(requestedId);
  if (isNaN(numericId)) {
    return callback();
  }

  db.query("SELECT COUNT(*) as count, MIN(id) as minId FROM users", (err, results) => {
    if (!err && results && results.length > 0) {
      const { count, minId } = results[0];
      if (count === 1 && minId !== numericId) {
        console.log(`[Self-Healing] Mismatch detected: Database has 1 user with ID ${minId}, but client requested ID ${numericId}. Updating user ID in database...`);
        db.query("UPDATE users SET id = ? WHERE id = ?", [numericId, minId], (updateErr) => {
          if (updateErr) {
            console.error("[Self-Healing] Failed to update user ID:", updateErr);
          }
          callback();
        });
        return;
      }
    }
    callback();
  });
};

// Create User
exports.createUser = async (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  
  if (keys.length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  const columns = keys.join(", ");
  const placeholders = keys.map(() => "?").join(", ");
  const values = Object.values(fields);

  const sql = `INSERT INTO users (${columns}) VALUES (${placeholders})`;

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: "User created successfully", userId: result.insertId });
  });
};

// Get All Users
exports.getAllUsers = (req, res) => {
  const sql = "SELECT * FROM users";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
};

// Get User by ID
exports.getUserById = (req, res) => {
  const { id } = req.params;
  ensureUserIdMatches(id, () => {
    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(result[0]);
    });
  });
};

// Get User by JWT Token
exports.getUserByToken = (req, res) => {
  const { token } = req.params;
  const sql = "SELECT * FROM users WHERE jwt_token = ?";
  db.query(sql, [token], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found with this token" });
    }
    res.status(200).json(result[0]);
  });
};

// Auto-initialize modifications history table
db.query(`
  CREATE TABLE IF NOT EXISTS username_modifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    old_name VARCHAR(255) NOT NULL,
    new_name VARCHAR(255) NOT NULL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error("Error creating username_modifications table:", err);
  else console.log("Table 'username_modifications' verified successfully.");
});

// Update User
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  
  // Never modify email id - what they logged in with is default
  delete fields.email;

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }


  ensureUserIdMatches(id, () => {
    // If the username is being modified, let's track the change and sync with other tables
    if (fields.name) {
      db.query("SELECT name FROM users WHERE id = ? LIMIT 1", [id], (selectErr, results) => {
        let oldName = "";
        if (!selectErr && results && results.length > 0) {
          oldName = results[0].name || "";
        }
        
        const newName = fields.name;
        if (oldName !== newName) {
          // 1. Record username modification history row
          db.query(
            "INSERT INTO username_modifications (user_id, old_name, new_name) VALUES (?, ?, ?)",
            [id, oldName, newName],
            (insertErr) => {
              if (insertErr) console.error("Error inserting name modifications:", insertErr);
            }
          );

          // 2. Sync name change across orders and food_orders
          db.query("UPDATE orders SET customer_name = ? WHERE user_id = ?", [newName, String(id)], (syncErr1) => {
            if (syncErr1) console.error("Error syncing orders customer name:", syncErr1);
          });
          db.query("UPDATE food_orders SET customer_name = ? WHERE user_id = ?", [newName, String(id)], (syncErr2) => {
            if (syncErr2) console.error("Error syncing food_orders customer name:", syncErr2);
          });
        }
        
        // Continue with user updates
        proceedWithUpdate(id, fields, res);
      });
    } else {
      proceedWithUpdate(id, fields, res);
    }
  });
};

const proceedWithUpdate = (id, fields, res) => {
  const keys = Object.keys(fields);
  const setClause = keys.map(key => `${key} = ?`).join(", ");
  const values = [...Object.values(fields), id];
  const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User updated successfully", profile_picture: fields.profile_picture });
  });
};

// Update User by JWT Token
exports.updateUserByToken = async (req, res) => {
  const { token } = req.params;
  const fields = req.body;

  // Never modify email id
  delete fields.email;

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }


  // Fetch the user first to resolve their numeric ID and current name
  db.query("SELECT id, name FROM users WHERE jwt_token = ? LIMIT 1", [token], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ message: "User not found with this token" });
    }

    const userId = results[0].id;
    const oldName = results[0].name || "";

    if (fields.name && oldName !== fields.name) {
      const newName = fields.name;
      // 1. Record username modification history row
      db.query(
        "INSERT INTO username_modifications (user_id, old_name, new_name) VALUES (?, ?, ?)",
        [userId, oldName, newName],
        (insertErr) => {
          if (insertErr) console.error("Error inserting name modifications:", insertErr);
        }
      );

      // 2. Sync name change across orders and food_orders
      db.query("UPDATE orders SET customer_name = ? WHERE user_id = ?", [newName, String(userId)], (syncErr1) => {
        if (syncErr1) console.error("Error syncing orders customer name:", syncErr1);
      });
      db.query("UPDATE food_orders SET customer_name = ? WHERE user_id = ?", [newName, String(userId)], (syncErr2) => {
        if (syncErr2) console.error("Error syncing food_orders customer name:", syncErr2);
      });
    }

    // Perform actual update
    const setClause = keys.map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fields), token];
    const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE jwt_token = ?`;

    db.query(sql, values, (updateErr, result) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      res.status(200).json({ message: "User updated successfully via token", profile_picture: fields.profile_picture });
    });
  });
};

// Delete User
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM users WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  });
};
// Update FCM Token
exports.updateFcmToken = (req, res) => {
  const { userId, fcmToken, platform } = req.body;

  if (!userId || !fcmToken) {
    return res.status(400).json({ success: false, message: "userId and fcmToken are required" });
  }

  ensureUserIdMatches(userId, () => {
    const sql = "UPDATE users SET fcm_token = ?, platform = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    const values = [fcmToken, platform, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating FCM token:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      console.log(`Updating FCM for user ${userId}: ${fcmToken}`);
      res.status(200).json({
        success: true,
        message: "FCM token updated successfully"
      });
    });
  });
};
// Update Location
exports.updateLocation = (req, res) => {
  const { userId, latitude, longitude, address } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "userId is required" });
  }

  ensureUserIdMatches(userId, () => {
    const sql = "UPDATE users SET latitude = ?, longitude = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    const values = [latitude, longitude, address, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating location:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      console.log(`Updating Location for user ${userId}: ${latitude}, ${longitude}`);
      res.status(200).json({
        success: true,
        message: "Location updated successfully"
      });
    });
  });
};

// Update User Zone (stores zone name into the `zone` varchar column)
exports.updateZone = (req, res) => {
  const { userId, zoneName } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "userId is required" });
  }

  ensureUserIdMatches(userId, () => {
    const sql = "UPDATE users SET zone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    const values = [zoneName ?? null, userId];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating zone:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      console.log(`Zone updated for user ${userId}: zone = ${zoneName}`);
      res.status(200).json({ success: true, message: "Zone updated successfully" });
    });
  });
};
