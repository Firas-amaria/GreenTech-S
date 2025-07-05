const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  getDashboardStatus,
  getDemandStatistics,
  getFarmerInventory,
  createStockItem,
} = require("../controllers/farmerManagerController");

router.get("/dashboardStatus", getDashboardStatus);
router.get("/demandStatistics/:shift", getDemandStatistics);
router.get("/farmerInventory", getFarmerInventory);
router.post("/createStockItem", createStockItem);

module.exports = router;
