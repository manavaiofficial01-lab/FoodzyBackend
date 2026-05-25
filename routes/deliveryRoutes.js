const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');

// Route to get all active delivery charges rules
router.get('/', deliveryController.getDeliveryCharges);

// Route to get all active additional fees
router.get('/additional-fees', deliveryController.getAdditionalFees);

module.exports = router;
