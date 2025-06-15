const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  listFarms,
  getFarm,
  getFarmerFarms,
  listCrops,
  getCrop,
  createCrop,
  updateCrop,
  deleteCrop,
  getReport,
  getFarmerReport,
  getCropReport,
  getAllReports,
  createReport,
  listShipments,
  getShipment,
  createShipment,
  generateBarcode,
  listItems,
  getItem,
  addOrUpdateRating,
  getMyRatings,
  getFarmerRating,
  getAllFarmerRatings,
  getDashboard,
  getPerformance,
  createDelivery,
  getDeliveryHistory,
  generateDeliveryBarcode,
  createFarmerShipment,
  shipmentRequest,
  createApprovedShipment
} = require("../controllers/farmerController");

// Apply base authentication to all routes
router.use(authenticate);

// =================================================================
// 🚜 FARM ROUTES
// =================================================================

// List all farms (Admin/Manager access only - for system oversight)
router.get("/farms", requireRole(["admin", "farmerManager"]), listFarms);

// Get specific farm by ID (Multi-role access - farmers can only access their own)
router.get(
  "/farms/:farmId",
  requireRole(["farmer", "admin", "farmerManager"]),
  getFarm
);

// Get authenticated farmer's own farms (Farmer-only - token-based security)
router.get("/my-farms", requireRole("farmer"), getFarmerFarms);

// =================================================================
// 🌾 CROP ROUTES - Enhanced with NEW_DATA structure
// =================================================================

// List crops for a specific farm with filters (status, itemId)
router.get("/farms/:farmId/crops", requireRole("farmer"), listCrops);

// Get specific crop details with item information
router.get("/farms/:farmId/crops/:cropId", requireRole("farmer"), getCrop);

// Create crop with enhanced data structure (variety, avg_Weight_per_Unit, etc.)
router.post("/create-crop", requireRole("farmer"), createCrop);

// Update crop with new field support
router.put("/crops/:cropId", requireRole(["farmer", "admin"]), updateCrop);

// Delete crop (farmer can delete their own)
router.delete("/crops/:cropId", requireRole(["farmer", "admin"]), deleteCrop);

// =================================================================
// 📄 REPORT ROUTES - Enhanced reporting system
// =================================================================

// Get specific report by ID (Admin/Manager access)
router.get(
  "/report/:reportId",
  requireRole(["admin", "farmerManager"]),
  getReport
);

// Get farmer's own reports with type filtering
router.get("/report", requireRole("farmer"), getFarmerReport);

// Generate enhanced crop report with NEW_DATA metrics
router.get(
  "/crops/:cropId/report",
  requireRole(["farmer", "admin", "farmerManager"]),
  getCropReport
);

// List all reports with filtering (Admin/Manager access)
router.get("/reports", requireRole(["admin", "farmerManager"]), getAllReports);

// Create custom report (Farmer-only)
router.post("/reports", requireRole("farmer"), createReport);

// =================================================================
// 📦 SHIPMENT ROUTES - Enhanced with NEW_DATA structure
// =================================================================

// List farmer's shipments with filtering (status, farmId)
router.get("/shipments", requireRole("farmer"), listShipments);

// Get specific shipment details
router.get(
  "/shipments/:shipmentId",
  requireRole(["farmer", "admin", "farmerManager"]),
  getShipment
);

// CREATE: SHIPMENT REQUEST specific to farmer (item, quantity, pickupTime)
router.post(
  "/shipment-request",
  requireRole("farmer"),
  createFarmerShipment
);

// CREATE: APPROVED shipment request specific to farmer
// Similar to /shipment-request but sets status to "approved" immediately
router.post(
  "/approved-shipment",
  requireRole("farmer"),         // Only authenticated farmers allowed
  createApprovedShipment         // Controller handles approval logic
);

// Create shipment from simple JSON payload (Farmer-only)
router.post("/shipments/simple", requireRole("farmer"), createFarmerShipment);

// Create shipment with enhanced structure (pickupTime, driver, items)
router.post("/shipments", requireRole("farmer"), createShipment);

// Generate QR code/barcode for shipment tracking
router.post(
  "/shipments/:shipmentId/barcode",
  requireRole(["admin", "farmerManager", "farmer"]),
  generateBarcode
);

// Create a simplified shipment request for the authenticated farmer
router.post(
  "/shipment-request",
  requireRole("farmer"),
  shipmentRequest
);

// =================================================================
// 🚚 DELIVERY ROUTES
// =================================================================

// Create delivery form/record (Farmer-only - for produce deliveries)
router.post("/delivery-form", requireRole("farmer"), createDelivery);

// Get delivery history with filtering (status, farmId)
router.get("/delivery-history", requireRole("farmer"), getDeliveryHistory);

// Generate QR code for delivery tracking (Farmer-only)
router.post(
  "/deliveries/:deliveryId/barcode",
  requireRole("farmer"),
  generateDeliveryBarcode
);

// =================================================================
// 🥕 ITEM CATALOG ROUTES - Enhanced with filtering
// =================================================================

// List available produce items with category/season filtering
router.get("/items", requireRole("farmer"), listItems);

// Get specific item details with quality standards
router.get("/items/:itemId", requireRole("farmer"), getItem);

// =================================================================
// ⭐ RATING/FEEDBACK ROUTES
// =================================================================

// Get farmer's own ratings summary
router.get("/my-ratings", requireRole("farmer"), getMyRatings);

// Get specific farmer's ratings by farmerId (Admin/Manager access)
router.get(
  "/ratings/:farmerId",
  requireRole(["admin", "farmerManager"]),
  getFarmerRating
);

// Add/Update rating for a farmer (Customer-only)
router.post("/ratings/:farmerId", requireRole("customer"), addOrUpdateRating);

// Get all farmers with their ratings (Admin-only - for analytics)
router.get(
  "/all-ratings",
  requireRole(["admin", "farmerManager"]),
  getAllFarmerRatings
);

// =================================================================
// 📊 DASHBOARD & ANALYTICS ROUTES
// =================================================================

// Get farmer dashboard overview with summary metrics
router.get("/dashboard", requireRole("farmer"), getDashboard);

// Get detailed performance metrics
router.get("/performance", requireRole("farmer"), getPerformance);

module.exports = router;
