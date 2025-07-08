const express = require("express");
const router = express.Router();
const { authenticate } = require("../services/authMiddleware");
const {

  getAvailableShifts
} = require("../controllers/marketController");



// new: get available shifts for market
router.get("/available-shifts", authenticate, getAvailableShifts);



module.exports = router;
