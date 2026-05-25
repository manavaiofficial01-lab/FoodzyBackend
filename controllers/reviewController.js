const db = require("../config/db");

// Submit a review for an order
exports.submitReview = (req, res) => {
  const {
    order_id,
    is_ecommerce,
    user_id,
    customer_name,
    customer_phone,
    rating,
    comment
  } = req.body;

  if (!order_id || !user_id || !rating) {
    return res.status(400).json({ success: false, message: "Missing required fields: order_id, user_id, and rating are required." });
  }

  const isEcom = is_ecommerce ? 1 : 0;

  const sql = `
    INSERT INTO reviews (order_id, is_ecommerce, user_id, customer_name, customer_phone, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [order_id, isEcom, user_id, customer_name, customer_phone, rating, comment];

  db.query(sql, params, (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: "This order has already been reviewed." });
      }
      console.error("[Reviews] Error saving review to DB:", err.message);
      return res.status(500).json({ success: false, message: "Database error while saving review." });
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      reviewId: result.insertId
    });
  });
};

// Get review by order ID
exports.getReviewByOrder = (req, res) => {
  const { orderId } = req.params;
  const isEcom = req.query.is_ecommerce === 'true' ? 1 : 0;

  const sql = "SELECT * FROM reviews WHERE order_id = ? AND is_ecommerce = ?";
  db.query(sql, [orderId, isEcom], (err, results) => {
    if (err) {
      console.error("[Reviews] Error loading review from DB:", err.message);
      return res.status(500).json({ success: false, message: "Database error while fetching review." });
    }

    if (results.length === 0) {
      return res.status(200).json({ success: true, exists: false, review: null });
    }

    res.status(200).json({
      success: true,
      exists: true,
      review: results[0]
    });
  });
};
