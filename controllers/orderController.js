const db = require('../config/db');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Helper function to check if a user has exceeded the lifetime limit for a food item.
 */
const checkFoodItemLimit = (userMobile, productId, requestedQuantity) => {
    return new Promise((resolve, reject) => {
        if (!userMobile) {
            return resolve({ allowed: true });
        }
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
 * Verify Razorpay Signature
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || secret === 'your_key_secret' || signature === 'mock_signature') {
        console.log('⚠️ Bypassing Razorpay signature verification (Dev Mode / Mock Signature)');
        return true;
    }

    const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(orderId + "|" + paymentId)
        .digest('hex');

    return generated_signature === signature;
};

/**
 * Controller to verify payment and create orders
 */
exports.verifyPaymentAndCreateOrder = async (req, res) => {
    const startTime = Date.now();
    console.log('--- Payment Verification Request Received ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Size:', JSON.stringify(req.body).length, 'bytes');

    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        orderPayloads, 
        payment_method 
    } = req.body;

    try {
        // 1. If it's an online payment, verify the signature and check for existing orders
        if (payment_method === 'Online Payment') {
            console.log('🔐 Verifying Razorpay signature for Online Payment...');
            
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                console.error('❌ Missing Razorpay payment details in request body');
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing payment verification details (order_id, payment_id, or signature)' 
                });
            }

            const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            
            if (!isValid) {
                console.error('❌ Razorpay signature verification failed');
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid payment signature. Verification failed.' 
                });
            }
            console.log('✅ Razorpay signature verified successfully');

            // IDEMPOTENCY CHECK: Check if orders already exist for this payment
            console.log(`🔍 Checking if orders already exist for payment ${razorpay_payment_id}...`);
            try {
                const existingOrders = await new Promise((resolve, reject) => {
                    db.query(
                        'SELECT id FROM food_orders WHERE razorpay_payment_id = ?',
                        [razorpay_payment_id],
                        (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        }
                    );
                });

                if (existingOrders && existingOrders.length > 0) {
                    console.log(`⚠️ Orders already exist for payment ${razorpay_payment_id}. Returning existing IDs.`);
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Orders already exist', 
                        orders: existingOrders.map(row => ({ id: row.id })),
                        isDuplicate: true
                    });
                }
            } catch (checkError) {
                console.error('❌ Database query error during duplicate check:', checkError.message);
                return res.status(500).json({
                    success: false,
                    message: 'Error checking duplicate orders in database',
                    error: checkError.message
                });
            }
        } else {
            console.log(`ℹ️ Processing ${payment_method} - skipping signature verification`);
        }

        // 2. Validate order payloads
        if (!orderPayloads || !Array.isArray(orderPayloads) || orderPayloads.length === 0) {
            console.error('❌ No order payloads provided in request');
            return res.status(400).json({ success: false, message: 'No order data provided' });
        }

        // 2.5 Resolve user details (name, phone, numeric user_id) from users table
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
                        console.log(`👤 Resolved user in database: ID=${user.id}, Name=${user.name}, Phone=${user.mobile}`);
                        mysqlPayload.user_id = String(user.id);
                        mysqlPayload.customer_name = user.name;
                        mysqlPayload.customer_phone = user.mobile;
                    } else {
                        console.log(`⚠️ User not found in database for ID/Token: ${mysqlPayload.user_id}. Using payload defaults.`);
                    }
                } catch (userErr) {
                    console.error('⚠️ Error fetching user details from database:', userErr.message);
                }
            }
            resolvedPayloads.push(mysqlPayload);
        }

        // 2.7 Enforce food purchase limits
        for (const payload of resolvedPayloads) {
            if (payload.items && Array.isArray(payload.items)) {
                for (const item of payload.items) {
                    if (payload.customer_phone) {
                        const limitCheck = await checkFoodItemLimit(
                            payload.customer_phone,
                            parseInt(item.id),
                            parseInt(item.quantity)
                        );
                        if (!limitCheck.allowed) {
                            console.error(`❌ Order limit check failed: ${limitCheck.message}`);
                            return res.status(400).json({
                                success: false,
                                message: limitCheck.message
                            });
                        }
                    }
                }
            }
        }

        // 3. Prepare payloads (ensure payment_verified and correct status)
        const enhancedPayloads = resolvedPayloads.map(payload => {
            if (payment_method === 'Online Payment') {
                return {
                    ...payload,
                    status: 'paid',
                    payment_verified: true,
                    razorpay_payment_id: razorpay_payment_id,
                    razorpay_order_id: razorpay_order_id,
                    razorpay_signature: razorpay_signature,
                    payment_completed_at: new Date()
                };
            }
            return payload;
        });

        console.log(`📦 Attempting to insert ${enhancedPayloads.length} orders into MySQL...`);
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

                const sql = `INSERT INTO food_orders (${columns}) VALUES (${placeholders})`;
                const result = await new Promise((resolve, reject) => {
                    db.query(sql, values, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
                insertedOrders.push({ id: result.insertId });
            }
            console.log('✅ Orders inserted successfully into MySQL database');

            // Automatically clear the user's cart from food_cart_items
            const customerMobile = enhancedPayloads[0]?.customer_phone;
            if (customerMobile) {
                console.log(`🧹 Clearing food_cart_items for user_mobile: ${customerMobile}`);
                db.query("DELETE FROM food_cart_items WHERE user_mobile = ?", [customerMobile], (clearErr) => {
                    if (clearErr) {
                        console.error(`❌ Error clearing cart for user mobile ${customerMobile}:`, clearErr.message);
                    } else {
                        console.log(`✅ Cart cleared successfully for user mobile ${customerMobile}`);
                    }
                });
            }
        } catch (mysqlErr) {
            const endTime = Date.now();
            console.error(`❌ MySQL Database Insert Error after ${endTime - startTime}ms:`, mysqlErr.message);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to create orders in database', 
                error: mysqlErr.message 
            });
        }

        const endTime = Date.now();
        console.log(`✅ Orders created successfully in MySQL (${endTime - startTime}ms)`);
        
        return res.status(200).json({ 
            success: true, 
            message: 'Orders created successfully', 
            orders: insertedOrders 
        });

    } catch (error) {
        const endTime = Date.now();
        console.error(`❌ Unexpected Error after ${endTime - startTime}ms:`, error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during order creation', 
            error: error.message 
        });
    }
};

/**
 * Controller to get order history for a user (by numeric user_id or jwt_token)
 */
exports.getUserOrders = async (req, res) => {
    const { userIdOrToken } = req.params;

    if (!userIdOrToken) {
        return res.status(400).json({ success: false, message: 'Missing user identifier' });
    }

    try {
        // First resolve the numeric ID if a JWT token is passed
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

        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        // Query the food_orders table for this user with pagination
        const foodOrders = await new Promise((resolve, reject) => {
            db.query(
                `SELECT fo.*, r.rating AS review_rating, r.comment AS review_comment 
                 FROM food_orders fo 
                 LEFT JOIN reviews r ON fo.id = r.order_id AND r.is_ecommerce = 0
                 WHERE fo.user_id = ?
                 ORDER BY fo.created_at DESC
                 LIMIT ? OFFSET ?`,
                [numericId, limit, offset],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        // Query the ecommerce_orders table for this user with pagination
        const ecommerceOrders = await new Promise((resolve, reject) => {
            db.query(
                `SELECT eo.*, r.rating AS review_rating, r.comment AS review_comment 
                 FROM ecommerce_orders eo 
                 LEFT JOIN reviews r ON eo.id = r.order_id AND r.is_ecommerce = 1
                 WHERE eo.user_id = ?
                 ORDER BY eo.created_at DESC
                 LIMIT ? OFFSET ?`,
                [numericId, limit, offset],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        // Map is_ecommerce flag to indicate order type
        const mappedFood = foodOrders.map(o => ({ ...o, is_ecommerce: false }));
        const mappedEcommerce = ecommerceOrders.map(o => ({ ...o, is_ecommerce: true }));

        // Merge both arrays and sort by created_at DESC
        const mergedOrders = [...mappedFood, ...mappedEcommerce].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Paginate the combined merged array
        const paginatedOrders = mergedOrders.slice(0, limit);

        return res.status(200).json({
            success: true,
            page,
            limit,
            orders: paginatedOrders
        });
    } catch (error) {
        console.error('❌ Error fetching user orders:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching order history',
            error: error.message
        });
    }
};

/**
 * Controller to get a single order by its ID
 */
exports.getOrderById = async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Missing order ID' });
    }

    try {
        let order = await new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM food_orders WHERE id = ? LIMIT 1',
                [orderId],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0]);
                }
            );
        });

        if (order) {
            order.is_ecommerce = false;
        } else {
            // Try fetching from ecommerce_orders
            order = await new Promise((resolve, reject) => {
                db.query(
                    'SELECT * FROM ecommerce_orders WHERE id = ? LIMIT 1',
                    [orderId],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results[0]);
                    }
                );
            });
            if (order) {
                order.is_ecommerce = true;
            }
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        return res.status(200).json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('❌ Error fetching order by ID:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching order details',
            error: error.message
        });
    }
};

