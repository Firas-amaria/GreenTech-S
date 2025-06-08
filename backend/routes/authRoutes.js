const express = require("express");
const router = express.Router();
const {
  registerCustomer,
  registerEmployee,
  getUserRole,
  login,
} = require("../controllers/authController");

// Customer and employee registration routes
router.post("/register-customer", registerCustomer); // for customers
router.post("/register-employee", registerEmployee); // for job applicants
router.post("/get-role", getUserRole);
router.post("/login", login); // login
module.exports = router;
