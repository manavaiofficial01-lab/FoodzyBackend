const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const pool = db.promise();
const bcrypt = require('bcryptjs');

require('dotenv').config();

const admin = require('../firebase.config');

// Proactive Asset Consolidation on Startup
try {
  const sourceUploads = 'd:/Project/FOODZY- ADMIN/backend/uploads';
  const targetUploads = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(sourceUploads)) {
    console.log(`[Asset-Consolidate] Consolidating uploads from ${sourceUploads} to ${targetUploads}...`);
    
    const copyFolderRecursiveSync = (source, target) => {
      if (!fs.existsSync(source)) return;
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }
      const files = fs.readdirSync(source);
      for (const file of files) {
        const curSource = path.join(source, file);
        const curTarget = path.join(target, file);
        if (fs.lstatSync(curSource).isDirectory()) {
          copyFolderRecursiveSync(curSource, curTarget);
        } else {
          if (!fs.existsSync(curTarget)) {
            try {
              fs.copyFileSync(curSource, curTarget);
            } catch (err) {
              console.error(`Failed to copy ${curSource}:`, err.message);
            }
          }
        }
      }
    };
    
    copyFolderRecursiveSync(sourceUploads, targetUploads);
    console.log(`[Asset-Consolidate] Uploads consolidation completed successfully.`);
  }
} catch (e) {
  console.error("[Asset-Consolidate] Warning:", e.message);
}

// Firebase Storage helper functions
async function uploadToFirebaseStorage(localFilePath, destinationName, mimeType) {
  if (admin.apps.length === 0) {
    throw new Error("Firebase Admin SDK not initialized");
  }
  const bucket = admin.storage().bucket();
  const destination = `Foodzy/${destinationName}`;
  
  const [file] = await bucket.upload(localFilePath, {
    destination: destination,
    metadata: {
      contentType: mimeType
    }
  });
  
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${destination}`;
}

async function uploadSingleFileToFirebase(req) {
  if (!req.file) return null;
  if (admin.apps.length === 0) {
    console.warn("Firebase Admin SDK not initialized. Storing files locally in /uploads as fallback.");
    return `/uploads/${req.file.filename}`;
  }
  const url = await uploadToFirebaseStorage(req.file.path, req.file.filename, req.file.mimetype);
  try {
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error(`Error deleting temp file ${req.file.path}:`, err);
  }
  return url;
}

async function uploadProductFilesToFirebase(req) {
  if (!req.files) return;
  req.firebaseUrls = {};
  for (const fieldName of Object.keys(req.files)) {
    const fileArray = req.files[fieldName];
    if (fileArray && fileArray[0]) {
      const file = fileArray[0];
      if (admin.apps.length === 0) {
        console.warn("Firebase Admin SDK not initialized. Storing files locally in /uploads as fallback.");
        req.firebaseUrls[fieldName] = `/uploads/${file.filename}`;
        continue;
      }
      const url = await uploadToFirebaseStorage(file.path, `products/${file.filename}`, file.mimetype);
      req.firebaseUrls[fieldName] = url;
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`Error deleting temp file ${file.path}:`, err);
      }
    }
  }
}

// Helper function to send push notification to user when order is cancelled
async function sendCancellationNotification(userId, orderId, isEcommerce = false) {
  try {
    if (admin.apps.length === 0) {
      console.log("Firebase Admin SDK not initialized. Skipping order cancellation FCM push notification.");
      return;
    }
    const [userRows] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0 || !userRows[0].fcm_token) {
      console.log(`No FCM token found for user ${userId}, skipping notification.`);
      return;
    }
    
    const fcmToken = userRows[0].fcm_token;
    console.log(`Sending cancellation push notification to user ${userId} with token ${fcmToken}`);
    
    const message = {
      token: fcmToken,
      notification: {
        title: isEcommerce ? 'Grocery Order Cancelled' : 'Food Order Cancelled',
        body: `Order #${orderId} has been cancelled by the admin.`
      },
      data: {
        orderId: String(orderId),
        type: isEcommerce ? 'ecommerce_order_cancelled' : 'food_order_cancelled'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    console.log('FCM Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending FCM push notification:', error.message);
  }
}

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration for local image files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'food-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF, WEBP) are allowed!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ─── RESTAURANTS API ──────────────────────────────────────────────────────────

// GET all restaurants with food_item counts merged and location-based sorting
router.get('/restaurants', async (req, res) => {
  const { lat, lon, radius } = req.query;

  const userLat  = parseFloat(lat);
  const userLon  = parseFloat(lon);
  const maxKm    = parseFloat(radius) || 25; // default zone radius 25 km

  const hasCoords = !isNaN(userLat) && !isNaN(userLon);

  let sql, params;

  if (hasCoords) {
    sql = `
      SELECT *,
        ROUND(
          6371 * ACOS(
            LEAST(1, 
              COS(RADIANS(?)) * COS(RADIANS(latitude))
              * COS(RADIANS(longitude) - RADIANS(?))
              + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )
          ), 2
        ) AS distance_km
      FROM restaurants
      WHERE latitude  IS NOT NULL
        AND longitude IS NOT NULL
      HAVING distance_km <= ?
      ORDER BY FIELD(hotel_status, 'open', 'close') ASC, distance_km ASC
    `;
    params = [userLat, userLon, userLat, maxKm];
  } else {
    sql = `
      SELECT *, NULL AS distance_km 
      FROM restaurants 
      ORDER BY FIELD(hotel_status, 'open', 'close') ASC, position ASC
    `;
    params = [];
  }

  try {
    const [restaurants] = await pool.query(sql, params);

    const [counts] = await pool.query(
      `SELECT restaurant_name,
              COUNT(*) AS total_items,
              SUM(popular = 1) AS popular_count,
              SUM(bestseller = 1) AS bestseller_count,
              SUM(veg = 1) AS veg_count,
              SUM(stock = 1 OR stock = 'Yes') AS in_stock_count
       FROM food_items
       GROUP BY restaurant_name`
    );

    const countMap = {};
    counts.forEach(c => { countMap[c.restaurant_name] = c; });

    const merged = restaurants.map(r => {
      const c = countMap[r.name] || {};
      let tags = [];
      try { tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []); } catch {}
      return {
        ...r,
        tags,
        distance_km: r.distance_km != null ? parseFloat(r.distance_km) : null,
        total_items:      parseInt(c.total_items)      || 0,
        popular_count:    parseInt(c.popular_count)    || 0,
        bestseller_count: parseInt(c.bestseller_count) || 0,
        veg_count:        parseInt(c.veg_count)        || 0,
        in_stock_count:   parseInt(c.in_stock_count)   || 0,
      };
    });

    res.json(merged);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Failed to retrieve restaurants. ' + error.message });
  }
});

// PATCH toggle hotel_status open ↔ close
router.patch('/restaurants/:id/status', async (req, res) => {
  const { id } = req.params;
  const { hotel_status } = req.body;
  if (!['open', 'close'].includes(hotel_status)) {
    return res.status(400).json({ error: "hotel_status must be 'open' or 'close'." });
  }
  try {
    const [result] = await pool.query(
      'UPDATE restaurants SET hotel_status = ? WHERE id = ?', [hotel_status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Restaurant not found.' });
    res.json({ message: 'Status updated.', hotel_status });
  } catch (error) {
    console.error('Error updating restaurant status:', error);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// PUT update restaurant details (hotel_status, open_time, close_time)
router.put('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  const { hotel_status, open_time, close_time } = req.body;
  
  const updates = {};
  if (hotel_status !== undefined) {
    if (!['open', 'close'].includes(hotel_status)) {
      return res.status(400).json({ error: "hotel_status must be 'open' or 'close'." });
    }
    updates.hotel_status = hotel_status;
  }
  if (open_time !== undefined) updates.open_time = open_time;
  if (close_time !== undefined) updates.close_time = close_time;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  try {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const [result] = await pool.query(`UPDATE restaurants SET ${setClauses} WHERE id = ?`, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }
    
    res.json({ message: 'Restaurant updated successfully.', ...updates });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Failed to update restaurant. ' + error.message });
  }
});

// POST create a new restaurant
router.post('/restaurants', upload.single('imageFile'), async (req, res) => {
  try {
    const {
      id,
      name,
      open_time,
      close_time,
      rating,
      category,
      delivery_time,
      min_order,
      hotel_status,
      latitude,
      longitude,
      offer,
      tags,
      username,
      password,
      image_type,
      image_url
    } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'Restaurant ID and Name are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM restaurants WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `A restaurant with ID ${id} already exists.` });
    }

    let finalImagePath = '';
    if (image_type === 'file') {
      const firebaseImageUrl = await uploadSingleFileToFirebase(req);
      if (!firebaseImageUrl) {
        return res.status(400).json({ error: 'Please upload a restaurant image file.' });
      }
      finalImagePath = firebaseImageUrl;
    } else {
      finalImagePath = image_url || '';
    }

    const lat = parseFloat(latitude) || null;
    const lng = parseFloat(longitude) || null;
    const ratVal = parseFloat(rating) || 4.0;
    const statusVal = hotel_status === 'close' ? 'close' : 'open';

    const [posResult] = await pool.query('SELECT MAX(position) as maxPos FROM restaurants');
    const nextPos = (posResult[0]?.maxPos || 0) + 1;

    let tagsJson = '[]';
    if (tags) {
      try {
        if (typeof tags === 'string') {
          if (tags.trim().startsWith('[')) {
            tagsJson = JSON.stringify(JSON.parse(tags));
          } else {
            tagsJson = JSON.stringify(tags.split(',').map(t => t.trim()));
          }
        } else if (Array.isArray(tags)) {
          tagsJson = JSON.stringify(tags);
        }
      } catch (err) {
        console.error('Error parsing tags:', err);
      }
    }

    const query = `
      INSERT INTO restaurants (
        id, position, name, open_time, close_time, rating, category, 
        delivery_time, min_order, tags, offer, latitude, longitude, 
        reviews_count, hotel_status, username, password, restaurant_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      nextPos,
      name,
      open_time || '11:00 AM',
      close_time || '11:00 PM',
      ratVal,
      category || 'Both',
      delivery_time || '30-40 min',
      min_order || '49',
      tagsJson,
      offer || '',
      lat,
      lng,
      0,
      statusVal,
      username || null,
      password || null,
      finalImagePath
    ];

    await pool.query(query, values);

    res.status(201).json({
      message: 'Restaurant created successfully!',
      restaurantId: id,
      image_path: finalImagePath
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Failed to create restaurant. ' + error.message });
  }
});

// ─── FOODS API ─────────────────────────────────────────────────────────────

router.get('/foods', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM food_items ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ error: 'Failed to retrieve food items.' });
  }
});

router.post('/foods', upload.single('imageFile'), async (req, res) => {
  try {
    const {
      food_name,
      restaurant_name,
      category,
      current_price,
      original_price,
      profit,
      calories,
      preparation_time,
      rating,
      review_count,
      display_position,
      lifetime_limit,
      is_vegetarian,
      is_popular,
      is_best_seller,
      image_type,
      image_url,
      morning,
      afternoon,
      evening,
      night,
      zone_name,
      stock,
      sub_category_id,
      weight
    } = req.body;

    if (!food_name || !restaurant_name || !category) {
      return res.status(400).json({ error: 'Food name, restaurant name, and category are required.' });
    }

    let finalImagePath = '';
    if (image_type === 'file') {
      const firebaseImageUrl = await uploadSingleFileToFirebase(req);
      if (!firebaseImageUrl) {
        return res.status(400).json({ error: 'Please upload an image file.' });
      }
      finalImagePath = firebaseImageUrl;
    } else {
      if (!image_url) {
        return res.status(400).json({ error: 'Please provide an image URL.' });
      }
      finalImagePath = image_url;
    }

    const isVeg = is_vegetarian === 'true' || is_vegetarian === true ? 1 : 0;
    const isPop = is_popular === 'true' || is_popular === true ? 1 : 0;
    const isBest = is_best_seller === 'true' || is_best_seller === true ? 1 : 0;

    const morningVal = morning === 'true' || morning === true ? 'Yes' : null;
    const afternoonVal = afternoon === 'true' || afternoon === true ? 'Yes' : null;
    const eveningVal = evening === 'true' || evening === true ? 'Yes' : null;
    const nightVal = night === 'true' || night === true ? 1 : 0;

    const stockVal = stock === 'false' || stock === false ? 0 : 1;

    const subCatId = parseInt(sub_category_id) || null;
    const weightVal = weight || null;
    const zoneNameVal = zone_name || null;

    const curPrice = parseFloat(current_price) || 0.0;
    const origPrice = parseFloat(original_price) || 0.0;
    const profVal = parseFloat(profit) || 0.0;
    const cals = parseInt(calories) || 0;
    const prepTime = parseInt(preparation_time) || 0;
    const ratingVal = parseFloat(rating) || 0.0;
    const reviews = parseInt(review_count) || 0;
    const dispPos = parseInt(display_position) || 0;
    const lifeLimit = parseInt(lifetime_limit) || 0;

    const query = `
      INSERT INTO food_items (
        name, price, original_price, profit, category, restaurant_name, 
        rating, review_count, veg, popular, bestseller, calories, 
        prep_time, image_url, food_position,
        morning, afternoon, evening, night, zone_name, stock, sub_category_id, weight,
        lifetime_limit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      food_name,
      curPrice,
      origPrice,
      profVal,
      category,
      restaurant_name,
      ratingVal,
      reviews,
      isVeg,
      isPop,
      isBest,
      cals,
      prepTime.toString(),
      finalImagePath,
      dispPos,
      morningVal,
      afternoonVal,
      eveningVal,
      nightVal,
      zoneNameVal,
      stockVal,
      subCatId,
      weightVal,
      lifeLimit
    ];

    const [result] = await pool.query(query, values);
    
    res.status(201).json({
      message: 'Food item uploaded successfully!',
      foodId: result.insertId,
      image_path: finalImagePath
    });
  } catch (error) {
    console.error('Error adding food item:', error);
    res.status(500).json({ error: 'Failed to upload food item. Details: ' + error.message });
  }
});

router.delete('/foods/:id', async (req, res) => {
  const foodId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT image_url FROM food_items WHERE id = ?', [foodId]);
    if (rows.length > 0) {
      const item = rows[0];
      if (item.image_url && item.image_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', item.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    const [result] = await pool.query('DELETE FROM food_items WHERE id = ?', [foodId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Food item not found.' });
    }
    res.json({ message: 'Food item deleted successfully.' });
  } catch (error) {
    console.error('Error deleting food item:', error);
    res.status(500).json({ error: 'Failed to delete food item.' });
  }
});

router.put('/foods/:id', async (req, res) => {
  const foodId = req.params.id;
  const allowed = ['popular', 'bestseller', 'stock', 'food_position', 'morning', 'afternoon', 'evening', 'night',
                   'name', 'price', 'original_price', 'profit', 'category', 'calories', 'prep_time', 'rating', 'review_count', 'lifetime_limit'];
  const updates = {};
  allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  try {
    if (req.body.lifetime_limit !== undefined) {
      const [currentFood] = await pool.query('SELECT lifetime_limit FROM food_items WHERE id = ?', [foodId]);
      if (currentFood.length > 0 && currentFood[0].lifetime_limit !== parseInt(req.body.lifetime_limit)) {
        updates.limit_updated_at = new Date();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values     = [...Object.values(updates), foodId];
    const [result]   = await pool.query(`UPDATE food_items SET ${setClauses} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Food item not found.' });
    res.json({ message: 'Food item updated successfully.' });
  } catch (error) {
    console.error('Error updating food item:', error);
    res.status(500).json({ error: 'Failed to update food item. ' + error.message });
  }
});

router.post('/foods/bulk-update', async (req, res) => {
  const { restaurant_name, field, value } = req.body;
  if (!restaurant_name || !field) return res.status(400).json({ error: 'restaurant_name and field are required.' });
  const allowed = ['morning', 'afternoon', 'evening', 'night', 'stock', 'popular', 'bestseller'];
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Field not allowed for bulk update.' });
  try {
    const [result] = await pool.query(
      `UPDATE food_items SET ${field} = ? WHERE restaurant_name = ?`,
      [value, restaurant_name]
    );
    res.json({ message: 'Bulk update applied.', count: result.affectedRows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed. ' + error.message });
  }
});

// GET all food orders
router.get('/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM food_orders ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// GET all e-commerce orders
router.get('/ecommerce-orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ecommerce_orders ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching e-commerce orders:', error);
    res.status(500).json({ error: 'Failed to retrieve e-commerce orders.' });
  }
});

// ─── DRIVERS API ────────────────────────────────────────────────────────────

// GET available drivers
router.get('/drivers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name AS driver_name, phone AS driver_phone, status, last_active, duty_start_time, duty_end_time FROM drivers ORDER BY id DESC');
    const formattedDrivers = rows.map(driver => {
      const start = driver.duty_start_time || '09:00';
      const end = driver.duty_end_time || '21:00';
      
      let lastActiveStr = 'Never';
      if (driver.last_active) {
        const d = new Date(driver.last_active);
        lastActiveStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      }
      
      return {
        id: driver.id.toString(),
        name: driver.driver_name,
        mobile: driver.driver_phone,
        status: driver.status || 'offline',
        lastActive: lastActiveStr,
        shift: `${start} - ${end}`
      };
    });
    
    res.json(formattedDrivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to retrieve drivers.' });
  }
});

// GET global driver statistics
router.get('/drivers/stats', async (req, res) => {
  try {
    const [totalDriversResult] = await pool.query('SELECT COUNT(*) as count FROM drivers');
    const totalDrivers = totalDriversResult[0]?.count || 0;

    const [earningsResult] = await pool.query(`
      SELECT 
        COALESCE(SUM(driver_order_earnings), 0) as total 
      FROM (
        SELECT driver_order_earnings, status FROM food_orders
        UNION ALL
        SELECT driver_order_earnings, status FROM ecommerce_orders
      ) as all_orders 
      WHERE status = 'delivered'
    `);
    const lifetimeEarnings = parseFloat(earningsResult[0]?.total || 0);

    const [ordersResult] = await pool.query(`
      SELECT 
        COUNT(*) as count 
      FROM (
        SELECT status FROM food_orders
        UNION ALL
        SELECT status FROM ecommerce_orders
      ) as all_orders 
      WHERE status = 'delivered'
    `);
    const lifetimeOrders = ordersResult[0]?.count || 0;

    const [todayEarningsResult] = await pool.query(`
      SELECT 
        COALESCE(SUM(driver_order_earnings), 0) as total 
      FROM (
        SELECT driver_order_earnings, status, created_at FROM food_orders
        UNION ALL
        SELECT driver_order_earnings, status, created_at FROM ecommerce_orders
      ) as all_orders 
      WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE()
    `);
    const todayEarnings = parseFloat(todayEarningsResult[0]?.total || 0);

    const [todayOrdersResult] = await pool.query(`
      SELECT 
        COUNT(*) as count 
      FROM (
        SELECT status, created_at FROM food_orders
        UNION ALL
        SELECT status, created_at FROM ecommerce_orders
      ) as all_orders 
      WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE()
    `);
    const todayOrders = todayOrdersResult[0]?.count || 0;

    const [activeDriversResult] = await pool.query("SELECT COUNT(*) as count FROM drivers WHERE status = 'online'");
    const activeDrivers = activeDriversResult[0]?.count || 0;

    res.json({
      totalDrivers,
      lifetimeEarnings,
      lifetimeOrders,
      todayEarnings,
      todayOrders,
      activeDrivers
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ error: 'Failed to retrieve driver stats.' });
  }
});

// GET online drivers with their locations
router.get('/driver-tracking/online', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name AS driver_name, phone AS driver_phone, current_latitude AS latitude, current_longitude AS longitude, last_active, status FROM drivers WHERE status = 'online'"
    );
    
    const drivers = rows.map(driver => {
      let lastActiveStr = 'Never';
      if (driver.last_active) {
        const d = new Date(driver.last_active);
        lastActiveStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
      
      return {
        id: driver.id.toString(),
        name: driver.driver_name,
        mobile: driver.driver_phone,
        latitude: driver.latitude,
        longitude: driver.longitude,
        lastActive: lastActiveStr,
        status: driver.status
      };
    });
    
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching online drivers:', error);
    res.status(500).json({ error: 'Failed to retrieve online drivers.' });
  }
});

// GET details for a specific driver by mobile/phone
router.get('/drivers/:mobile/details', async (req, res) => {
  const mobile = req.params.mobile;
  try {
    const [statsResult] = await pool.query(`
      SELECT 
        COALESCE(SUM(driver_order_earnings), 0) as total_earnings,
        COUNT(*) as total_orders
      FROM (
        SELECT driver_order_earnings, status, driver_mobile FROM food_orders
        UNION ALL
        SELECT driver_order_earnings, status, driver_mobile FROM ecommerce_orders
      ) as all_orders
      WHERE driver_mobile = ? AND status = 'delivered'
    `, [mobile, mobile]);

    const totalEarnings = parseFloat(statsResult[0]?.total_earnings || 0);
    const totalOrders = statsResult[0]?.total_orders || 0;

    const [todayStatsResult] = await pool.query(`
      SELECT 
        COALESCE(SUM(driver_order_earnings), 0) as today_earnings,
        COUNT(*) as today_orders
      FROM (
        SELECT driver_order_earnings, status, driver_mobile, created_at FROM food_orders
        UNION ALL
        SELECT driver_order_earnings, status, driver_mobile, created_at FROM ecommerce_orders
      ) as all_orders
      WHERE driver_mobile = ? AND status = 'delivered' AND DATE(created_at) = CURRENT_DATE()
    `, [mobile, mobile]);

    const todayEarnings = parseFloat(todayStatsResult[0]?.today_earnings || 0);
    const todayOrders = todayStatsResult[0]?.today_orders || 0;

    const [ordersResult] = await pool.query(`
      SELECT * FROM (
        SELECT id, 'Food' as type, customer_name, total_amount, status, driver_order_earnings, created_at 
        FROM food_orders 
        WHERE driver_mobile = ?
        UNION ALL
        SELECT id, 'Ecommerce' as type, customer_name, total_amount, status, driver_order_earnings, created_at 
        FROM ecommerce_orders 
        WHERE driver_mobile = ?
      ) as combined_orders
      ORDER BY created_at DESC 
      LIMIT 15
    `, [mobile, mobile]);

    const [dailyBreakdown] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, SUM(driver_order_earnings) as earnings 
      FROM (
        SELECT created_at, driver_order_earnings, status, driver_mobile FROM food_orders
        UNION ALL
        SELECT created_at, driver_order_earnings, status, driver_mobile FROM ecommerce_orders
      ) as all_orders
      WHERE driver_mobile = ? AND status = 'delivered'
      GROUP BY DATE(created_at)
    `, [mobile]);

    res.json({
      stats: {
        totalEarnings,
        totalOrders,
        todayEarnings,
        todayOrders
      },
      orders: ordersResult,
      dailyBreakdown
    });
  } catch (error) {
    console.error('Error fetching driver details:', error);
    res.status(500).json({ error: 'Failed to retrieve driver details.' });
  }
});

// PATCH update a driver's details/status/shift
router.patch('/drivers/:id', async (req, res) => {
  const driverId = req.params.id;
  const updates = req.body;
  const fields = [];
  const values = [];

  const allowedFields = ['name', 'driver_name', 'driver_phone', 'status', 'duty_start_time', 'duty_end_time', 'shift'];

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      if (key === 'name' || key === 'driver_name') {
        fields.push('full_name = ?');
        values.push(updates[key]);
      } else if (key === 'driver_phone') {
        fields.push('phone = ?');
        values.push(updates[key]);
      } else if (key === 'shift') {
        if (updates.shift.includes(' - ')) {
          const parts = updates.shift.split(' - ');
          fields.push('duty_start_time = ?', 'duty_end_time = ?');
          values.push(parts[0], parts[1]);
        }
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  if (updates.driver_phone !== undefined && !/^\d{10}$/.test(updates.driver_phone)) {
    return res.status(400).json({ error: 'Mobile number must be a valid 10-digit number.' });
  }

  try {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(driverId);

    const [result] = await pool.query(
      `UPDATE drivers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    res.json({ message: 'Driver updated successfully.' });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Failed to update driver.' });
  }
});

// POST add a new driver
router.post('/drivers', async (req, res) => {
  const { name, mobile, password, shift } = req.body;
  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'Name, Mobile number, and Password are required.' });
  }

  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: 'Mobile number must be a valid 10-digit number.' });
  }
  
  let start_time = '09:00';
  let end_time = '21:00';
  if (shift && shift.includes(' - ')) {
    const parts = shift.split(' - ');
    start_time = parts[0] || '09:00';
    end_time = parts[1] || '21:00';
  }

  try {
    const [existingDrivers] = await pool.query('SELECT id FROM drivers WHERE phone = ?', [mobile]);
    if (existingDrivers.length > 0) {
      return res.status(400).json({ error: 'A driver with this phone number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const driversQuery = `
      INSERT INTO drivers (
        full_name, phone, password, status, duty_start_time, duty_end_time, vehicle_type, vehicle_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const driversValues = [name.toUpperCase(), mobile, hashedPassword, 'available', start_time, end_time, 'bike', 'N/A'];
    const [result] = await pool.query(driversQuery, driversValues);

    const today = new Date();
    const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    const newDriver = {
      id: result.insertId.toString(),
      name: name.toUpperCase(),
      mobile: mobile,
      status: 'available',
      lastActive: formattedDate,
      shift: `${start_time} - ${end_time}`
    };
    
    res.status(201).json(newDriver);
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ error: 'Failed to create driver in database. Details: ' + error.message });
  }
});

// DELETE a driver
router.delete('/drivers/:id', async (req, res) => {
  const driverId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM drivers WHERE id = ?', [driverId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    res.json({ message: 'Driver deleted successfully.', id: driverId });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'Failed to delete driver.' });
  }
});

// PUT update global shifts
router.put('/drivers/shift', async (req, res) => {
  const { shift } = req.body;
  if (!shift) {
    return res.status(400).json({ error: 'Shift range is required.' });
  }
  
  let start_time = '09:00';
  let end_time = '21:00';
  if (shift && shift.includes(' - ')) {
    const parts = shift.split(' - ');
    start_time = parts[0] || '09:00';
    end_time = parts[1] || '21:00';
  }

  try {
    await pool.query(
      'UPDATE drivers SET duty_start_time = ?, duty_end_time = ?, updated_at = CURRENT_TIMESTAMP',
      [start_time, end_time]
    );
    res.json({ message: 'Global shift updated successfully.', shift });
  } catch (error) {
    console.error('Error updating shifts:', error);
    res.status(500).json({ error: 'Failed to update global shift.' });
  }
});

// POST assign driver to an order
router.post('/orders/:id/assign', async (req, res) => {
  const orderId = req.params.id;
  const { driver_name, driver_mobile } = req.body;
  
  if (!driver_name || !driver_mobile) {
    return res.status(400).json({ error: 'Driver name and mobile are required.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE food_orders SET driver_name = ?, driver_mobile = ?, driver_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [driver_name, driver_mobile, 'assigned', orderId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    
    res.json({ message: 'Driver assigned successfully!' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Failed to assign driver. Details: ' + error.message });
  }
});

// POST assign driver to an e-commerce order
router.post('/ecommerce-orders/:id/assign', async (req, res) => {
  const orderId = req.params.id;
  const { driver_name, driver_mobile } = req.body;
  
  if (!driver_name || !driver_mobile) {
    return res.status(400).json({ error: 'Driver name and mobile are required.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE ecommerce_orders SET driver_name = ?, driver_mobile = ?, driver_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [driver_name, driver_mobile, 'assigned', orderId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'E-commerce order not found.' });
    }
    
    res.json({ message: 'Driver assigned successfully to e-commerce order!' });
  } catch (error) {
    console.error('Error assigning driver to e-commerce order:', error);
    res.status(500).json({ error: 'Failed to assign driver. Details: ' + error.message });
  }
});

// POST cancel an order
router.post('/orders/:id/cancel', async (req, res) => {
  const orderId = req.params.id;
  try {
    const [orderRows] = await pool.query('SELECT user_id FROM food_orders WHERE id = ?', [orderId]);
    
    const [result] = await pool.query(
      'UPDATE food_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', orderId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found.' });
    
    if (orderRows.length > 0 && orderRows[0].user_id) {
      sendCancellationNotification(orderRows[0].user_id, orderId, false);
    }

    res.json({ message: 'Order cancelled successfully!' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// POST cancel an e-commerce order
router.post('/ecommerce-orders/:id/cancel', async (req, res) => {
  const orderId = req.params.id;
  try {
    const [orderRows] = await pool.query('SELECT user_id FROM ecommerce_orders WHERE id = ?', [orderId]);

    const [result] = await pool.query(
      'UPDATE ecommerce_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', orderId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'E-commerce order not found.' });

    if (orderRows.length > 0 && orderRows[0].user_id) {
      sendCancellationNotification(orderRows[0].user_id, orderId, true);
    }

    res.json({ message: 'E-commerce order cancelled successfully!' });
  } catch (error) {
    console.error('Error cancelling e-commerce order:', error);
    res.status(500).json({ error: 'Failed to cancel e-commerce order.' });
  }
});

// Update order status/payments dynamically (food orders)
router.patch('/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const updates = req.body;
  const fields = [];
  const values = [];
  const allowedFields = ['status', 'cash', 'upi', 'cash_collected', 'cash_collected_amount', 'payment_verified'];

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(orderId);

  try {
    const [result] = await pool.query(
      `UPDATE food_orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.json({ message: 'Order status updated successfully.' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// Update order status/payments dynamically (e-commerce orders)
router.patch('/ecommerce-orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const updates = req.body;
  const fields = [];
  const values = [];
  const allowedFields = ['status', 'cash', 'upi', 'cash_collected', 'cash_collected_amount', 'payment_verified'];

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(orderId);

  try {
    const [result] = await pool.query(
      `UPDATE ecommerce_orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'E-commerce order not found.' });
    }
    res.json({ message: 'E-commerce order status updated successfully.' });
  } catch (error) {
    console.error('Error updating e-commerce status:', error);
    res.status(500).json({ error: 'Failed to update e-commerce order status.' });
  }
});

// Unassign driver from food order
router.post('/orders/:id/unassign', async (req, res) => {
  const orderId = req.params.id;
  try {
    const [result] = await pool.query(
      'UPDATE food_orders SET driver_name = NULL, driver_mobile = NULL, driver_status = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [orderId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.json({ message: 'Driver unassigned successfully.' });
  } catch (error) {
    console.error('Error unassigning driver:', error);
    res.status(500).json({ error: 'Failed to unassign driver.' });
  }
});

// Unassign driver from e-commerce order
router.post('/ecommerce-orders/:id/unassign', async (req, res) => {
  const orderId = req.params.id;
  try {
    const [result] = await pool.query(
      'UPDATE ecommerce_orders SET driver_name = NULL, driver_mobile = NULL, driver_status = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [orderId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'E-commerce order not found.' });
    }
    res.json({ message: 'Driver unassigned successfully from e-commerce order.' });
  } catch (error) {
    console.error('Error unassigning driver from e-commerce:', error);
    res.status(500).json({ error: 'Failed to unassign driver.' });
  }
});

// Update food order items and total
router.put('/orders/:id/items', async (req, res) => {
  const orderId = req.params.id;
  const { items, total_amount, restaurant_name, delivery_charges } = req.body;
  const fields = [];
  const values = [];

  try {
    const [orderRows] = await pool.query('SELECT items, total_amount, customer_name, customer_phone, original_items FROM food_orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const currentOrder = orderRows[0];
    const prevItems = currentOrder.items;
    const prevTotal = currentOrder.total_amount;

    if (!currentOrder.original_items) {
      fields.push('original_items = ?');
      values.push(prevItems);
    }

    const modifiedItems = items !== undefined 
      ? (typeof items === 'string' ? items : JSON.stringify(items))
      : prevItems;

    await pool.query(
      `INSERT INTO order_modifications 
       (order_id, is_ecommerce, customer_name, customer_phone, original_items, modified_items, original_total, modified_total, modified_by)
       VALUES (?, 0, ?, ?, ?, ?, ?, ?, 'admin')`,
      [
        orderId,
        currentOrder.customer_name,
        currentOrder.customer_phone,
        prevItems,
        modifiedItems,
        prevTotal,
        total_amount !== undefined ? total_amount : prevTotal
      ]
    );

    if (items !== undefined) {
      fields.push('items = ?');
      values.push(typeof items === 'string' ? items : JSON.stringify(items));
    }
    if (total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(total_amount);
    }
    if (restaurant_name !== undefined) {
      fields.push('restaurant_name = ?');
      values.push(restaurant_name);
    }
    if (delivery_charges !== undefined) {
      fields.push('delivery_charges = ?');
      values.push(delivery_charges);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(orderId);

    const [result] = await pool.query(
      `UPDATE food_orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    res.json({ message: 'Order items updated successfully.' });
  } catch (error) {
    console.error('Error updating order items:', error);
    res.status(500).json({ error: 'Failed to update order items.' });
  }
});

// Update e-commerce order items and total
router.put('/ecommerce-orders/:id/items', async (req, res) => {
  const orderId = req.params.id;
  const { items, total_amount, warehouse, delivery_charges } = req.body;
  const fields = [];
  const values = [];

  try {
    const [orderRows] = await pool.query('SELECT items, total_amount, customer_name, customer_phone, original_items FROM ecommerce_orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'E-commerce order not found.' });
    }

    const currentOrder = orderRows[0];
    const prevItems = currentOrder.items;
    const prevTotal = currentOrder.total_amount;

    if (!currentOrder.original_items) {
      fields.push('original_items = ?');
      values.push(prevItems);
    }

    const modifiedItems = items !== undefined 
      ? (typeof items === 'string' ? items : JSON.stringify(items))
      : prevItems;

    await pool.query(
      `INSERT INTO order_modifications 
       (order_id, is_ecommerce, customer_name, customer_phone, original_items, modified_items, original_total, modified_total, modified_by)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'admin')`,
      [
        orderId,
        currentOrder.customer_name,
        currentOrder.customer_phone,
        prevItems,
        modifiedItems,
        prevTotal,
        total_amount !== undefined ? total_amount : prevTotal
      ]
    );

    if (items !== undefined) {
      fields.push('items = ?');
      values.push(typeof items === 'string' ? items : JSON.stringify(items));
    }
    if (total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(total_amount);
    }
    if (warehouse !== undefined) {
      fields.push('warehouse = ?');
      values.push(warehouse);
    }
    if (delivery_charges !== undefined) {
      fields.push('delivery_charges = ?');
      values.push(delivery_charges);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(orderId);

    const [result] = await pool.query(
      `UPDATE ecommerce_orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    res.json({ message: 'E-commerce order items updated successfully.' });
  } catch (error) {
    console.error('Error updating e-commerce items:', error);
    res.status(500).json({ error: 'Failed to update e-commerce order items.' });
  }
});

// GET modifications log for a specific order
router.get('/orders/:id/modifications', async (req, res) => {
  const orderId = req.params.id;
  const isEcommerce = req.query.is_ecommerce === 'true' ? 1 : 0;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM order_modifications WHERE order_id = ? AND is_ecommerce = ? ORDER BY id ASC',
      [orderId, isEcommerce]
    );
    const processed = rows.map(r => {
      const parseJSONSafe = (val) => {
        try { return typeof val === 'string' ? JSON.parse(val) : val || []; } catch { return []; }
      };
      return {
        ...r,
        old_items: parseJSONSafe(r.original_items),
        new_items: parseJSONSafe(r.modified_items),
      };
    });
    res.json(processed);
  } catch (error) {
    console.error('Error fetching order modifications:', error);
    res.status(500).json({ error: 'Failed to retrieve order modifications.' });
  }
});

// ─── PRODUCTS API ─────────────────────────────────────────────────────────────

// Multer storage for product images
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'products');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const productUpload = multer({
  storage: productStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF, WEBP) are allowed!'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const productImageFields = [
  { name: 'mainImage', maxCount: 1 },
  { name: 'color1_image1', maxCount: 1 },
  { name: 'color1_image2', maxCount: 1 },
  { name: 'color1_image3', maxCount: 1 },
  { name: 'color1_image4', maxCount: 1 },
  { name: 'color2_image1', maxCount: 1 },
  { name: 'color2_image2', maxCount: 1 },
  { name: 'color2_image3', maxCount: 1 },
  { name: 'color2_image4', maxCount: 1 },
  { name: 'color3_image1', maxCount: 1 },
  { name: 'color3_image2', maxCount: 1 },
  { name: 'color3_image3', maxCount: 1 },
  { name: 'color3_image4', maxCount: 1 },
  { name: 'color4_image1', maxCount: 1 },
  { name: 'color4_image2', maxCount: 1 },
  { name: 'color4_image3', maxCount: 1 },
  { name: 'color4_image4', maxCount: 1 },
];

const getFileUrl = (req, fieldName) => {
  if (req.firebaseUrls && req.firebaseUrls[fieldName]) {
    return req.firebaseUrls[fieldName];
  }
  return null;
};

// GET all product categories with their subcategories
router.get('/product-categories-with-subs', async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM product_categories ORDER BY position');
    const [subCategories] = await pool.query('SELECT * FROM sub_categories ORDER BY position');
    
    const mapped = categories.map(cat => {
      return {
        ...cat,
        sub_categories: subCategories.filter(sub => sub.product_category_id === cat.id)
      };
    });
    
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching product categories with subs:', error);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// GET all products
router.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

// POST create a new product
router.post('/products', productUpload.fields(productImageFields), async (req, res) => {
  try {
    await uploadProductFilesToFirebase(req);

    const {
      name, category, price, brand, description, discount,
      rating, reviews, stock, profit, warehouse, zone, limit_per_user_total,
      sub_category_id,
      color1, color1_code, color1_price,
      color2, color2_code, color2_price,
      color3, color3_code, color3_price,
      color4, color4_code, color4_price,
      size1, size1_price, size2, size2_price,
      size3, size3_price, size4, size4_price,
    } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ error: 'Product name, category and price are required.' });
    }

    let mainImageUrl = req.body.main_image_url || '';
    const mainFile = getFileUrl(req, 'mainImage');
    if (mainFile) mainImageUrl = mainFile;

    if (!mainImageUrl) {
      return res.status(400).json({ error: 'A main product image is required.' });
    }

    const sql = `
      INSERT INTO products (
        name, category, price, brand, description, discount,
        rating, reviews, stock, main_image_url,
        color1, color1_code, color1_price,
        color1_image1, color1_image2, color1_image3, color1_image4,
        color2, color2_code, color2_price,
        color2_image1, color2_image2, color2_image3, color2_image4,
        color3, color3_code, color3_price,
        color3_image1, color3_image2, color3_image3, color3_image4,
        color4, color4_code, color4_price,
        color4_image1, color4_image2, color4_image3, color4_image4,
        size1, size1_price, size2, size2_price,
        size3, size3_price, size4, size4_price,
        profit, warehouse, zone, limit_per_user_total,
        sub_category_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )
    `;

    const values = [
      name, category, parseFloat(price) || 0,
      brand || null, description || null, discount || null,
      parseFloat(rating) || 0, parseInt(reviews) || 0, parseInt(stock) || 0,
      mainImageUrl,
      color1 || null, color1_code || null, parseFloat(color1_price) || null,
      getFileUrl(req, 'color1_image1'), getFileUrl(req, 'color1_image2'),
      getFileUrl(req, 'color1_image3'), getFileUrl(req, 'color1_image4'),
      color2 || null, color2_code || null, parseFloat(color2_price) || null,
      getFileUrl(req, 'color2_image1'), getFileUrl(req, 'color2_image2'),
      getFileUrl(req, 'color2_image3'), getFileUrl(req, 'color2_image4'),
      color3 || null, color3_code || null, parseFloat(color3_price) || null,
      getFileUrl(req, 'color3_image1'), getFileUrl(req, 'color3_image2'),
      getFileUrl(req, 'color3_image3'), getFileUrl(req, 'color3_image4'),
      color4 || null, color4_code || null, parseFloat(color4_price) || null,
      getFileUrl(req, 'color4_image1'), getFileUrl(req, 'color4_image2'),
      getFileUrl(req, 'color4_image3'), getFileUrl(req, 'color4_image4'),
      size1 || null, parseFloat(size1_price) || null,
      size2 || null, parseFloat(size2_price) || null,
      size3 || null, parseFloat(size3_price) || null,
      size4 || null, parseFloat(size4_price) || null,
      parseFloat(profit) || 0,
      warehouse || null,
      zone || null,
      parseInt(limit_per_user_total) || 0,
      sub_category_id ? parseInt(sub_category_id) : null,
    ];

    const [result] = await pool.query(sql, values);
    res.status(201).json({
      message: 'Product uploaded successfully!',
      productId: result.insertId,
      main_image_url: mainImageUrl,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to upload product. Details: ' + error.message });
  }
});

// PUT update a product
router.put('/products/:id', productUpload.fields(productImageFields), async (req, res) => {
  const { id } = req.params;
  try {
    await uploadProductFilesToFirebase(req);

    const {
      name, category, price, brand, description, discount,
      rating, reviews, stock, profit, warehouse, zone, limit_per_user_total,
      sub_category_id,
      color1, color1_code, color1_price,
      color2, color2_code, color2_price,
      color3, color3_code, color3_price,
      color4, color4_code, color4_price,
      size1, size1_price, size2, size2_price,
      size3, size3_price, size4, size4_price,
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const currentProduct = existing[0];

    let mainImageUrl = currentProduct.main_image_url;
    const mainFile = getFileUrl(req, 'mainImage');
    if (mainFile) mainImageUrl = mainFile;

    const c1_img1 = getFileUrl(req, 'color1_image1') || currentProduct.color1_image1;
    const c1_img2 = getFileUrl(req, 'color1_image2') || currentProduct.color1_image2;
    const c1_img3 = getFileUrl(req, 'color1_image3') || currentProduct.color1_image3;
    const c1_img4 = getFileUrl(req, 'color1_image4') || currentProduct.color1_image4;

    const c2_img1 = getFileUrl(req, 'color2_image1') || currentProduct.color2_image1;
    const c2_img2 = getFileUrl(req, 'color2_image2') || currentProduct.color2_image2;
    const c2_img3 = getFileUrl(req, 'color2_image3') || currentProduct.color2_image3;
    const c2_img4 = getFileUrl(req, 'color2_image4') || currentProduct.color2_image4;

    const c3_img1 = getFileUrl(req, 'color3_image1') || currentProduct.color3_image1;
    const c3_img2 = getFileUrl(req, 'color3_image2') || currentProduct.color3_image2;
    const c3_img3 = getFileUrl(req, 'color3_image3') || currentProduct.color3_image3;
    const c3_img4 = getFileUrl(req, 'color3_image4') || currentProduct.color3_image4;

    const c4_img1 = getFileUrl(req, 'color4_image1') || currentProduct.color4_image1;
    const c4_img2 = getFileUrl(req, 'color4_image2') || currentProduct.color4_image2;
    const c4_img3 = getFileUrl(req, 'color4_image3') || currentProduct.color4_image3;
    const c4_img4 = getFileUrl(req, 'color4_image4') || currentProduct.color4_image4;

    let limitUpdatedAt = currentProduct.limit_updated_at;
    if (limit_per_user_total !== undefined && parseInt(limit_per_user_total) !== currentProduct.limit_per_user_total) {
      limitUpdatedAt = new Date();
    }

    const sql = `
      UPDATE products SET
        name = ?, category = ?, price = ?, brand = ?, description = ?, discount = ?,
        rating = ?, reviews = ?, stock = ?, main_image_url = ?,
        color1 = ?, color1_code = ?, color1_price = ?,
        color1_image1 = ?, color1_image2 = ?, color1_image3 = ?, color1_image4 = ?,
        color2 = ?, color2_code = ?, color2_price = ?,
        color2_image1 = ?, color2_image2 = ?, color2_image3 = ?, color2_image4 = ?,
        color3 = ?, color3_code = ?, color3_price = ?,
        color3_image1 = ?, color3_image2 = ?, color3_image3 = ?, color3_image4 = ?,
        color4 = ?, color4_code = ?, color4_price = ?,
        color4_image1 = ?, color4_image2 = ?, color4_image3 = ?, color4_image4 = ?,
        size1 = ?, size1_price = ?, size2 = ?, size2_price = ?,
        size3 = ?, size3_price = ?, size4 = ?, size4_price = ?,
        profit = ?, warehouse = ?, zone = ?, limit_per_user_total = ?,
        limit_updated_at = ?,
        sub_category_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      name || currentProduct.name,
      category || currentProduct.category,
      price !== undefined ? parseFloat(price) : currentProduct.price,
      brand !== undefined ? brand : currentProduct.brand,
      description !== undefined ? description : currentProduct.description,
      discount !== undefined ? discount : currentProduct.discount,
      rating !== undefined ? parseFloat(rating) : currentProduct.rating,
      reviews !== undefined ? parseInt(reviews) : currentProduct.reviews,
      stock !== undefined ? parseInt(stock) : currentProduct.stock,
      mainImageUrl,
      color1 !== undefined ? color1 : currentProduct.color1,
      color1_code !== undefined ? color1_code : currentProduct.color1_code,
      color1_price !== undefined ? (parseFloat(color1_price) || null) : currentProduct.color1_price,
      c1_img1, c1_img2, c1_img3, c1_img4,
      color2 !== undefined ? color2 : currentProduct.color2,
      color2_code !== undefined ? color2_code : currentProduct.color2_code,
      color2_price !== undefined ? (parseFloat(color2_price) || null) : currentProduct.color2_price,
      c2_img1, c2_img2, c2_img3, c2_img4,
      color3 !== undefined ? color3 : currentProduct.color3,
      color3_code !== undefined ? color3_code : currentProduct.color3_code,
      color3_price !== undefined ? (parseFloat(color3_price) || null) : currentProduct.color3_price,
      c3_img1, c3_img2, c3_img3, c3_img4,
      color4 !== undefined ? color4 : currentProduct.color4,
      color4_code !== undefined ? color4_code : currentProduct.color4_code,
      color4_price !== undefined ? (parseFloat(color4_price) || null) : currentProduct.color4_price,
      c4_img1, c4_img2, c4_img3, c4_img4,
      size1 !== undefined ? size1 : currentProduct.size1,
      size1_price !== undefined ? (parseFloat(size1_price) || null) : currentProduct.size1_price,
      size2 !== undefined ? size2 : currentProduct.size2,
      size2_price !== undefined ? (parseFloat(size2_price) || null) : currentProduct.size2_price,
      size3 !== undefined ? size3 : currentProduct.size3,
      size3_price !== undefined ? (parseFloat(size3_price) || null) : currentProduct.size3_price,
      size4 !== undefined ? size4 : currentProduct.size4,
      size4_price !== undefined ? (parseFloat(size4_price) || null) : currentProduct.size4_price,
      profit !== undefined ? parseFloat(profit) : currentProduct.profit,
      warehouse !== undefined ? warehouse : currentProduct.warehouse,
      zone !== undefined ? zone : currentProduct.zone,
      limit_per_user_total !== undefined ? parseInt(limit_per_user_total) : currentProduct.limit_per_user_total,
      limitUpdatedAt,
      sub_category_id !== undefined ? (sub_category_id ? parseInt(sub_category_id) : null) : currentProduct.sub_category_id,
      id
    ];

    await pool.query(sql, values);
    res.json({ message: 'Product updated successfully!', main_image_url: mainImageUrl });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product. Details: ' + error.message });
  }
});

// DELETE a product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT main_image_url FROM products WHERE id = ?', [id]);
    if (rows.length > 0 && rows[0].main_image_url && rows[0].main_image_url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', rows[0].main_image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// POST reset product purchase limits for a customer
router.post('/users/:phone/reset-limits', async (req, res) => {
  const { phone } = req.params;
  try {
    await pool.query(
      'INSERT INTO user_limit_resets (phone, reset_at) VALUES (?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE reset_at = CURRENT_TIMESTAMP',
      [phone]
    );
    res.json({ message: `Product purchase limits reset successfully for customer ${phone}.` });
  } catch (error) {
    console.error('Error resetting product limits:', error);
    res.status(500).json({ error: 'Failed to reset product limits. ' + error.message });
  }
});

// ─── BANNER / PROMO CODES / REVIEWS / ANALYTICS ───────────────────────────────

// GET all promo banners
router.get('/promo-banners', async (req, res) => {
  const onlyActive = req.query.active === 'true';
  try {
    let sql = 'SELECT * FROM promo_banners';
    const params = [];
    if (onlyActive) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY position ASC, id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching promo banners:', error);
    res.status(500).json({ error: 'Failed to retrieve promo banners.' });
  }
});

// POST add a new promo banner
router.post('/promo-banners', upload.single('imageFile'), async (req, res) => {
  try {
    const { restaurant_name, zone, position, is_active, image_url } = req.body;

    let imageUrl = '';
    if (req.file) {
      const firebaseImageUrl = await uploadSingleFileToFirebase(req);
      if (!firebaseImageUrl) {
        return res.status(400).json({ error: 'Failed to upload banner image file.' });
      }
      imageUrl = firebaseImageUrl;
    } else {
      imageUrl = image_url || '';
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Please upload a banner image file or provide a URL.' });
    }

    const pos = parseInt(position) || 1;
    const active = is_active === 'true' || is_active === '1' || is_active === true ? 1 : 0;
    const resto = restaurant_name === 'Global' || restaurant_name === '' ? null : restaurant_name;

    const [result] = await pool.query(
      'INSERT INTO promo_banners (image_url, restaurant_name, zone, position, is_active) VALUES (?, ?, ?, ?, ?)',
      [imageUrl, resto, zone || 'Manapparai', pos, active]
    );

    res.json({
      message: 'Promo banner added successfully.',
      bannerId: result.insertId,
      image_url: imageUrl
    });
  } catch (error) {
    console.error('Error adding promo banner:', error);
    res.status(500).json({ error: 'Failed to add promo banner.' });
  }
});

// DELETE a promo banner
router.delete('/promo-banners/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM promo_banners WHERE id = ?', [id]);
    res.json({ message: 'Promo banner deleted successfully.' });
  } catch (error) {
    console.error('Error deleting promo banner:', error);
    res.status(500).json({ error: 'Failed to delete promo banner.' });
  }
});

// PUT toggle active status of a promo banner
router.put('/promo-banners/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT is_active FROM promo_banners WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Promo banner not found.' });
    }
    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE promo_banners SET is_active = ? WHERE id = ?', [newStatus, id]);
    res.json({ message: 'Promo banner status toggled successfully.', is_active: newStatus });
  } catch (error) {
    console.error('Error toggling promo banner status:', error);
    res.status(500).json({ error: 'Failed to toggle promo banner status.' });
  }
});

// GET all reviews
router.get('/reviews', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// DELETE a review
router.delete('/reviews/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

// GET dashboard analytics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const runQuery = async (sql, params = []) => {
      try {
        const [rows] = await pool.query(sql, params);
        return rows;
      } catch (err) {
        console.error(`Database query failed: ${sql}`, err);
        return [];
      }
    };

    const usersCount = await runQuery('SELECT COUNT(*) as count FROM users');
    const totalUsers = usersCount[0]?.count || 0;

    const foodStats = await runQuery(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as revenue
      FROM food_orders
    `);
    const foodOrdersCount = parseInt(foodStats[0]?.total_count || 0);
    const foodCancelledCount = parseInt(foodStats[0]?.cancelled_count || 0);
    const foodRevenue = parseFloat(foodStats[0]?.revenue || 0);

    const ecomStats = await runQuery(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as revenue
      FROM ecommerce_orders
    `);
    const ecomOrdersCount = parseInt(ecomStats[0]?.total_count || 0);
    const ecomCancelledCount = parseInt(ecomStats[0]?.cancelled_count || 0);
    const ecomRevenue = parseFloat(ecomStats[0]?.revenue || 0);

    const totalOrders = foodOrdersCount + ecomOrdersCount;
    const totalCancelledOrders = foodCancelledCount + ecomCancelledCount;
    const totalRevenue = foodRevenue + ecomRevenue;

    const foodToday = await runQuery(`
      SELECT SUM(total_amount) as revenue FROM food_orders 
      WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE()
    `);
    const ecomToday = await runQuery(`
      SELECT SUM(total_amount) as revenue FROM ecommerce_orders 
      WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE()
    `);
    const dayRevenue = parseFloat(foodToday[0]?.revenue || 0) + parseFloat(ecomToday[0]?.revenue || 0);

    const foodWeekly = await runQuery(`
      SELECT SUM(total_amount) as revenue FROM food_orders 
      WHERE status = 'delivered' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const ecomWeekly = await runQuery(`
      SELECT SUM(total_amount) as revenue FROM ecommerce_orders 
      WHERE status = 'delivered' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const weeklyIncome = parseFloat(foodWeekly[0]?.revenue || 0) + parseFloat(ecomWeekly[0]?.revenue || 0);

    const avgOrderVal = await runQuery(`
      SELECT AVG(total_amount) as avg_val FROM (
        SELECT total_amount FROM food_orders WHERE status = 'delivered'
        UNION ALL
        SELECT total_amount FROM ecommerce_orders WHERE status = 'delivered'
      ) as combined
    `);
    const averageOrderValue = parseFloat(avgOrderVal[0]?.avg_val || 0);

    const foodItemsRows = await runQuery('SELECT items FROM food_orders ORDER BY id DESC LIMIT 100');
    const ecomItemsRows = await runQuery('SELECT items FROM ecommerce_orders ORDER BY id DESC LIMIT 100');
    
    let totalItemQty = 0;
    let totalOrderCountForAvg = 0;
    const parseAndCount = (rows) => {
      for (const r of rows) {
        if (!r.items) continue;
        try {
          const itemsList = typeof r.items === 'string' ? JSON.parse(r.items) : r.items;
          if (Array.isArray(itemsList)) {
            totalOrderCountForAvg++;
            for (const item of itemsList) {
              totalItemQty += parseInt(item.quantity || item.qty || 1);
            }
          }
        } catch {}
      }
    };
    parseAndCount(foodItemsRows);
    parseAndCount(ecomItemsRows);
    const averageItemsPerOrder = totalOrderCountForAvg > 0 ? parseFloat((totalItemQty / totalOrderCountForAvg).toFixed(1)) : 0;

    const graphRows = await runQuery(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') as date_str,
        COUNT(*) as order_count,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN type = 'food' AND status = 'delivered' THEN total_amount ELSE 0 END) as food_revenue,
        SUM(CASE WHEN type = 'ecommerce' AND status = 'delivered' THEN total_amount ELSE 0 END) as ecom_revenue
      FROM (
        SELECT created_at, status, total_amount, 'food' as type FROM food_orders
        UNION ALL
        SELECT created_at, status, total_amount, 'ecommerce' as type FROM ecommerce_orders
      ) as combined
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    const recentOrders = await runQuery(`
      SELECT * FROM (
        SELECT id, 'Food' as type, customer_name, customer_phone, total_amount, status, created_at, restaurant_name as source
        FROM food_orders
        UNION ALL
        SELECT id, 'Ecommerce' as type, customer_name, customer_phone, total_amount, status, created_at, warehouse as source
        FROM ecommerce_orders
      ) as combined_recent
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      totalUsers,
      totalOrders,
      foodOrdersCount,
      ecomOrdersCount,
      totalCancelledOrders,
      totalRevenue,
      dayRevenue,
      weeklyIncome,
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      averageItemsPerOrder,
      graphData: graphRows,
      recentOrders
    });
  } catch (error) {
    console.error('Error in /api/analytics/dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics dashboard data.' });
  }
});

// GET day by day revenue reports
router.get('/analytics/revenue', async (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const runQuery = async (sql, params = []) => {
      try {
        const [rows] = await pool.query(sql, params);
        return rows;
      } catch (err) {
        console.error(`Database query failed: ${sql}`, err);
        return [];
      }
    };

    const foods = await runQuery('SELECT name, profit, category FROM food_items');
    const products = await runQuery('SELECT name, profit, category FROM products');
    
    const profitMap = {};
    const categoryMap = {};
    
    foods.forEach(f => { 
      profitMap[f.name] = parseFloat(f.profit) || 0; 
      categoryMap[f.name] = f.category || 'Food';
    });
    products.forEach(p => { 
      profitMap[p.name] = parseFloat(p.profit) || 0; 
      categoryMap[p.name] = p.category || 'Grocery';
    });

    const foodOrders = await runQuery(
      `SELECT id, customer_name, customer_phone, items, total_amount, status, created_at, 
              restaurant_name, delivery_charges, restaurant_earnings, driver_order_earnings 
       FROM food_orders 
       WHERE DATE(created_at) = ?`,
      [targetDate]
    );

    const ecomOrders = await runQuery(
      `SELECT id, customer_name, customer_phone, items, total_amount, status, created_at, 
              warehouse, delivery_charges, restaurant_earnings, driver_order_earnings 
       FROM ecommerce_orders 
       WHERE DATE(created_at) = ?`,
      [targetDate]
    );

    const allOrders = [
      ...foodOrders.map(o => ({ ...o, type: 'Food', source: o.restaurant_name })),
      ...ecomOrders.map(o => ({ ...o, type: 'Ecommerce', source: o.warehouse || 'Warehouse' }))
    ];

    let totalAmount = 0;
    let itemAmountWithoutDelivery = 0;
    let totalDeliveryCharges = 0;
    let companyProfit = 0;
    let adminEarnings = 0;
    let driverEarningsTotal = 0;
    let restaurantEarningsTotal = 0;

    const restaurantProfits = {};
    const categoryProfits = {};

    allOrders.forEach(order => {
      let itemsList = [];
      try {
        itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch {}
      if (!Array.isArray(itemsList)) itemsList = [];

      let orderItemCount = 0;
      let orderProfit = 0;

      itemsList.forEach(item => {
        const qty = parseInt(item.quantity || item.qty || 1);
        const name = item.name || item.product_name;
        const profitPerUnit = parseFloat(item.profit) || profitMap[name] || 0;
        const itemProfit = profitPerUnit * qty;
        orderProfit += itemProfit;
        orderItemCount += qty;

        if (order.status === 'delivered') {
          const category = item.category || categoryMap[name] || (order.type === 'Food' ? 'Food' : 'Grocery');
          if (!categoryProfits[category]) {
            categoryProfits[category] = { category, qty: 0, revenue: 0, profit: 0 };
          }
          const price = parseFloat(item.price || item.current_price || 0);
          categoryProfits[category].qty += qty;
          categoryProfits[category].revenue += price * qty;
          categoryProfits[category].profit += itemProfit;
        }
      });

      order.calculatedProfit = orderProfit;
      order.itemCount = orderItemCount;

      if (order.status === 'delivered') {
        const amt = parseFloat(order.total_amount) || 0;
        const delCharge = parseFloat(order.delivery_charges) || 0;
        const restEarn = parseFloat(order.restaurant_earnings) || 0;
        const drvEarn = parseFloat(order.driver_order_earnings) || 0;

        totalAmount += amt;
        totalDeliveryCharges += delCharge;
        itemAmountWithoutDelivery += (amt - delCharge);
        companyProfit += orderProfit;
        
        const adminEarn = amt - restEarn - drvEarn;
        adminEarnings += adminEarn;
        restaurantEarningsTotal += restEarn;
        driverEarningsTotal += drvEarn;

        const sourceName = order.source || (order.type === 'Food' ? 'Unknown Restaurant' : 'Warehouse');
        if (!restaurantProfits[sourceName]) {
          restaurantProfits[sourceName] = { 
            name: sourceName, 
            orderCount: 0, 
            itemCount: 0, 
            restaurantEarnings: 0, 
            companyProfit: 0 
          };
        }
        restaurantProfits[sourceName].orderCount += 1;
        restaurantProfits[sourceName].itemCount += orderItemCount;
        restaurantProfits[sourceName].restaurantEarnings += restEarn;
        restaurantProfits[sourceName].companyProfit += orderProfit;
      }
    });

    const historyRows = await runQuery(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date_str,
             SUM(total_amount) as revenue,
             COUNT(*) as order_count
      FROM (
        SELECT created_at, total_amount, status FROM food_orders
        UNION ALL
        SELECT created_at, total_amount, status FROM ecommerce_orders
      ) as combined
      WHERE status = 'delivered' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date_str DESC
    `);

    res.json({
      date: targetDate,
      summary: {
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        itemAmountWithoutDelivery: parseFloat(itemAmountWithoutDelivery.toFixed(2)),
        totalDeliveryCharges: parseFloat(totalDeliveryCharges.toFixed(2)),
        companyProfit: parseFloat(companyProfit.toFixed(2)),
        adminEarnings: parseFloat(adminEarnings.toFixed(2)),
        driverEarningsTotal: parseFloat(driverEarningsTotal.toFixed(2)),
        restaurantEarningsTotal: parseFloat(restaurantEarningsTotal.toFixed(2))
      },
      orders: allOrders,
      restaurants: Object.values(restaurantProfits).map(r => ({
        ...r,
        restaurantEarnings: parseFloat(r.restaurantEarnings.toFixed(2)),
        companyProfit: parseFloat(r.companyProfit.toFixed(2))
      })),
      categories: Object.values(categoryProfits).map(c => ({
        ...c,
        revenue: parseFloat(c.revenue.toFixed(2)),
        profit: parseFloat(c.profit.toFixed(2))
      })),
      history: historyRows
    });
  } catch (error) {
    console.error('Error fetching revenue reports:', error);
    res.status(500).json({ error: 'Failed to retrieve revenue reports. ' + error.message });
  }
});

// GET all promo codes
router.get('/promo-codes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM promo_codes ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ error: 'Failed to retrieve promo codes.' });
  }
});

// POST create a promo code
router.post('/promo-codes', async (req, res) => {
  const {
    code,
    description,
    is_active,
    discount_type,
    discount_value,
    max_discount_cap,
    free_shipping,
    global_max_usage,
    per_user_max_usage,
    min_order_amount,
    valid_from,
    valid_until,
    applicable_categories,
    applicable_restaurants
  } = req.body;

  if (!code || !discount_value) {
    return res.status(400).json({ error: 'Promo code and discount value are required.' });
  }

  try {
    const isActiveVal = is_active === true || is_active === 'true' || is_active === 1 ? 1 : 0;
    const freeShippingVal = free_shipping === true || free_shipping === 'true' || free_shipping === 1 ? 1 : 0;

    const fromDate = valid_from ? new Date(valid_from) : new Date();
    const untilDate = valid_until ? new Date(valid_until) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const categoriesJson = applicable_categories ? (typeof applicable_categories === 'string' ? applicable_categories : JSON.stringify(applicable_categories)) : null;
    const restaurantsJson = applicable_restaurants ? (typeof applicable_restaurants === 'string' ? applicable_restaurants : JSON.stringify(applicable_restaurants)) : null;

    const query = `
      INSERT INTO promo_codes (
        code, description, is_active, discount_type, discount_value, max_discount_cap,
        free_shipping, global_max_usage, per_user_max_usage, min_order_amount,
        valid_from, valid_until, applicable_categories, applicable_restaurants
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      code.toUpperCase().trim(),
      description || null,
      isActiveVal,
      discount_type || 'percentage',
      parseFloat(discount_value) || 0.00,
      max_discount_cap !== null && max_discount_cap !== '' ? parseFloat(max_discount_cap) : null,
      freeShippingVal,
      global_max_usage !== null && global_max_usage !== '' ? parseInt(global_max_usage) : null,
      per_user_max_usage !== null && per_user_max_usage !== '' ? parseInt(per_user_max_usage) : null,
      min_order_amount !== null && min_order_amount !== '' ? parseFloat(min_order_amount) : 0.00,
      fromDate,
      untilDate,
      categoriesJson,
      restaurantsJson
    ];

    const [result] = await pool.query(query, values);
    res.status(201).json({
      message: 'Promo code created successfully!',
      id: result.insertId,
      code: code.toUpperCase().trim()
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: `Promo code '${code}' already exists.` });
    } else {
      res.status(500).json({ error: 'Failed to create promo code. ' + error.message });
    }
  }
});

// PUT toggle active status of a promo code
router.put('/promo-codes/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT is_active FROM promo_codes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }
    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE promo_codes SET is_active = ? WHERE id = ?', [newStatus, id]);
    res.json({ message: 'Promo code status toggled.', is_active: newStatus });
  } catch (error) {
    console.error('Error toggling promo code status:', error);
    res.status(500).json({ error: 'Failed to toggle promo code status.' });
  }
});

// DELETE a promo code
router.delete('/promo-codes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM promo_codes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }
    res.json({ message: 'Promo code deleted successfully.' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ error: 'Failed to delete promo code.' });
  }
});

// POST admin login
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username === expectedUsername && password === expectedPassword) {
    return res.json({ 
      success: true, 
      token: 'foodzy-admin-secret-session-token' 
    });
  } else {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
});

// Log client-side runtime errors to disk for diagnosis
router.post('/log-client-error', (req, res) => {
  try {
    const { error, stack, url } = req.body;
    const logMessage = `[Client Error] ${new Date().toISOString()}\nURL: ${url}\nError: ${error}\nStack: ${stack}\n\n----------------------------------------\n`;
    fs.appendFileSync(path.join(__dirname, '..', 'client_error.log'), logMessage);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ─── E-COMMERCE SUBCATEGORIES, ZONES, NOTIFICATIONS ──────────────────────────

// GET product categories
router.get('/product-categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY position ASC, id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// POST create product category
router.post('/product-categories', async (req, res) => {
  const { name, position } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const pos = parseInt(position) || 1;
    const [result] = await pool.query('INSERT INTO product_categories (name, position) VALUES (?, ?)', [name, pos]);
    res.status(201).json({ id: result.insertId, name, position: pos });
  } catch (error) {
    console.error('Error creating product category:', error);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT update product category
router.put('/product-categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, position } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (position !== undefined) { fields.push('position = ?'); values.push(parseInt(position) || 1); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    values.push(id);
    const [result] = await pool.query(`UPDATE product_categories SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found.' });
    res.json({ message: 'Category updated successfully.' });
  } catch (error) {
    console.error('Error updating product category:', error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE product category
router.delete('/product-categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM product_categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// GET subcategories
router.get('/sub-categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sub_categories ORDER BY position ASC, id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to retrieve subcategories.' });
  }
});

// POST create subcategory
router.post('/sub-categories', async (req, res) => {
  const { name, product_category_id, position } = req.body;
  if (!name || !product_category_id) return res.status(400).json({ error: 'Subcategory name and parent category ID are required.' });
  try {
    const pos = parseInt(position) || 1;
    const [result] = await pool.query('INSERT INTO sub_categories (name, product_category_id, position) VALUES (?, ?, ?)', [name, parseInt(product_category_id), pos]);
    res.status(201).json({ id: result.insertId, name, product_category_id, position: pos });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Failed to create subcategory.' });
  }
});

// PUT update subcategory
router.put('/sub-categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, product_category_id, position } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (product_category_id !== undefined) { fields.push('product_category_id = ?'); values.push(parseInt(product_category_id)); }
    if (position !== undefined) { fields.push('position = ?'); values.push(parseInt(position) || 1); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    values.push(id);
    const [result] = await pool.query(`UPDATE sub_categories SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Subcategory not found.' });
    res.json({ message: 'Subcategory updated successfully.' });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Failed to update subcategory.' });
  }
});

// DELETE subcategory
router.delete('/sub-categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sub_categories WHERE id = ?', [id]);
    res.json({ message: 'Subcategory deleted successfully.' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Failed to delete subcategory.' });
  }
});

// GET zones
router.get('/zones', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM zones ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to retrieve zones.' });
  }
});

// POST create zone
router.post('/zones', async (req, res) => {
  const { name, delivery_charges } = req.body;
  if (!name) return res.status(400).json({ error: 'Zone name is required.' });
  try {
    const charge = parseFloat(delivery_charges) || 0.00;
    const [result] = await pool.query('INSERT INTO zones (name, delivery_charges) VALUES (?, ?)', [name, charge]);
    res.status(201).json({ id: result.insertId, name, delivery_charges: charge });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ error: 'Failed to create zone.' });
  }
});

// PUT update zone
router.put('/zones/:id', async (req, res) => {
  const { id } = req.params;
  const { name, delivery_charges } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (delivery_charges !== undefined) { fields.push('delivery_charges = ?'); values.push(parseFloat(delivery_charges) || 0.00); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    values.push(id);
    const [result] = await pool.query(`UPDATE zones SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Zone not found.' });
    res.json({ message: 'Zone updated successfully.' });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ error: 'Failed to update zone.' });
  }
});

// DELETE zone
router.delete('/zones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM zones WHERE id = ?', [id]);
    res.json({ message: 'Zone deleted successfully.' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Failed to delete zone.' });
  }
});

// POST send notifications (FCM)
router.post('/notifications/send', async (req, res) => {
  const { title, body, topic, zone } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });
  
  try {
    if (admin.apps.length === 0) {
      return res.status(500).json({ error: 'Firebase Admin SDK not initialized.' });
    }

    let targetTokens = [];
    let recipientDesc = '';

    if (topic === 'all') {
      const [rows] = await pool.query('SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL');
      targetTokens = rows.map(r => r.fcm_token);
      recipientDesc = 'All Registered Users';
    } else if (topic === 'zone' && zone) {
      const [rows] = await pool.query('SELECT fcm_token FROM users WHERE zone_name = ? AND fcm_token IS NOT NULL', [zone]);
      targetTokens = rows.map(r => r.fcm_token);
      recipientDesc = `Zone: ${zone}`;
    }

    if (targetTokens.length === 0) {
      return res.status(400).json({ error: 'No recipient tokens found.' });
    }

    const messages = targetTokens.map(token => ({
      token,
      notification: { title, body },
      android: { priority: 'high' }
    }));

    let successCount = 0;
    for (const msg of messages) {
      try {
        await admin.messaging().send(msg);
        successCount++;
      } catch (err) {
        console.error('Failed to send message to token:', msg.token, err.message);
      }
    }

    await pool.query(
      'INSERT INTO notification_logs (title, body, target_group, success_count, total_count) VALUES (?, ?, ?, ?, ?)',
      [title, body, recipientDesc, successCount, targetTokens.length]
    );

    res.json({ message: 'Notifications sent successfully!', successCount, totalCount: targetTokens.length });
  } catch (error) {
    console.error('Notification dispatch error:', error);
    res.status(500).json({ error: 'Failed to dispatch notifications. ' + error.message });
  }
});

// GET notification logs
router.get('/notifications/logs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notification_logs ORDER BY id DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    res.status(500).json({ error: 'Failed to retrieve notification logs.' });
  }
});

// Error handling middleware local to router
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
