const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Route to verify payment and create orders
router.post('/verify-payment', orderController.verifyPaymentAndCreateOrder);

// Route to get order history for a user
router.get('/user/:userIdOrToken', orderController.getUserOrders);

// Route to get a single order by its ID
router.get('/:orderId', orderController.getOrderById);

module.exports = router;
