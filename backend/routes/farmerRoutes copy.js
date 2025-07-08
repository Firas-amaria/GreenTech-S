const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const { db } = require("../firebaseConfig"); // Add db import for inventory route
const {
  // Land functions
  getLands,
  getFrontendLands,

  // Crop functions
  listCrops,
  getCrop,
  createCrop,
  updateCrop,
  deleteCrop,

  // Item functions
  getItems,
  getFrontendItems,

  // Shipment functions
  createShipment,
  getShipments,
  getFrontendShipments,
  approveShipmentRequest,
  submitShipmentReport,

  // Dashboard functions
  getDashboardData,
  getFrontendDashboard,
} = require("../controllers/farmerController");

// Apply base authentication to all routes
router.use(authenticate);

// =================================================================
// 🏞️ LAND ROUTES
// =================================================================

// Get farmer's lands
router.get("/lands", requireRole("farmer"), getLands);

// Get farmer's lands (frontend compatible)
router.get("/frontend-lands", requireRole("farmer"), getFrontendLands);

// =================================================================
// 🌾 CROP ROUTES
// =================================================================

// List all crops for the authenticated farmer
router.get("/crops", requireRole("farmer"), listCrops);

// Get specific crop details
router.get("/crops/:cropId", requireRole("farmer"), getCrop);

//USED f-crop
// Create new crop
router.post("/crops", requireRole("farmer"), createCrop);

//USED f-crop
// Update crop
router.put("/crops/:cropId", requireRole("farmer"), updateCrop);

//USED f-crop
// Delete crop
router.delete("/crops/:cropId", requireRole("farmer"), deleteCrop);

// =================================================================
// 🥬 ITEM ROUTES
// =================================================================

// Get all generic items (for crop creation)
router.get("/items", requireRole("farmer"), getItems);

// =================================================================
// 🚚 SHIPMENT ROUTES
// =================================================================

// Get farmer's shipments
router.get("/shipments", requireRole("farmer"), getShipments);

// Create new shipment
router.post("/shipments", requireRole("farmer"), createShipment);

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

// =================================================================
// 🎨 FRONTEND-COMPATIBLE ROUTES
// =================================================================

//USED f-dashboard
// Frontend dashboard data (with proper data structure)
router.get("/frontend/dashboard", requireRole("farmer"), getFrontendDashboard);

// Frontend lands data
router.get("/frontend/lands", requireRole("farmer"), getFrontendLands);

//USED f-crops
// Frontend items data (transformed format)
router.get("/frontend/items", requireRole("farmer"), getFrontendItems);

//USED  f-shipment
// Frontend shipments data (structured format)
router.get("/frontend/shipments", requireRole("farmer"), getFrontendShipments);

// =================================================================
// � INVENTORY ROUTES
// =================================================================

// Get farmer's inventory
router.get("/inventory", requireRole("farmer"), async (req, res) => {
  try {
    const farmerId = req.user.uid;

    const inventorySnapshot = await db
      .collection("farmerInventory")
      .where("farmerId", "==", farmerId)
      .get();

    const inventory = [];
    inventorySnapshot.forEach((doc) => {
      inventory.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      message: "Inventory retrieved successfully",
      inventory: inventory,
    });
  } catch (error) {
    console.error("Error getting inventory:", error);
    res.status(500).json({ error: "Failed to get inventory" });
  }
});

// =================================================================
// �📊 DASHBOARD ROUTES
// =================================================================

// Get dashboard data (basic format)
router.get("/dashboard", requireRole("farmer"), getDashboardData);

module.exports = router;
