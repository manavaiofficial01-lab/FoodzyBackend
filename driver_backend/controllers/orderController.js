const db = require('../../config/dbPromise');


// GET AVAILABLE ORDERS
const getAvailableOrders = async (req, res) => {

  try {

    const driverId = req.user.id;

    // CHECK DRIVER STATUS
    const [drivers] = await db.query(
      `SELECT is_online
       FROM drivers
       WHERE id = ?`,
      [driverId]
    );

    // DRIVER NOT FOUND
    if (drivers.length === 0) {

      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });

    }

    // DRIVER OFFLINE
    if (!drivers[0].is_online) {

      return res.status(400).json({
        success: false,
        message: 'Driver is offline',
      });

    }

    // FETCH AVAILABLE ORDERS
    const [orders] = await db.query(
      `SELECT *
       FROM orders
       WHERE status = 'pending'
       AND assigned_driver_id IS NULL
       ORDER BY id DESC`
    );

    res.status(200).json({

      success: true,

      totalOrders:
        orders.length,

      orders,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        'Server Error',

    });

  }

};


// ACCEPT ORDER
const acceptOrder = async (req, res) => {

  try {

    const driverId = req.user.id;

    const { orderId } =
      req.body;

    // CHECK DRIVER STATUS
    const [drivers] = await db.query(
      `SELECT is_online
       FROM drivers
       WHERE id = ?`,
      [driverId]
    );

    // DRIVER NOT FOUND
    if (drivers.length === 0) {

      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });

    }

    // DRIVER OFFLINE
    if (!drivers[0].is_online) {

      return res.status(400).json({
        success: false,
        message: 'Driver is offline',
      });

    }

    // CHECK ORDER
    const [orders] = await db.query(
      `SELECT *
       FROM orders
       WHERE id = ?
       AND status = 'pending'
       AND assigned_driver_id IS NULL`,
      [orderId]
    );

    // ORDER ALREADY ASSIGNED
    if (orders.length === 0) {

      return res.status(400).json({
        success: false,
        message: 'Order already assigned',
      });

    }

    // ASSIGN ORDER
    const otp =

Math.floor(

  1000 +

  Math.random() * 9000

);


await db.query(

  `UPDATE orders

   SET

   status = 'assigned',

   assigned_driver_id = ?,

   delivery_otp = ?

   WHERE id = ?`,

  [

    driverId,

    otp,

    orderId,

  ]

);

    res.status(200).json({

      success: true,

      message:
        'Order Accepted Successfully',

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        'Server Error',

    });

  }

};


// GET ACTIVE ORDER
const getActiveOrder = async (req, res) => {
  try {
    const driverId = req.user.id;

    // Get driver phone number
    const [drivers] = await db.query(
      'SELECT phone FROM drivers WHERE id = ?',
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }
    const driverPhone = drivers[0].phone;
    


    // Fetch active food order
    const foodSql = `
      SELECT 
        fo.id, fo.customer_name, fo.customer_phone, fo.restaurant_name, 
        fo.delivery_address, fo.total_amount, fo.delivery_charges as delivery_fee, 
        fo.customer_lat as customer_latitude, fo.customer_lon as customer_longitude, 
        fo.status as status, fo.driver_status, fo.otp as delivery_otp, FALSE as is_ecommerce,
        fo.created_at, fo.items,
        r.latitude as restaurant_latitude, r.longitude as restaurant_longitude
      FROM food_orders fo
      LEFT JOIN restaurants r ON fo.restaurant_name = r.name
      WHERE fo.driver_mobile = ? AND fo.driver_status IN ('assigned', 'partner_accepted', 'reached_pickup_location', 'pickup_completed', 'reached_customer_location')
    `;

    // Fetch active ecommerce order
    const ecommerceSql = `
      SELECT 
        eo.id, eo.customer_name, eo.customer_phone, eo.warehouse as restaurant_name, 
        eo.delivery_address, eo.total_amount, eo.delivery_charges as delivery_fee, 
        eo.customer_lat as customer_latitude, eo.customer_lon as customer_longitude, 
        eo.status as status, eo.driver_status, eo.otp as delivery_otp, TRUE as is_ecommerce,
        eo.created_at, eo.items,
        w.latitude as restaurant_latitude, w.longitude as restaurant_longitude
      FROM ecommerce_orders eo
      LEFT JOIN warehouse w ON eo.warehouse = w.name
      WHERE eo.driver_mobile = ? AND eo.driver_status IN ('assigned', 'partner_accepted', 'reached_pickup_location', 'pickup_completed', 'reached_customer_location')
    `;

    const [foodOrdersResult, ecommerceOrdersResult] = await Promise.all([
      db.query(foodSql, [driverPhone]),
      db.query(ecommerceSql, [driverPhone])
    ]);

    const foodOrders = foodOrdersResult[0] || foodOrdersResult;
    const ecommerceOrders = ecommerceOrdersResult[0] || ecommerceOrdersResult;



    let activeOrders = [...foodOrders, ...ecommerceOrders];
    activeOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (activeOrders.length === 0) {
      return res.status(200).json({
        success: true,
        activeOrder: null,
        activeOrders: [],
        newAssignedOrder: null
      });
    }

    // Map DB status directly for active orders
    const mappedActiveOrders = activeOrders.map(o => {
      let status = o.status;
      if (o.driver_status === 'assigned') {
        status = 'assigned';
      } else if (o.driver_status === 'partner_accepted') {
        if (o.status !== 'customer_verified') {
          status = 'accepted';
        } else {
          status = 'customer_verified';
        }
      } else if (o.driver_status === 'reached_pickup_location') {
        status = o.is_ecommerce ? 'reached_to_warehouse' : 'reached_to_hotel';
      } else if (o.driver_status === 'pickup_completed') {
        status = 'shipping';
      } else if (o.driver_status === 'reached_customer_location') {
        status = 'at_customer';
      }
      return { ...o, status };
    });

    // Find any newly assigned order to trigger popup
    const newAssignedOrder = mappedActiveOrders.find(o => o.status === 'assigned') || null;

    // Determine main active order (prefer accepted/picked orders, fallback to first active order)
    let activeOrder = mappedActiveOrders.find(o => o.status !== 'assigned') || mappedActiveOrders[0] || null;

    res.status(200).json({
      success: true,
      activeOrder,
      activeOrders: mappedActiveOrders,
      newAssignedOrder
    });
  } catch (error) {
    console.log(error);
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
      path.join(__dirname, '../../debug_get_active_error.txt'),
      JSON.stringify({ errorMessage: error.message, errorStack: error.stack }, null, 2)
    );
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// GET ORDER HISTORY
const getOrderHistory = async (req, res) => {
  try {
    const driverId = req.user.id;

    // Get driver phone number
    const [drivers] = await db.query(
      'SELECT phone FROM drivers WHERE id = ?',
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }
    const driverPhone = drivers[0].phone;

    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // Fetch delivered food orders with pagination
    const foodSql = `
      SELECT 
        id, customer_name, customer_phone, restaurant_name, 
        delivery_address, total_amount, delivery_charges as delivery_fee, 
        'delivered' as status, otp as delivery_otp, FALSE as is_ecommerce,
        created_at
      FROM food_orders
      WHERE driver_mobile = ? AND driver_status = 'order_completed'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    // Fetch delivered ecommerce orders with pagination
    const ecommerceSql = `
      SELECT 
        id, customer_name, customer_phone, warehouse as restaurant_name, 
        delivery_address, total_amount, delivery_charges as delivery_fee, 
        'delivered' as status, otp as delivery_otp, TRUE as is_ecommerce,
        created_at
      FROM ecommerce_orders
      WHERE driver_mobile = ? AND driver_status = 'order_completed'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [foodOrdersResult, ecommerceOrdersResult] = await Promise.all([
      db.query(foodSql, [driverPhone, limit, offset]),
      db.query(ecommerceSql, [driverPhone, limit, offset])
    ]);

    const foodOrders = foodOrdersResult[0] || foodOrdersResult;
    const ecommerceOrders = ecommerceOrdersResult[0] || ecommerceOrdersResult;

    let orders = [...foodOrders, ...ecommerceOrders];
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const paginatedOrders = orders.slice(0, limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalOrders: paginatedOrders.length,
      orders: paginatedOrders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// GET ALL DRIVER ORDERS
const getOrders = async (req, res) => {
  try {
    const driverId = req.user.id;

    // Get driver phone number
    const [drivers] = await db.query(
      'SELECT phone FROM drivers WHERE id = ?',
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }
    const driverPhone = drivers[0].phone;

    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const foodSql = `
      SELECT 
        id, customer_name, customer_phone, restaurant_name, 
        delivery_address, total_amount, delivery_charges as delivery_fee, 
        driver_status as status, otp as delivery_otp, FALSE as is_ecommerce,
        created_at
      FROM food_orders
      WHERE driver_mobile = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const ecommerceSql = `
      SELECT 
        id, customer_name, customer_phone, warehouse as restaurant_name, 
        delivery_address, total_amount, delivery_charges as delivery_fee, 
        driver_status as status, otp as delivery_otp, TRUE as is_ecommerce,
        created_at
      FROM ecommerce_orders
      WHERE driver_mobile = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [foodOrdersResult, ecommerceOrdersResult] = await Promise.all([
      db.query(foodSql, [driverPhone, limit, offset]),
      db.query(ecommerceSql, [driverPhone, limit, offset])
    ]);

    const foodOrders = foodOrdersResult[0] || foodOrdersResult;
    const ecommerceOrders = ecommerceOrdersResult[0] || ecommerceOrdersResult;

    let orders = [...foodOrders, ...ecommerceOrders];
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Map statuses for UI consistency
    orders = orders.map(o => {
      let status = o.status;
      if (status === 'partner_accepted') status = 'confirmed';
      else if (status === 'reached_pickup_location') status = 'driver_reached';
      else if (status === 'pickup_completed') status = 'picked';
      else if (status === 'order_completed') status = 'delivered';
      return { ...o, status };
    });

    const paginatedOrders = orders.slice(0, limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      orders: paginatedOrders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// UPDATE ORDER STATUS
const updateOrderStatus = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { orderId, status } = req.body;

    const validStatuses = [
      'confirmed', // Accept order
      'driver_reached',
      'picked',
      'accepted',
      'customer_verified',
      'reached_to_hotel',
      'reached_to_warehouse',
      'shipping',
      'at_customer'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // Get driver phone number
    const [drivers] = await db.query(
      'SELECT phone FROM drivers WHERE id = ?',
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }
    const driverPhone = drivers[0].phone;

    // Detect which table contains this order
    let isEcommerce = false;
    const [food] = await db.query('SELECT id, driver_mobile FROM food_orders WHERE id = ?', [orderId]);
    let orderRows = food;
    if (food.length === 0) {
      const [ecom] = await db.query('SELECT id, driver_mobile FROM ecommerce_orders WHERE id = ?', [orderId]);
      orderRows = ecom;
      isEcommerce = true;
    }

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const order = orderRows[0];
    if (order.driver_mobile !== driverPhone) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order',
      });
    }

    // Map incoming status to database driver_status & order status
    let dbStatus = '';
    let mainOrderStatus = '';
    if (status === 'confirmed' || status === 'accepted') {
      dbStatus = 'partner_accepted';
      mainOrderStatus = 'accepted';
    } else if (status === 'customer_verified') {
      dbStatus = 'partner_accepted';
      mainOrderStatus = 'customer_verified';
    } else if (status === 'driver_reached' || status === 'reached_to_hotel') {
      dbStatus = 'reached_pickup_location';
      mainOrderStatus = 'reached_to_hotel';
    } else if (status === 'reached_to_warehouse') {
      dbStatus = 'reached_pickup_location';
      mainOrderStatus = 'reached_to_warehouse';
    } else if (status === 'picked' || status === 'shipping') {
      dbStatus = 'pickup_completed';
      mainOrderStatus = 'shipping';
    } else if (status === 'at_customer') {
      dbStatus = 'reached_customer_location';
      mainOrderStatus = 'at_customer';
    }

    const tableName = isEcommerce ? 'ecommerce_orders' : 'food_orders';
    await db.query(
      `UPDATE ${tableName} SET driver_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [dbStatus, mainOrderStatus, orderId]
    );

    // Sync driver status in drivers table to 'busy' if they accept an order
    if (status === 'confirmed' || status === 'accepted') {
      await db.query("UPDATE drivers SET status = 'busy' WHERE phone = ?", [driverPhone]);
    }

    let responseMessage = 'Status updated';
    if (status === 'driver_reached' || status === 'reached_to_hotel' || status === 'reached_to_warehouse') {
      responseMessage = isEcommerce ? 'Driver reached warehouse' : 'Driver reached hotel';
    } else if (status === 'picked' || status === 'shipping') {
      responseMessage = 'Order picked successfully';
    } else if (status === 'confirmed' || status === 'accepted') {
      responseMessage = 'Order accepted successfully';
    } else if (status === 'customer_verified') {
      responseMessage = 'Customer verified successfully';
    } else if (status === 'at_customer') {
      responseMessage = 'Driver reached customer location';
    }

    res.status(200).json({
      success: true,
      message: responseMessage,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// VERIFY DELIVERY OTP
const verifyDeliveryOTP = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { orderId, otp } = req.body;

    // Get driver phone number
    const [drivers] = await db.query(
      'SELECT phone FROM drivers WHERE id = ?',
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }
    const driverPhone = drivers[0].phone;

    // Check food_orders first
    let isEcommerce = false;
    const [food] = await db.query('SELECT id, driver_mobile, delivery_charges FROM food_orders WHERE id = ? AND otp = ?', [orderId, otp]);
    let orderRows = food;
    if (food.length === 0) {
      const [ecom] = await db.query('SELECT id, driver_mobile, delivery_charges FROM ecommerce_orders WHERE id = ? AND otp = ?', [orderId, otp]);
      orderRows = ecom;
      isEcommerce = true;
    }

    if (orderRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    const order = orderRows[0];
    if (order.driver_mobile !== driverPhone) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order',
      });
    }

    const tableName = isEcommerce ? 'ecommerce_orders' : 'food_orders';
    
    // Update order status to delivered
    await db.query(
      `UPDATE ${tableName} SET driver_status = 'order_completed', status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [orderId]
    );

    const deliveryFee = Number(order.delivery_charges || 0);

    // Update drivers table earnings and status
    await db.query(
      `UPDATE drivers 
       SET total_orders = total_orders + 1, completed_orders = completed_orders + 1,
           total_earnings = total_earnings + ?, today_earnings = today_earnings + ?,
           status = 'available'
       WHERE id = ?`,
      [deliveryFee, deliveryFee, driverId]
    );

    // Insert wallet transaction
    await db.query(
      `INSERT INTO wallet_transactions (driver_id, type, amount, description, status) 
       VALUES (?, 'earning', ?, 'Order Delivery Earnings', 'completed')`,
      [driverId, deliveryFee]
    );

    res.status(200).json({
      success: true,
      message: 'Order Delivered',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// GET MENU ITEMS FOR A RESTAURANT
const getRestaurantItems = async (req, res) => {
  try {
    const { restaurantName } = req.query;
    if (!restaurantName) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant name query parameter is required',
      });
    }

    const [items] = await db.query(
      'SELECT id, name, price, image_url, description FROM food_items WHERE restaurant_name = ?',
      [restaurantName]
    );

    res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// UPDATE ITEMS IN AN ACTIVE ORDER
const updateOrderItems = async (req, res) => {
  try {
    const { orderId, items } = req.body;

    if (!orderId || !items) {
      return res.status(400).json({
        success: false,
        message: 'orderId and items are required',
      });
    }

    // Check food_orders first
    let isEcommerce = false;
    const [food] = await db.query('SELECT id, total_amount, delivery_charges FROM food_orders WHERE id = ?', [orderId]);
    let orderRows = food;
    if (food.length === 0) {
      const [ecom] = await db.query('SELECT id, total_amount, delivery_charges FROM ecommerce_orders WHERE id = ?', [orderId]);
      orderRows = ecom;
      isEcommerce = true;
    }

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Calculate new total amount based on items
    let newItemsTotal = 0;
    const itemsList = typeof items === 'string' ? JSON.parse(items) : items;
    itemsList.forEach(item => {
      newItemsTotal += parseFloat(item.price || 0) * parseInt(item.quantity || 1);
    });

    // Add delivery charges
    const deliveryCharges = parseFloat(orderRows[0].delivery_charges || 0);
    const newTotalAmount = newItemsTotal + deliveryCharges;

    const tableName = isEcommerce ? 'ecommerce_orders' : 'food_orders';
    
    // Log order modification before applying
    await db.query(
      `INSERT INTO order_modifications (order_id, old_items, new_items, old_total, new_total, modified_by) 
       VALUES (?, ?, ?, ?, ?, 'driver')`,
      [orderId, JSON.stringify([]), JSON.stringify(itemsList), orderRows[0].total_amount, newTotalAmount]
    );

    // Update order
    await db.query(
      `UPDATE ${tableName} SET items = ?, total_amount = ? WHERE id = ?`,
      [JSON.stringify(itemsList), newTotalAmount, orderId]
    );

    res.status(200).json({
      success: true,
      message: 'Order items updated successfully',
      totalAmount: newTotalAmount
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

module.exports = {
  getAvailableOrders,
  acceptOrder,
  getActiveOrder,
  getOrderHistory,
  getOrders,
  updateOrderStatus,
  verifyDeliveryOTP,
  getRestaurantItems,
  updateOrderItems,
};
