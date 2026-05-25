const express = require('express');
const router = express.Router();
const ecommerceCartController = require('../controllers/ecommerceCartController');

router.get('/:userMobile', ecommerceCartController.getCart);
router.post('/', ecommerceCartController.addToCart);
router.put('/quantity', ecommerceCartController.updateQuantity);
router.delete('/:userMobile/:productId', ecommerceCartController.removeFromCart);
router.delete('/:userMobile', ecommerceCartController.clearCart);

module.exports = router;
