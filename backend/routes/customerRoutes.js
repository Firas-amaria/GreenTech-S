// customerRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  getCustomerProfile,
  getSavedAddress,
  getCustomerOrders,
} = require("../controllers/customerController");

// existing route
router.get("/profile", getCustomerProfile);

// new: get customer saved addresses
router.get("/saved-address", authenticate,getSavedAddress);

router.get("/customer-orders", authenticate, getCustomerOrders);



module.exports = router;
