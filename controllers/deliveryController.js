const db = require('../config/db');

/**
 * Fetch all active delivery charges rules
 */
exports.getDeliveryCharges = (req, res) => {
  const query = 'SELECT * FROM delivery_charges WHERE is_active = 1 ORDER BY min_km ASC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching delivery charges from MySQL:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error while fetching delivery charges', error: err.message });
    }
    
    return res.status(200).json({
      success: true,
      rules: results
    });
  });
};

/**
 * Fetch all active additional fees
 */
exports.getAdditionalFees = (req, res) => {
  const query = 'SELECT * FROM additional_fees WHERE active = 1';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching additional fees from MySQL:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error while fetching additional fees', error: err.message });
    }
    
    return res.status(200).json({
      success: true,
      fees: results
    });
  });
};
