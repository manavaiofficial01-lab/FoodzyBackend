const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Auto-initialize: check and add 'password' column to 'users' table
db.query("SHOW COLUMNS FROM users LIKE 'password'", (err, results) => {
  if (err) {
    console.error("Error checking for password column in users table:", err);
    return;
  }
  if (results.length === 0) {
    db.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) DEFAULT NULL", (alterErr) => {
      if (alterErr) {
        console.error("Error adding password column to users table:", alterErr);
      } else {
        console.log("Added 'password' column to 'users' table successfully.");
      }
    });
  } else {
    console.log("'password' column already exists in 'users' table.");
  }
});

// Helper for fetching with a timeout, safe across all Node.js versions
const fetchWithTimeout = async (url, options = {}, timeoutMs = 3000) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      if (controller) controller.abort();
      reject(new Error('Request timed out'));
    }, timeoutMs);
  });

  const fetchPromise = fetch(url, {
    ...options,
    ...(controller ? { signal: controller.signal } : {})
  });

  return Promise.race([fetchPromise, timeoutPromise]);
};

const saveToSupabase = async (userData) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_url') {
    console.warn("[Supabase] URL/Key is missing or placeholder. Skipping sync.");
    return;
  }

  try {
    let baseUrl = supabaseUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (baseUrl.endsWith('/rest/v1')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 8);
    }
    const url = `${baseUrl}/rest/v1/foodzy_user_data`;

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates' // Upsert/merge duplicates
      },
      body: JSON.stringify({
        id: userData.id,
        name: userData.name || '',
        email: userData.email || null,
        mobile: userData.mobile || null,
        password: userData.password || null,
        profile_picture: userData.profile_picture || null,
        platform: userData.platform || 'android',
        jwt_token: userData.jwt_token || null
      })
    }, 5000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Supabase Error] Failed to store user data:", errorText);
    } else {
      console.log(`[Supabase Success] Stored user ${userData.id} in foodzy_user_data.`);
    }
  } catch (error) {
    console.error("[Supabase Connection Error] Could not write to Supabase:", error.message);
  }
};

// Fetch user data from Supabase (manavai app) table foodzy_user_data
const fetchFromSupabase = async (queryField, queryValue) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_url') {
    return null;
  }

  try {
    let baseUrl = supabaseUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (baseUrl.endsWith('/rest/v1')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 8);
    }
    
    const url = `${baseUrl}/rest/v1/foodzy_user_data?${queryField}=eq.${encodeURIComponent(queryValue)}&select=*`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }, 3000);

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return data[0];
      }
    }
    return null;
  } catch (error) {
    console.error("[Supabase Fetch Error] Could not query Supabase:", error.message);
    return null;
  }
};

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

// Create User (typically Google/Firebase signup)
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
    
    const userId = result.insertId;
    const userData = {
      id: userId,
      ...fields
    };
    
    // Trigger Supabase Sync in background
    saveToSupabase(userData);

    res.status(201).json({ message: "User created successfully", userId: userId });
  });
};

// Register User (Email/Password custom signup)
exports.registerUser = async (req, res) => {
  const { name, email, mobile, password } = req.body;

  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ error: "Name, email, mobile number, and password are required" });
  }

  // Check if user already exists
  db.query("SELECT * FROM users WHERE email = ? OR mobile = ?", [email, mobile], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length > 0) {
      const existing = results[0];
      const matchField = existing.email === email ? 'email' : 'mobile number';
      return res.status(400).json({ error: `An account already exists with this ${matchField}` });
    }

    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate a JWT Token
      const jwtToken = jwt.sign(
        { email, mobile },
        process.env.JWT_SECRET || "foodzy_secret_key"
      );

      const sql = "INSERT INTO users (name, email, mobile, password, jwt_token) VALUES (?, ?, ?, ?, ?)";
      db.query(sql, [name, email, mobile, hashedPassword, jwtToken], (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        const userId = result.insertId;
        const userData = {
          id: userId,
          name,
          email,
          mobile,
          password: hashedPassword,
          jwt_token: jwtToken
        };

        // Sync to Supabase in background
        saveToSupabase(userData);

        res.status(201).json({
          message: "User registered successfully",
          userId: userId,
          user: {
            id: userId,
            name,
            email,
            mobile,
            jwt_token: jwtToken
          }
        });
      });
    } catch (hashErr) {
      console.error("Hashing / Register Error:", hashErr);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};

// Helper to verify bcrypt password and send login response
const verifyPasswordAndLogin = async (user, password, res) => {
  // Check if account has password
  if (!user.password) {
    return res.status(400).json({ error: "This account was registered via Google. Please Log in with Google." });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate or retrieve token
    let jwtToken = user.jwt_token;
    if (!jwtToken) {
      jwtToken = jwt.sign(
        { email: user.email, mobile: user.mobile },
        process.env.JWT_SECRET || "foodzy_secret_key"
      );
      db.query("UPDATE users SET jwt_token = ? WHERE id = ?", [jwtToken, user.id]);
    }

    res.status(200).json({
      message: "Login successful",
      userId: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      jwt_token: jwtToken,
      profile_picture: user.profile_picture,
      latitude: user.latitude,
      longitude: user.longitude,
      zone: user.zone,
      address: user.address
    });
  } catch (compareErr) {
    console.error("Login verify error:", compareErr);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login User (Email/Password custom login with Supabase fallback sync)
exports.loginUser = async (req, res) => {
  const { emailOrMobile, password } = req.body;

  if (!emailOrMobile || !password) {
    return res.status(400).json({ error: "Email/mobile and password are required" });
  }

  const sql = "SELECT * FROM users WHERE email = ? OR mobile = ?";
  db.query(sql, [emailOrMobile, emailOrMobile], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      console.log(`[MySQL Miss] User ${emailOrMobile} not found in MySQL. Checking Supabase fallback...`);
      try {
        let supabaseUser = await fetchFromSupabase('email', emailOrMobile);
        if (!supabaseUser) {
          let formattedMobile = emailOrMobile;
          if (/^\d{10}$/.test(formattedMobile)) {
            formattedMobile = `+91${formattedMobile}`;
          }
          supabaseUser = await fetchFromSupabase('mobile', formattedMobile);
        }

        if (supabaseUser) {
          console.log(`[Supabase Found] Restoring user ${supabaseUser.name} to MySQL database...`);
          const insertSql = "INSERT INTO users (id, name, email, mobile, password, jwt_token, profile_picture, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
          db.query(insertSql, [
            supabaseUser.id,
            supabaseUser.name,
            supabaseUser.email,
            supabaseUser.mobile,
            supabaseUser.password,
            supabaseUser.jwt_token,
            supabaseUser.profile_picture,
            supabaseUser.platform || 'android'
          ], (insertErr) => {
            if (insertErr) {
              console.error("[Login Supabase Restore Error]:", insertErr.message);
              return res.status(400).json({ error: "Invalid credentials" });
            }
            verifyPasswordAndLogin(supabaseUser, password, res);
          });
          return;
        }
      } catch (fallbackErr) {
        console.error("[Login Fallback Error]:", fallbackErr.message);
      }
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = results[0];
    verifyPasswordAndLogin(user, password, res);
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
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  // 1. Try MySQL first (extremely fast local query)
  ensureUserIdMatches(id, () => {
    const sql = "SELECT * FROM users WHERE id = ?";
    db.query(sql, [id], async (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.length > 0) {
        return res.status(200).json(result[0]);
      }

      // 2. Fallback to Supabase if not found in MySQL
      console.log(`[MySQL Miss] User ${id} not found in MySQL. Checking Supabase...`);
      const supabaseUser = await fetchFromSupabase('id', id);
      if (supabaseUser) {
        console.log(`[Supabase Get] Successfully fetched user ${id} from Supabase. Restoring to MySQL...`);
        const insertSql = "INSERT INTO users (id, name, email, mobile, password, jwt_token, profile_picture, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(insertSql, [
          supabaseUser.id,
          supabaseUser.name,
          supabaseUser.email,
          supabaseUser.mobile,
          supabaseUser.password,
          supabaseUser.jwt_token,
          supabaseUser.profile_picture,
          supabaseUser.platform || 'android'
        ], (insertErr) => {
          if (insertErr) {
            console.error("[ID Supabase Restore Error]:", insertErr.message);
          }
        });
        return res.status(200).json(supabaseUser);
      }

      res.status(404).json({ message: "User not found" });
    });
  });
};

// Get User by JWT Token
exports.getUserByToken = async (req, res) => {
  const { token } = req.params;

  // 1. Try MySQL first (extremely fast local query)
  const sql = "SELECT * FROM users WHERE jwt_token = ?";
  db.query(sql, [token], async (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.length > 0) {
      return res.status(200).json(result[0]);
    }

    // 2. Fallback to Supabase if not found in MySQL
    console.log(`[MySQL Miss] User with token not found in MySQL. Checking Supabase...`);
    const supabaseUser = await fetchFromSupabase('jwt_token', token);
    if (supabaseUser) {
      console.log(`[Supabase Get] Successfully fetched user by token from Supabase. Restoring to MySQL...`);
      const insertSql = "INSERT INTO users (id, name, email, mobile, password, jwt_token, profile_picture, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      db.query(insertSql, [
        supabaseUser.id,
        supabaseUser.name,
        supabaseUser.email,
        supabaseUser.mobile,
        supabaseUser.password,
        supabaseUser.jwt_token,
        supabaseUser.profile_picture,
        supabaseUser.platform || 'android'
      ], (insertErr) => {
        if (insertErr) {
          console.error("[Token Supabase Restore Error]:", insertErr.message);
        }
      });
      return res.status(200).json(supabaseUser);
    }

    res.status(404).json({ message: "User not found with this token" });
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

    // Sync updated record to Supabase
    db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id], (selectErr, selectRes) => {
      if (!selectErr && selectRes && selectRes.length > 0) {
        saveToSupabase(selectRes[0]);
      }
    });

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

      // Sync updated record to Supabase
      db.query("SELECT * FROM users WHERE jwt_token = ? LIMIT 1", [token], (selectErr, selectRes) => {
        if (!selectErr && selectRes && selectRes.length > 0) {
          saveToSupabase(selectRes[0]);
        }
      });

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

// Sync User from Mobile App Local Storage to MySQL/Supabase
exports.syncUser = async (req, res) => {
  const { id, name, email, mobile, jwt_token, profile_picture, platform } = req.body;
  if (!email && !mobile) {
    return res.status(400).json({ error: "Email or mobile is required to sync" });
  }

  // Check if user exists by jwt_token, email, or mobile in MySQL
  const query = "SELECT * FROM users WHERE (jwt_token IS NOT NULL AND jwt_token = ?) OR email = ? OR (mobile IS NOT NULL AND mobile = ?)";
  db.query(query, [jwt_token || null, email || null, mobile || null], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length > 0) {
      // User exists, update fields if necessary
      const user = results[0];
      const updateFields = {};
      if (name && user.name !== name) updateFields.name = name;
      if (profile_picture && user.profile_picture !== profile_picture) updateFields.profile_picture = profile_picture;
      if (jwt_token && user.jwt_token !== jwt_token) updateFields.jwt_token = jwt_token;
      
      const keys = Object.keys(updateFields);
      if (keys.length > 0) {
        const setClause = keys.map(key => `${key} = ?`).join(", ");
        db.query(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...Object.values(updateFields), user.id], (updateErr) => {
          if (!updateErr) {
            user.name = name || user.name;
            user.profile_picture = profile_picture || user.profile_picture;
            user.jwt_token = jwt_token || user.jwt_token;
            saveToSupabase(user);
          }
        });
      } else {
        saveToSupabase(user);
      }
      return res.status(200).json({ message: "User synced successfully", user });
    } else {
      // User does not exist, insert new user
      const insertSql = "INSERT INTO users (name, email, mobile, jwt_token, profile_picture, platform) VALUES (?, ?, ?, ?, ?, ?)";
      db.query(insertSql, [name, email, mobile, jwt_token, profile_picture, platform || 'android'], (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }
        const newUserId = result.insertId;
        const newUser = { id: newUserId, name, email, mobile, jwt_token, profile_picture, platform };
        saveToSupabase(newUser);
        return res.status(201).json({ message: "User synced successfully", user: newUser });
      });
    }
  });
};
