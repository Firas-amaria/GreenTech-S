const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  getDashboardStatus,
  getDemandStatistics,
  getFarmerInventory,
  createStockItem,
  getShipmentRequestsForShift,
  shipmentRequestQuantitiesConfirmed,
} = require("../controllers/farmerManagerController");

router.get("/dashboardStatus", getDashboardStatus);
router.get("/demandStatistics/:shift", getDemandStatistics);
router.get("/farmerInventory", getFarmerInventory);
router.post("/createStockItem", authenticate, createStockItem);
router.get("/shipmentRequests/:shift", getShipmentRequestsForShift);
router.post(
  "/shipmentRequestQuantitiesConfirmed",
  shipmentRequestQuantitiesConfirmed
);

module.exports = router;
