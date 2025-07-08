const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const { db } = require("../firebaseConfig"); // Add db import for inventory route
const {
  createCrop,
  approveShipmentRequest,
  submitShipmentReport,
  getApprovedShipments,
  getShipmentRequests,
  getFarmerLands,
  getItemList,
  updateCropByLandId,
  deleteCropByLandId,
} = require("../controllers/farmerController");

// Apply base authentication to all routes
router.use(authenticate);

//USED f-dashboard f-shipment
// Approve shipment request
router.put(
  "/approveShipmentRequest/:requestId",
  authenticate,
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

// NEW – match frontend
router.put("/updateCrops/:landId", requireRole("farmer"), updateCropByLandId);

router.delete(
  "/removeLandCrops/:landId",
  requireRole("farmer"),
  deleteCropByLandId
);

//USED f-crop
// Create new crop
router.post("/addCrop", authenticate, requireRole("farmer"), createCrop);

router.get("/getItemList", getItemList);

module.exports = router;
