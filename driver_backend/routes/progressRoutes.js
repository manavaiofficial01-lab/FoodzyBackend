const express = require('express');

const router = express.Router();

const {
  getTodayProgress,
} = require('../controllers/progressController');


// GET TODAY PROGRESS
router.get(
  '/today',
  getTodayProgress
);

module.exports = router;