const express = require("express");
const router = express.Router();
const {
  getOrdersWithAggregation,
} = require("../controllers/managerController");

// Test routes without authentication for development
// TODO: Remove these routes in production

// Test orders aggregation endpoint
router.get("/orders/aggregation", getOrdersWithAggregation);

module.exports = router;
