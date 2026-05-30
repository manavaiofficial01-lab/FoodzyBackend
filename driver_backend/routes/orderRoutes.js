const express = require('express');

const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const {
  getAvailableOrders,
  acceptOrder,
  getActiveOrder,
  getOrderHistory,
  getOrders,
  updateOrderStatus,
  verifyDeliveryOTP,
  getRestaurantItems,
  updateOrderItems,
} = require(
  '../controllers/orderController'
);

// GET AVAILABLE ORDERS
router.get(
  '/available',
  protect,
  getAvailableOrders
);

// GET ALL DRIVER ORDERS
router.get(
  '/',
  protect,
  getOrders
);

// ACCEPT ORDER
router.put(
  '/accept',
  protect,
  acceptOrder
);

// GET ACTIVE ORDER
router.get(
  '/active',
  protect,
  getActiveOrder
);

// GET ORDER HISTORY
router.get(
  '/history',
  protect,
  getOrderHistory
);

// UPDATE ORDER STATUS
router.put(
  '/status',
  protect,
  updateOrderStatus
);

router.post(
  '/verify-otp',
  protect,
  verifyDeliveryOTP
);

// GET RESTAURANT MENU ITEMS FOR DRIVER EDIT
router.get(
  '/restaurant-items',
  protect,
  getRestaurantItems
);

// UPDATE ITEMS ON ACTIVE ORDER
router.put(
  '/update-items',
  protect,
  updateOrderItems
);

module.exports = router;