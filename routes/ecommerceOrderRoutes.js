const express = require('express');
const router = express.Router();
const ecommerceOrderController = require('../controllers/ecommerceOrderController');

router.post('/verify-payment', ecommerceOrderController.verifyPaymentAndCreateOrder);
router.get('/history/:userIdOrToken', ecommerceOrderController.getUserOrders);
router.get('/:orderId', ecommerceOrderController.getOrderById);

module.exports = router;
