const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const { db } = require("../firebaseConfig"); // Add db import for inventory route
const {
  createCrop,
  updateCrop,
  deleteCrop,
  approveShipmentRequest,
  submitShipmentReport,
  getApprovedShipments,
  getShipmentRequests,
  getFarmerLands,
  getItemList,
} = require("../controllers/farmerController");

// Apply base authentication to all routes
router.use(authenticate);

//USED f-crop
// Update crop
router.put("/crops/:cropId", requireRole("farmer"), updateCrop);

//USED f-crop
// Delete crop
router.delete("/crops/:cropId", requireRole("farmer"), deleteCrop);

//USED f-dashboard f-shipment
// Approve shipment request
router.post(
  "/shipments/requests/:requestId/approve",
  requireRole("farmer"),
  approveShipmentRequest
);

//USED  f-shipmentReport
// Submit shipment report
router.post(
  "/shipments/:shipmentId/report-complete",
  requireRole("farmer"),
  submitShipmentReport
);

//AFTER FIXES
router.get(
  "/getApprovedShipments",
  authenticate,
  requireRole("farmer"),
  getApprovedShipments
);

router.get(
  "/getShipmentRequests",
  authenticate,
  requireRole("farmer"),
  getShipmentRequests
);

router.get(
  "/getFarmerLands",
  authenticate,
  requireRole("farmer"),
  getFarmerLands
);

//USED f-crop
// Create new crop
router.post("/addCrop", authenticate, requireRole("farmer"), createCrop);

router.get("/getItemList", getItemList);

module.exports = router;
