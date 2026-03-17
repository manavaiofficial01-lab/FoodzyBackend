const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/", userController.createUser);
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Token based routes
router.get("/token/:token", userController.getUserByToken);
router.put("/token/:token", userController.updateUserByToken);

// Update FCM Token
router.post("/update-fcm", userController.updateFcmToken);

// Update Location
router.post("/update-location", userController.updateLocation);

// Update Zone
router.post("/update-zone", userController.updateZone);

module.exports = router;
