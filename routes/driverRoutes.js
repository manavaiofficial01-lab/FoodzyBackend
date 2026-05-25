const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

// Proxy route for transparent Supabase to MySQL queries
router.post('/supabase-query', driverController.handleSupabaseQuery);

module.exports = router;
