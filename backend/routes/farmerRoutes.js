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
  createApprovedShipment,
   // Land handlers
  getLands,
  
  markLandReady,

  

  // Item handlers
  qualityTestItem,

  // Shipment handlers

  // Demand & ordering handlers
  getDemands,
  informFarmer,
  getOrderSummaries,
  postFarmerShipmentInfo,
  postDriverInfo,
  generateShipmentBarcode
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
  requireRole("admin"), // Only authenticated farmers allowed
  createFarmerShipment
);

// CREATE: APPROVED shipment request specific to farmer
router.post(
  "/approved-shipment",
  requireRole("admin"),         // Only authenticated farmers allowed
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





// Get all lands for authenticated farmer
router.get(
  "/lands",
  requireRole("farmer"),
  getLands
);

// Get detailed info for a single land
router.get(
  "/land/:landId",
  requireRole("farmer"),
  getFarm
);

// Mark an entire land ready for harvest (updates all crops under it)
router.put(
  "/land/:landId",
  requireRole("farmer"),
  markLandReady
);

// --- Crop Routes ---

// List all crops (optionally filter by farmId, status, itemId)
router.get(
  "/crops",
  requireRole("farmer"),
  listCrops
);

// Add a new crop to a land
router.post(
  "/create-crop",
  requireRole("farmer"),
  createCrop
);

// Get a single crop’s details
router.get(
  "/crops/:cropId",
  requireRole("farmer"),
  getCrop
);

// Update a crop’s data (e.g., status, quantities)
router.put(
  "/crops/:cropId",
  requireRole("farmer"),
  updateCrop
);

// Delete a crop
router.delete(
  "/crops/:cropId",
  requireRole("farmer"),
  deleteCrop
);

// --- Item Catalog Routes ---

// Get list of all items
router.get(
  "/items",
  requireRole("farmer"),
  listItems
);

// Get detailed info (including quality standards) for one item
router.get(
  "/items/:itemId",
  requireRole("farmer"),
  getItem
);

// Record a quality‐test result for a specific container of an item
router.post(
  "/items/:itemId/quality-test",
  requireRole("farmer"),
  qualityTestItem
);

// --- Shipment Routes ---

// Farmer submits a shipment form
router.post(
  "/shipments",
  requireRole("farmer"),
  createShipment
);

// Generate or retrieve a QR/barcode for a given shipment
router.post(
  "/shipments/:shipmentId/barcode",
  requireRole("farmer"),
  generateShipmentBarcode
);

// --- Demand & Ordering Routes ---

// Get forecasted item‐demand by shift and weekday
router.get(
  "/demands",
  requireRole("farmer"),
  getDemands
);

// Notify a farmer they need to be ready for an upcoming order
router.post(
  "/demands/inform",
  requireRole("farmer"),
  informFarmer
);

// Retrieve consumer order summaries aggregated per farmer
router.get(
  "/order-summaries",
  requireRole("farmer"),
  getOrderSummaries
);

// Update shipment info (e.g., pickup time) for a farmer’s shipment
router.post(
  "/shipment-info",
  requireRole("farmer"),
  postFarmerShipmentInfo
);

// Record driver assignment or notification for a shipment
router.post(
  "/shipments/:shipmentId/driver",
  requireRole("farmer"),
  postDriverInfo
);




module.exports = router;
