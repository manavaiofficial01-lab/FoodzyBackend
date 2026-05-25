const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// Route to submit a review
router.post("/", reviewController.submitReview);

// Route to get a review by order ID
router.get("/order/:orderId", reviewController.getReviewByOrder);

module.exports = router;
