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
  // New delivery imports
  createDelivery,
  getDeliveryHistory,
  generateDeliveryBarcode,
} = require("../controllers/farmerController");

// Apply base authentication to all routes (farmers only by default)
router.use(authenticate);

// =================================================================
// 🚜 FARM ROUTES
// =================================================================

// List all farms (Admin/Manager access only - for system oversight)
router.get(
  "/farms",
  authenticate,
  requireRole(["admin", "farmerManager"]),
  listFarms
);

// Get specific farm by ID (Multi-role access - farmers can only access their own)
router.get(
  "/farms/:farmId",
  requireRole(["farmer", "admin", "farmerManager"]),
  getFarm
);

// Get authenticated farmer's own farms (Farmer-only - token-based security)
router.get("/my-farms", authenticate, requireRole("farmer"), getFarmerFarms);

// =================================================================
// 🌾 CROP ROUTES
// =================================================================

// List crops for a specific farm (Farmer-only - ownership verified in controller)
router.get(
  "/farms/:farmId/crops",
  authenticate,
  requireRole("farmer"),
  listCrops
);

// Get specific crop details (Farmer-only - ownership verified in controller)
router.get(
  "/farms/:farmId/crops/:cropId",
  authenticate,
  requireRole("farmer"),
  getCrop
);

router.post("/create-crop", authenticate, requireRole("admin"), createCrop);

router.put("/crops/:cropId", authenticate, requireRole("admin"), updateCrop);

router.delete("/crops/:cropId", authenticate, requireRole("admin"), deleteCrop);

// =================================================================
// 📄 REPORT ROUTES - Using Reports Collection
// =================================================================

// Get specific report by ID (Admin/Manager access)
router.get(
  "/report/:reportId",
  authenticate,
  requireRole(["admin", "farmerManager"]),
  getReport
);

// Get farmer's own reports (Farmer-only - token-based security)
router.get("/report", authenticate, requireRole("farmer"), getFarmerReport);

// Generate crop report (Multi-role access)
router.get(
  "/crops/:cropId/report",
  authenticate,
  requireRole(["farmer", "admin", "farmerManager"]),
  getCropReport
);

// List all reports (Admin/Manager access)
router.get(
  "/reports",
  authenticate,
  requireRole(["admin", "farmerManager"]),
  getAllReports
);

// Create custom report (Farmer-only)
router.post("/reports", authenticate, requireRole("farmer"), createReport);
// =================================================================
// 📦 SHIPMENT ROUTES
// =================================================================

// List farmer's shipments (Farmer-only - token-based filtering)
router.get("/shipments", authenticate, requireRole("farmer"), listShipments);

router.get(
  "/shipments/:shipmentId",
  authenticate,
  requireRole(["admin", "farmerManager"]),
  getShipment
);

router.post("/shipments", authenticate, requireRole("admin"), createShipment);

// Generate QR code/barcode for shipment tracking (Farmer-only)
router.post(
  "/shipments/:shipmentId/barcode",
  authenticate,
  requireRole(["admin", "farmerManager", "farmer"]),
  generateBarcode
);

// =================================================================
// 🚚 DELIVERY ROUTES
// =================================================================

// Create delivery form/record (Farmer-only - for produce deliveries)
router.post(
  "/delivery-form",
  authenticate,
  requireRole("farmer"),
  createDelivery
);

// Get delivery history (Farmer-only - token-based filtering with optional filters)
router.get(
  "/delivery-history",
  authenticate,
  requireRole("farmer"),
  getDeliveryHistory
);

// Generate QR code for delivery tracking (Farmer-only)
router.post(
  "/deliveries/:deliveryId/barcode",
  authenticate,
  requireRole("farmer"),
  generateDeliveryBarcode
);

// =================================================================
// 🥕 ITEM CATALOG ROUTES (Read-only)
// =================================================================

// List available produce items (Farmer-only - for crop reporting/shipments)
router.get("/items", authenticate, requireRole("farmer"), listItems); // @@@@ need to add query field

router.get("/items/:itemId", authenticate, getItem);

// =================================================================
// ⭐ RATING/FEEDBACK ROUTES - New Structure
// =================================================================

// Get farmer's own ratings (Farmer-only - see their rating summary)
router.get("/my-ratings", authenticate, requireRole("farmer"), getMyRatings);

// Get specific farmer's ratings by farmerId (Admin/Manager access)
router.get(
  "/ratings/:farmerId",
  authenticate,
  requireRole(["admin", "farmerManager"]),
  getFarmerRating
);

// Add/Update rating for a farmer (Customer-only - customers rate farmers)
router.post(
  "/ratings/:farmerId",
  authenticate,
  requireRole("customer"),
  addOrUpdateRating
);

// Get all farmers with their ratings (Admin-only - for analytics)
router.get(
  "/all-ratings",
  authenticate,
  requireRole(["admin", "farmerManager"]),
  getAllFarmerRatings
);
// =================================================================
// 📊 DASHBOARD & ANALYTICS ROUTES
// =================================================================

// Get farmer dashboard overview (Farmer-only - personal metrics/summary)
router.get("/dashboard", authenticate, requireRole("farmer"), getDashboard);

// Get performance metrics (Farmer-only - detailed analytics for farmer)
router.get("/performance", authenticate, requireRole("farmer"), getPerformance);

module.exports = router;
