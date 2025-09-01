// routes/tmRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");

const {
  getActiveDeliverersForShift,
  getAllDeliverers,
  getActiveDeliverers,
  getActivePerShiftDeliverers,
  getDelivererById,
  updateDeliverer,
  getDelivererCapacity,
  getActiveDeliverersForShifts,
  getActiveDeliverersUpcoming,

  getAllIndustrialDrivers,
  getActiveIndustrialDrivers,
  getActivePerShiftIndustrialDrivers,
  getIndustrialDriverById,
  updateIndustrialDriver,
} = require("../controllers/tmController.js");

// ---------------------- DELIVERERS ----------------------
router.post("/deliverers/active-for-shift", authenticate, getActiveDeliverersForShift);
router.get("/deliverers", authenticate, getAllDeliverers);
router.get("/deliverers/active", authenticate, getActiveDeliverers);
router.get("/deliverers/active-per-shift", authenticate, getActivePerShiftDeliverers);
router.get("/deliverers/:uid", authenticate, getDelivererById);
router.put("/deliverers/:uid", authenticate, updateDeliverer);
router.get("/deliverers/:uid/capacity", authenticate, getDelivererCapacity);
router.post("/deliverers/active-for-shift", authenticate, getActiveDeliverersForShift);   // existing single
router.post("/deliverers/active-for-shifts", authenticate, getActiveDeliverersForShifts); // NEW bulk
router.get("/deliverers/active-upcoming", authenticate, getActiveDeliverersUpcoming);     // NEW list of next N shifts


// ----------------- INDUSTRIAL DRIVERS -----------------
router.get("/industrial-drivers", authenticate, getAllIndustrialDrivers);
router.get("/industrial-drivers/active", authenticate, getActiveIndustrialDrivers);
router.get("/industrial-drivers/active-per-shift", authenticate, getActivePerShiftIndustrialDrivers);
router.get("/industrial-drivers/:id", authenticate, getIndustrialDriverById);
router.put("/industrial-drivers/:id", authenticate, updateIndustrialDriver);

module.exports = router;
