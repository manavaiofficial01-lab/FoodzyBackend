const express = require('express');

const router = express.Router();

const {
  toggleOnlineStatus,
} = require('../controllers/sessionController');


// TOGGLE DRIVER ONLINE STATUS
router.put(
  '/toggle',
  toggleOnlineStatus
);

module.exports = router;