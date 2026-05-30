const express =
  require('express');

const router =
  express.Router();

const {

  getPayouts,

  createPayoutRequest,

} = require(

  '../controllers/payoutController'

);


// GET PAYOUTS
router.get(
  '/',
  getPayouts
);


// CREATE PAYOUT
router.post(
  '/request',
  createPayoutRequest
);

module.exports =
  router;