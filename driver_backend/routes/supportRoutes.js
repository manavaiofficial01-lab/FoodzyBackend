const express =
  require('express');

const router =
  express.Router();

const {

  createTicket,

  getTickets,

} = require(
  '../controllers/supportController'
);


// CREATE
router.post(
  '/',
  createTicket
);


// GET
router.get(
  '/',
  getTickets
);

module.exports =
  router;