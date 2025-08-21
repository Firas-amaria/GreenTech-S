// routes/tmPackagesRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");

const {
  // package schema
  getPackageSchema,
  addPackageField,
  updatePackageField,
  deletePackageField,

  // packages
  listTmPackages,
  createTmPackage,
  upsertTmPackageById,
  deleteTmPackage,

  // container schema
  getContainerSchema,
  addContainerField,
  updateContainerField,
  deleteContainerField,

  // containers
  listContainers,
  createContainer,
  upsertContainerById,
  deleteContainer,

  // seed
  seedTmDefaults,
} = require("../controllers/tmPackagesController");

// ---- Package schema
router.get("/package-schema", authenticate, getPackageSchema);
router.post("/package-schema/fields", authenticate, /*requireRole("admin"),*/ addPackageField);
router.patch("/package-schema/fields/:fieldId", authenticate, /*requireRole("admin"),*/ updatePackageField);
router.delete("/package-schema/fields/:fieldId", authenticate, /*requireRole("admin"),*/ deletePackageField);

// ---- Packages
router.get("/packages", authenticate, listTmPackages);
router.post("/packages", authenticate, /*requireRole("admin"),*/ createTmPackage);
router.put("/packages/:id", authenticate, /*requireRole("admin"),*/ upsertTmPackageById);
router.delete("/packages/:id", authenticate, /*requireRole("admin"),*/ deleteTmPackage);

// ---- Container schema
router.get("/container-schema", authenticate, getContainerSchema);
router.post("/container-schema/fields", authenticate, /*requireRole("admin"),*/ addContainerField);
router.patch("/container-schema/fields/:fieldId", authenticate, /*requireRole("admin"),*/ updateContainerField);
router.delete("/container-schema/fields/:fieldId", authenticate, /*requireRole("admin"),*/ deleteContainerField);

// ---- Containers
router.get("/containers", authenticate, listContainers);
router.post("/containers", authenticate, /*requireRole("admin"),*/ createContainer);
router.put("/containers/:id", authenticate, /*requireRole("admin"),*/ upsertContainerById);
router.delete("/containers/:id", authenticate, /*requireRole("admin"),*/ deleteContainer);

// ---- Seed (optional)
router.post("/seed-tm", authenticate, /*requireRole("admin"),*/ seedTmDefaults);

module.exports = router;
