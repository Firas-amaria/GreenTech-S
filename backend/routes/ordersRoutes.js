const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
     getAllOrdersForShifts,
     getOrdersForShift,
} = require("../controllers/ordersController");

router.get("/getAllOrdersForShifts", authenticate, getAllOrdersForShifts);
router.get("/getOrdersForShift", authenticate, getOrdersForShift);


module.exports = router;