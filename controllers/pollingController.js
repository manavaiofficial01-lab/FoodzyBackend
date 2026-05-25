const db = require("../config/db");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already done
if (admin.apps.length === 0) {
  try {
    const fs = require("fs");
    const path = require("path");
    const serviceAccountPath = path.join(__dirname, "../config/firebaseServiceAccount.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("[FCM] Firebase Admin SDK initialized successfully for vendor app.");
    } else {
      console.warn("[FCM] Firebase service account file (firebaseServiceAccount.json) not found. FCM notifications are disabled.");
    }
  } catch (error) {
    console.error("[FCM] Error initializing Firebase Admin SDK:", error.message);
  }
}

// In-memory set to prevent duplicate push notifications for the same orders
const notifiedOrders = new Set();

const sendPushToVendor = async (restaurantName, orderData, isEcommerce) => {
  return new Promise((resolve) => {
    if (admin.apps.length === 0) {
      console.log(`[FCM] Skip sending notification to "${restaurantName}" - Firebase Admin SDK not initialized.`);
      return resolve(false);
    }
    // Find restaurant's FCM token
    db.query(
      "SELECT id, fcm_token FROM restaurants WHERE name = ? LIMIT 1",
      [restaurantName],
      async (err, results) => {
        if (err) {
          console.error(`[FCM] DB error looking up restaurant "${restaurantName}":`, err.message);
          return resolve(false);
        }
        if (results.length === 0 || !results[0].fcm_token) {
          console.log(`[FCM] No FCM token registered for restaurant "${restaurantName}". Skipping notification.`);
          return resolve(false);
        }

        const fcmToken = results[0].fcm_token;
        console.log(`[FCM] Sending push alert to "${restaurantName}" (Token: ${fcmToken})`);

        // Prepare message payload
        const message = {
          token: fcmToken,
          data: {
            type: "NEW_ORDER",
            orderId: String(orderData.id),
            isEcommerce: isEcommerce ? "true" : "false",
            customerName: String(orderData.customer_name),
            totalAmount: String(orderData.total_amount),
            items: typeof orderData.items === "string" ? orderData.items : JSON.stringify(orderData.items),
            deliveryAddress: String(orderData.delivery_address)
          },
          android: {
            priority: "high"
          }
        };

        try {
          const response = await admin.messaging().send(message);
          console.log(`[FCM] Notification sent successfully to "${restaurantName}":`, response);
          resolve(true);
        } catch (fcmErr) {
          console.error(`[FCM] Error sending push to "${restaurantName}":`, fcmErr.message);
          resolve(false);
        }
      }
    );
  });
};

const pollDatabase = () => {
  // Query both food_orders and ecommerce_orders for customer_verified = 1 and vendor_accepted is null/0
  const foodQuery = `
    SELECT id, customer_name, total_amount, items, delivery_address, restaurant_name, customer_verified, vendor_accepted 
    FROM food_orders 
    WHERE customer_verified = 1 AND (vendor_accepted = 0 OR vendor_accepted IS NULL)
  `;

  const ecommerceQuery = `
    SELECT id, customer_name, total_amount, items, delivery_address, restaurant_name, customer_verified, vendor_accepted 
    FROM ecommerce_orders 
    WHERE customer_verified = 1 AND (vendor_accepted = 0 OR vendor_accepted IS NULL)
  `;

  // 1. Check food_orders
  db.query(foodQuery, async (err, results) => {
    if (err) {
      console.error("[Polling] Error checking food_orders:", err.message);
      return;
    }

    for (const order of results) {
      const orderKey = `food_${order.id}`;
      if (!notifiedOrders.has(orderKey)) {
        const success = await sendPushToVendor(order.restaurant_name, order, false);
        if (success) {
          notifiedOrders.add(orderKey);
        }
      }
    }
  });

  // 2. Check ecommerce_orders
  db.query(ecommerceQuery, async (err, results) => {
    if (err) {
      console.error("[Polling] Error checking ecommerce_orders:", err.message);
      return;
    }

    for (const order of results) {
      const orderKey = `ecommerce_${order.id}`;
      if (!notifiedOrders.has(orderKey)) {
        const success = await sendPushToVendor(order.restaurant_name, order, true);
        if (success) {
          notifiedOrders.add(orderKey);
        }
      }
    }
  });
};

// Start Polling Interval (every 3 seconds)
exports.startPolling = () => {
  console.log("[Polling] Started database polling for customer_verified orders...");
  setInterval(pollDatabase, 3000);
};
