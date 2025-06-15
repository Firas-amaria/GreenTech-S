const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  upsertTransporterProfile,
  getMyTransporterProfile,
  listAvailableShipments,
  acceptShipment,
  getMyShipments,
  updateShipmentStatus,
} = require("../controllers/transporterController");

// Apply authentication to all routes
router.use(authenticate);

// Apply role-based authorization for both industrial-driver and deliverer
router.use(requireRole(["industrial-driver", "deliverer"]));

// Transporter profile routes
router.post("/profile", upsertTransporterProfile);
router.get("/profile", getMyTransporterProfile);

// Shipment management routes
router.get("/available-shipments", listAvailableShipments);
router.post("/accept-shipment/:shipmentId", acceptShipment);

// My shipments routes
router.get("/my-shipments", getMyShipments);
router.put("/shipment/:shipmentId/status", updateShipmentStatus);

module.exports = router;
