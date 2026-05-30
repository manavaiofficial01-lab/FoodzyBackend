const express = require('express');

const router = express.Router();

const {
  updateDriverLocation,
  updateLocation,
} = require(
  '../controllers/driverController'
);


// UPDATE LIVE LOCATION
router.put(
  '/location',
  updateDriverLocation || updateLocation
);


module.exports = router;