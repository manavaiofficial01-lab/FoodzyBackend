const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");

// GET /api/zones       → All zones
router.get("/", zoneController.getAllZones);

// GET /api/zones/:id   → Single zone by ID
router.get("/:id", zoneController.getZoneById);

module.exports = router;
