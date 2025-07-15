const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  getAllDrivers,
  getAllShipments,
  getAllProblems,
  getAllSchedules,
  getDashboardOverview,
  resolveProblem,
  updateDriverStatus,
  getDriverRole,
  getAllOrders,
  getOrdersWithAggregation,
  updateItemsAggregation,
} = require("../controllers/managerController");

// --- PUBLIC TEST ROUTE FOR DEVELOPMENT ONLY ---
// This route does NOT require authentication, so it's placed BEFORE the auth middleware
// Remove or protect in production!
router.get("/test/orders/aggregation", getOrdersWithAggregation);
// --- END TEST ROUTE ---

// Apply authentication to all routes AFTER the test route
router.use(authenticate);

// Apply role-based authorization for manager roles
// router.use(requireRole(["admin", "transportationManager"]));

// Dashboard overview
router.get("/overview", getDashboardOverview);

// Drivers management
router.get("/drivers", getAllDrivers);
router.get("/driver-role/:driverId", getDriverRole);
router.put("/drivers/:driverId/status", updateDriverStatus);

// Shipments management
router.get("/shipments", getAllShipments);

// Problems management
router.get("/problems", getAllProblems);
router.put("/problems/:problemId/resolve", resolveProblem);

// Schedules management
router.get("/schedules", getAllSchedules);

// Orders management
router.get("/orders", getAllOrders);
router.get("/orders/aggregation", getOrdersWithAggregation);
router.post("/orders/update-items", updateItemsAggregation);

module.exports = router;
