const express =
require('express');

const router =
express.Router();

const {

  getWallet,

  requestPayout,

} = require(
  '../controllers/walletController'
);


// GET WALLET
router.get(
  '/',
  getWallet
);


// REQUEST PAYOUT
router.post(
  '/request',
  requestPayout
);


module.exports =
router;