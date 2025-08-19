// routes/packagesRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const { upsertPackageById, seedDefaultPackages, listPackages } = require("../controllers/packagesController");

// Read (auth optional—your call)
router.get("/get-packages", authenticate, listPackages);

// Admin writes
router.post("/seed", authenticate, seedDefaultPackages);
router.put("/:id",  authenticate, upsertPackageById);
// If you prefer POST instead of PUT, you can expose both:
router.post("/:id", authenticate,  upsertPackageById);

module.exports = router;
