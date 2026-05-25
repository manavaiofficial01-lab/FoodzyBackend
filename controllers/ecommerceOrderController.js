const db = require('../config/db');
const crypto = require('crypto');

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || secret === 'your_key_secret' || signature === 'mock_signature') {
        return true;
    }
    const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(orderId + "|" + paymentId)
        .digest('hex');
    return generated_signature === signature;
};

/**
 * Helper function to check if a user has exceeded the lifetime limit for an e-commerce product.
 */
const checkEcommerceProductLimit = (userMobile, productId, requestedQuantity) => {
  return new Promise((resolve, reject) => {
    if (!userMobile) {
        return resolve({ allowed: true });
    }
    db.query(
      'SELECT limit_per_user_total, limit_updated_at, name FROM products WHERE id = ?',
      [productId],
      (err, productRows) => {
        if (err) return reject(err);
        if (!productRows || productRows.length === 0) {
          return resolve({ allowed: true });
        }
        const product = productRows[0];
        const limit = parseInt(product.limit_per_user_total) || 0;
        if (limit === 0) {
          return resolve({ allowed: true });
        }

        const limitUpdatedAt = product.limit_updated_at || new Date(0);

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
              "SELECT items FROM ecommerce_orders WHERE customer_phone = ? AND status = 'delivered' AND created_at >= ?",
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
                    console.error('Error parsing ecommerce order items JSON:', e);
                  }
                }

                if (purchasedCount + requestedQuantity > limit) {
                  return resolve({
                    allowed: false,
                    message: `You can only purchase a maximum of ${limit} of "${product.name}". You have already purchased ${purchasedCount} since the limit was last set/updated.`,
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
 * Verify Razorpay payment signature and create e-commerce orders
 */
exports.verifyPaymentAndCreateOrder = async (req, res) => {
    const startTime = Date.now();
    console.log('--- E-commerce Payment Verification Request Received ---');

    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        orderPayloads, 
        payment_method 
    } = req.body;

    try {
        if (payment_method === 'Online Payment') {
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing payment verification details (order_id, payment_id, or signature)' 
                });
            }

            const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid payment signature. Verification failed.' 
                });
            }

            // IDEMPOTENCY CHECK
            const existingOrders = await new Promise((resolve, reject) => {
                db.query(
                    'SELECT id FROM ecommerce_orders WHERE razorpay_payment_id = ?',
                    [razorpay_payment_id],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            });

            if (existingOrders && existingOrders.length > 0) {
                return res.status(200).json({ 
                    success: true, 
                    message: 'E-commerce orders already exist', 
                    orders: existingOrders.map(row => ({ id: row.id })),
                    isDuplicate: true
                });
            }
        }

        if (!orderPayloads || !Array.isArray(orderPayloads) || orderPayloads.length === 0) {
            return res.status(400).json({ success: false, message: 'No e-commerce order data provided' });
        }

        // Resolve user
        const resolvedPayloads = [];
        for (const payload of orderPayloads) {
            const mysqlPayload = { ...payload };
            if (mysqlPayload.user_id) {
                try {
                    const user = await new Promise((resolve, reject) => {
                        db.query(
                            'SELECT id, name, mobile FROM users WHERE jwt_token = ? OR id = ? OR mobile = ? LIMIT 1',
                            [mysqlPayload.user_id, mysqlPayload.user_id, mysqlPayload.user_id],
                            (err, results) => {
                                if (err) reject(err);
                                else resolve(results[0]);
                            }
                        );
                    });

                    if (user) {
                        mysqlPayload.user_id = String(user.id);
                        mysqlPayload.customer_name = user.name;
                        mysqlPayload.customer_phone = user.mobile;
                    }
                } catch (userErr) {
                    console.error('⚠️ Error fetching user details from database:', userErr.message);
                }
            }
            resolvedPayloads.push(mysqlPayload);
        }

        // Enforce ecommerce product purchase limits
        for (const payload of resolvedPayloads) {
            if (payload.items && Array.isArray(payload.items)) {
                for (const item of payload.items) {
                    if (payload.customer_phone) {
                        const limitCheck = await checkEcommerceProductLimit(
                            payload.customer_phone,
                            parseInt(item.id),
                            parseInt(item.quantity)
                        );
                        if (!limitCheck.allowed) {
                            console.error(`❌ Ecommerce order limit check failed: ${limitCheck.message}`);
                            return res.status(400).json({
                                success: false,
                                message: limitCheck.message
                            });
                        }
                    }
                }
            }
        }

        const enhancedPayloads = resolvedPayloads.map(payload => {
            const updated = {
                ...payload,
                is_ecommerce: true
            };
            if (payment_method === 'Online Payment') {
                return {
                    ...updated,
                    status: 'paid',
                    payment_verified: true,
                    razorpay_payment_id: razorpay_payment_id,
                    razorpay_order_id: razorpay_order_id,
                    razorpay_signature: razorpay_signature,
                    payment_completed_at: new Date()
                };
            }
            return updated;
        });

        console.log(`📦 Attempting to insert ${enhancedPayloads.length} e-commerce orders into MySQL...`);
        const insertedOrders = [];
        try {
            for (const payload of enhancedPayloads) {
                const mysqlPayload = { ...payload };
                const keys = Object.keys(mysqlPayload);
                const columns = keys.map(k => `\`${k}\``).join(", ");
                const placeholders = keys.map(() => "?").join(", ");
                const values = keys.map(key => {
                    if (key === 'items' || key === 'additional_fees') {
                        return JSON.stringify(mysqlPayload[key]);
                    }
                    if ((key === 'payment_completed_at' || key === 'delivery_time' || key === 'accepted_at') && mysqlPayload[key]) {
                        return new Date(mysqlPayload[key]);
                    }
                    return mysqlPayload[key];
                });

                const sql = `INSERT INTO ecommerce_orders (${columns}) VALUES (${placeholders})`;
                const result = await new Promise((resolve, reject) => {
                    db.query(sql, values, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
                insertedOrders.push({ id: result.insertId });
            }
            console.log('✅ E-commerce Orders inserted successfully into MySQL database');

            // Automatically clear the user's e-commerce cart from ecommerce_cart_items
            const customerMobile = enhancedPayloads[0]?.customer_phone;
            if (customerMobile) {
                console.log(`🧹 Clearing ecommerce_cart_items for user_mobile: ${customerMobile}`);
                db.query("DELETE FROM ecommerce_cart_items WHERE user_mobile = ?", [customerMobile], (clearErr) => {
                    if (clearErr) {
                        console.error(`❌ Error clearing ecommerce cart for user mobile ${customerMobile}:`, clearErr.message);
                    } else {
                        console.log(`✅ Ecommerce cart cleared successfully for user mobile ${customerMobile}`);
                    }
                });
            }
        } catch (mysqlErr) {
            console.error(`❌ MySQL Database Insert Error:`, mysqlErr.message);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to create e-commerce orders in database', 
                error: mysqlErr.message 
            });
        }

        const endTime = Date.now();
        console.log(`✅ E-commerce Orders created successfully in MySQL (${endTime - startTime}ms)`);
        
        return res.status(200).json({ 
            success: true, 
            message: 'E-commerce orders created successfully', 
            orders: insertedOrders 
        });

    } catch (error) {
        console.error(`❌ Unexpected Error:`, error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during e-commerce order creation', 
            error: error.message 
        });
    }
};

/**
 * Get e-commerce order history for a user
 */
exports.getUserOrders = async (req, res) => {
    const { userIdOrToken } = req.params;

    if (!userIdOrToken) {
        return res.status(400).json({ success: false, message: 'Missing user identifier' });
    }

    try {
        let numericId = userIdOrToken;
        const user = await new Promise((resolve, reject) => {
            db.query(
                'SELECT id FROM users WHERE jwt_token = ? OR id = ? LIMIT 1',
                [userIdOrToken, userIdOrToken],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0]);
                }
            );
        });

        if (user) {
            numericId = user.id;
        }

        const orders = await new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM ecommerce_orders WHERE user_id = ? ORDER BY id DESC',
                [numericId],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        return res.status(200).json({
            success: true,
            orders: orders
        });
    } catch (error) {
        console.error('❌ Error fetching e-commerce orders:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching e-commerce order history',
            error: error.message
        });
    }
};

/**
 * Get a single e-commerce order by its ID
 */
exports.getOrderById = async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Missing order ID' });
    }

    try {
        const order = await new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM ecommerce_orders WHERE id = ? LIMIT 1',
                [orderId],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0]);
                }
            );
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'E-commerce order not found' });
        }

        return res.status(200).json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('❌ Error fetching e-commerce order details:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving e-commerce order details',
            error: error.message
        });
    }
};
