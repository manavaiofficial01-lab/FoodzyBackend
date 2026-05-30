const express =
  require('express');

const router =
  express.Router();

const {

  getProfile,

  updateProfile,

  depositCash,

} = require(
  '../controllers/profileController'
);


// GET PROFILE
router.get(
  '/',
  getProfile
);


// UPDATE PROFILE
router.put(
  '/',
  updateProfile
);



// DEPOSIT CASH
router.post(
  '/deposit-cash',
  depositCash
);

module.exports =
  router;