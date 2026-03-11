const db = require("../config/db");

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

// Update User
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  
  // Exclude fields that shouldn't be updated manually if any, or just update what's provided
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

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
    res.status(200).json({ message: "User updated successfully" });
  });
};

// Update User by JWT Token
exports.updateUserByToken = (req, res) => {
  const { token } = req.params;
  const fields = req.body;
  const keys = Object.keys(fields);

  if (keys.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const setClause = keys.map(key => `${key} = ?`).join(", ");
  const values = [...Object.values(fields), token];

  const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE jwt_token = ?`;

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found with this token" });
    }
    res.status(200).json({ message: "User updated successfully via token" });
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
};
