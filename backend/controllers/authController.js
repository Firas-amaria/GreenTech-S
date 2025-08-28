const { admin, db } = require("../firebaseConfig");
const bcrypt = require("bcryptjs");

// Map roles/positions to Firestore sub-collections
const roleCollectionMap = {
  customer: "customers",
  farmer: "farmers",
  deliverer: "deliverers",
  industrialDriver: "industrialDrivers",
  sorting: "sorters",
  picker: "pickers",
  "warehouse-worker": "warehouseWorkers",
};

// Register a customer: create Auth user and save profile in both 'customers' and 'users'
const registerCustomer = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    address,
    password,
    confirmPassword,
  } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send({ error: "Passwords do not match" });
  }

  try {
    // Create Auth user
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    // Hash the password before storing
    const salt = await bcrypt.genSalt(12);
    const hashPass = await bcrypt.hash(password, salt);

    // Save full profile (including hashed password) into users/{uid}
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("users").doc(uid).set({
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      address,
      role: "customer",
      password: hashPass,
      logisticCenterId: "LC-1",
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).send({ firstName, lastName });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      return res.status(400).send({ error: "Email already registered" });
    }
    res.status(400).send({ error: error.message });
  }
};

//TODO : remove after checing if this is needed
// Get role from custom claims
const getUserRole = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send({ error: "Missing or invalid token" });
  }
  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const role = decodedToken.role || "unknown";
    res.status(200).send({ role });
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send({ error: "Unauthorized" });
  }
};

// --- replace your validateExtraFields with this ---
const validateExtraFields = (position, fields) => {
  const isString = (v) => typeof v === "string" && v.trim() !== "";
  const isBoolean = (v) => typeof v === "boolean";
  const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);
  const isObject = (v) =>
    v !== null && typeof v === "object" && !Array.isArray(v);

  const toStr = (v) => (typeof v === "number" ? String(v) : v);

  // schedule is required for deliverer / industrialDriver
  const sched = fields?.scheduleBitmask;
  const scheduleValid = Array.isArray(sched) && sched.every(Number.isInteger);

  // Farmer (unchanged)
  if (position === "farmer") {
    return (
      Array.isArray(fields.lands) && isBoolean(fields.agriculturalInsurance)
    );
  }

  // DELIVERER & INDUSTRIAL DRIVER (new nested shape)
  if (position === "deliverer" || position === "industrialDriver") {
    // license & driver ids
    if (!isString(fields.licenseType)) return false;
    if (!isString(toStr(fields.driverLicenseNumber))) return false;

    // vehicle
    const v = fields.vehicle;
    if (!isObject(v)) return false;
    if (!isString(v.make) || !isString(v.model) || !isString(v.type))
      return false;
    if (!isNumber(v.year)) return false;
    if (!isString(toStr(v.registrationNumber))) return false;
    if (!isBoolean(v.insured)) return false;
    // optional: refrigerated (if present must be boolean)
    if (v.refrigerated !== undefined && !isBoolean(v.refrigerated))
      return false;

    // cargo dimensions (cm)
    const c = fields.cargoDimensionsCm;
    if (!isObject(c)) return false;
    if (!isNumber(c.width) || c.width <= 0) return false;
    if (!isNumber(c.height) || c.height <= 0) return false;
    if (!isNumber(c.length) || c.length <= 0) return false;

    // payload & speed
    if (!isNumber(fields.limitKg) || fields.limitKg <= 0) return false;
    if (!isNumber(fields.speedKmH) || fields.speedKmH <= 0) return false;

    // cost (optional, but if present must be numbers >= 0)
    if (fields.cost !== undefined) {
      const cost = fields.cost;
      if (!isObject(cost)) return false;
      if (cost.fixed !== undefined && (!isNumber(cost.fixed) || cost.fixed < 0))
        return false;
      if (cost.perKm !== undefined && (!isNumber(cost.perKm) || cost.perKm < 0))
        return false;
      if (
        cost.perStop !== undefined &&
        (!isNumber(cost.perStop) || cost.perStop < 0)
      )
        return false;
    }

    // notes (optional string)
    if (fields.notes !== undefined && typeof fields.notes !== "string")
      return false;

    // schedule required
    return scheduleValid;
  }

  // Default for other roles (picker, sorting, warehouse-worker, etc.)
  return true;
};

// --- replace your requestEmployment with this ---
const requestEmployment = async (req, res) => {
  const { role, extraFields, certifyAccuracy, submittedAt } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  const token = authHeader.split(" ")[1];

  // known roles only
  const col = roleCollectionMap[role];
  if (!col) {
    return res.status(400).send({ error: "Unknown Role" });
  }

  if (!certifyAccuracy) {
    return res.status(400).send({ error: "All agreements must be accepted." });
  }
  if (!extraFields || typeof extraFields !== "object") {
    return res
      .status(400)
      .send({ error: "Extra fields are missing or invalid." });
  }

  // Server-side defaults & coercions BEFORE validation
  const ef = { ...extraFields };

  // Ensure nested containers exist for deliverer-like roles
  if (role === "deliverer" || role === "industrialDriver") {
    ef.vehicle = ef.vehicle || {};
    ef.cargoDimensionsCm = ef.cargoDimensionsCm || {};

    // Coerce numerics
    if (ef.vehicle.year != null) ef.vehicle.year = Number(ef.vehicle.year);
    if (ef.cargoDimensionsCm.width != null)
      ef.cargoDimensionsCm.width = Number(ef.cargoDimensionsCm.width);
    if (ef.cargoDimensionsCm.height != null)
      ef.cargoDimensionsCm.height = Number(ef.cargoDimensionsCm.height);
    if (ef.cargoDimensionsCm.length != null)
      ef.cargoDimensionsCm.length = Number(ef.cargoDimensionsCm.length);
    if (ef.limitKg != null) ef.limitKg = Number(ef.limitKg);
    if (ef.speedKmH != null) ef.speedKmH = Number(ef.speedKmH);

    // Booleans
    if (ef.vehicle.insured != null)
      ef.vehicle.insured = Boolean(ef.vehicle.insured);
    if (ef.vehicle.refrigerated != null)
      ef.vehicle.refrigerated = Boolean(ef.vehicle.refrigerated);

    // Cost defaults (apply if missing OR partially provided)
    const defaultCost = { fixed: 30, perKm: 1, perStop: 1 };
    if (
      ef.cost == null ||
      ef.cost.fixed == null ||
      ef.cost.perKm == null ||
      ef.cost.perStop == null
    ) {
      ef.cost = { ...defaultCost, ...(ef.cost || {}) };
      if (ef.cost.fixed != null) ef.cost.fixed = Number(ef.cost.fixed);
      if (ef.cost.perKm != null) ef.cost.perKm = Number(ef.cost.perKm);
      if (ef.cost.perStop != null) ef.cost.perStop = Number(ef.cost.perStop);
    }
  }

  // Validate FINAL shape
  if (!validateExtraFields(role, ef)) {
    return res.status(400).send({
      error: `Invalid or missing extra fields for position '${role}'. Check required inputs.`,
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Prevent duplicate application
    const existing = await db
      .collection("employmentApplications")
      .doc(uid)
      .get();
    if (existing.exists) {
      return res.status(400).send({ error: "Application already submitted." });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Persist application (do NOT compute capacity here)
    await db
      .collection("employmentApplications")
      .doc(uid)
      .set({
        role,
        extraFields: ef,
        status: "pending",
        submittedAt: submittedAt || now,
        updatedAt: now,
      });

    return res.status(201).send({
      success: true,
      message: "Application submitted. We will contact you shortly.",
    });
  } catch (error) {
    console.error("requestEmployment error:", error);
    return res.status(400).send({ error: error.message });
  }
};

// Login: encrypt incoming password, store hash in users collection, then return role
const login = async (req, res) => {
  const { password } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    // 1. Generate a salt & hash the plain password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 2. Get user role from db > doc
    const doc = await db.collection("users").doc(uid).get();
    // 3. Save hashed password into users/{uid}.password
    if (!doc.exists) {
      return res.status(404).send({ error: "Profile not found 222" });
    }

    await db.collection("users").doc(uid).set(
      {
        password: hashedPassword,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const user = doc.data();
    // console.log("user", user);
    res.status(200).json({
      role: user.role,
      name: user.firstName + " " + user.lastName,
    });
  } catch (err) {
    console.error("Login error:", err);
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: err.message });
  }
};
module.exports = {
  registerCustomer,
  getUserRole,
  requestEmployment,
  login,
};
