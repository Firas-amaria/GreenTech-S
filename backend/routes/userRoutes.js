const express = require("express");
const { getProfile } = require("../controllers/userController");
const { authenticate } = require("../services/authMiddleware");
const router = express.Router();

router.get("/profile", authenticate, getProfile); // Gets his own profile

module.exports = router;
