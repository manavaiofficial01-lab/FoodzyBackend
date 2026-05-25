const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Route to get all cart items for a user mobile number
router.get('/:userMobile', cartController.getCart);

// Route to add/update an item in the cart
router.post('/', cartController.addToCart);

// Route to update a cart item quantity
router.put('/quantity', cartController.updateQuantity);

// Route to remove a specific item from the cart (uses size and color as query params)
router.delete('/:userMobile/:productId', cartController.removeFromCart);

// Route to clear the entire cart for a user
router.delete('/:userMobile', cartController.clearCart);

module.exports = router;
