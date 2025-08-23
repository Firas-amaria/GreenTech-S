const express = require("express");
const router = express.Router();

const {
  authenticate /*, requireRole */,
} = require("../services/authMiddleware");
const {
  getDriverSchedule,
  putNextSchedule,
} = require("../controllers/driverController");

// All routes require auth
router.use(authenticate);

// If you want role-gating, uncomment and adjust the role string:
// router.use(requireRole("driver")); // or "deliverer" / "transporter"

// GET /api/driver/schedule
router.get("/getDriverSchedule", getDriverSchedule);

// PUT /api/driver/schedule/next
router.put("/putNextSchedule", putNextSchedule);

module.exports = router;
