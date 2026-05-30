const express = require('express');

const router = express.Router();

const {
  registerDriver,
  loginDriver,
  login,
} = require(
  '../controllers/authController'
);


// REGISTER DRIVER
router.post(
  '/register',
  registerDriver
);


// LOGIN DRIVER
router.post(
  '/login',
  loginDriver
);


// ALTERNATIVE LOGIN
router.post(
  '/driver-login',
  login
);


module.exports = router;