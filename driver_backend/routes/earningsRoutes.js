const express =
  require('express');

const router =
  express.Router();

const {

  getEarnings,

} = require(
  '../controllers/earningsController'
);


// GET EARNINGS
router.get(
  '/',
  getEarnings
);

module.exports =
  router;