const { admin, db } = require("../firebaseConfig");
const bcrypt = require("bcryptjs");

// Map roles/positions to Firestore sub-collections
const roleCollectionMap = {
  customer: "customers",
  farmer: "farmers",
  deliverer: "deliverers",
  "industrial-driver": "industrialDrivers",
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

    // Assign role
    // await admin.auth().setCustomUserClaims(uid, { role: "customer" });

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
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).send({ firstName, lastName });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

//TODO : remove after checing if this is needed
// Get role from custom claims
// const getUserRole = async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader?.startsWith("Bearer ")) {
//     return res.status(401).send({ error: "Missing or invalid token" });
//   }
//   const idToken = authHeader.split(" ")[1];

//   try {
//     const decodedToken = await admin.auth().verifyIdToken(idToken);
//     const role = decodedToken.role || "unknown";
//     res.status(200).send({ role });
//   } catch (error) {
//     console.error("Error verifying token:", error);
//     res.status(401).send({ error: "Unauthorized" });
//   }
// };

const validateExtraFields = (position, fields) => {
  const isString = (v) => typeof v === "string";
  const isBoolean = (v) => typeof v === "boolean";
  const isNumber = (v) => typeof v === "number";
  const isObject = (v) =>
    v !== null && typeof v === "object" && !Array.isArray(v);

  const sched = fields.scheduleBitmask;
  const scheduleValid = Array.isArray(sched) && sched.every(Number.isInteger);

  // Coerce numbers to string where needed
  const toStr = (v) => (typeof v === "number" ? v.toString() : v);

  switch (position) {
    case "farmer":
      return (
        Array.isArray(fields.lands) && isBoolean(fields.agriculturalInsurance)
      );

    case "deliverer":
      return (
        isString(fields.licenseType) &&
        isString(fields.vehicleMake) &&
        isString(fields.vehicleModel) &&
        isString(fields.vehicleType) &&
        isNumber(fields.vehicleYear) &&
        isNumber(fields.vehicleCapacity) &&
        isString(toStr(fields.driverLicenseNumber)) &&
        isString(toStr(fields.vehicleRegistrationNumber)) &&
        isBoolean(fields.vehicleInsurance) &&
        scheduleValid
      );

    case "industrial-driver":
      return (
        isString(fields.licenseType) &&
        isString(fields.vehicleMake) &&
        isString(fields.vehicleModel) &&
        isString(fields.vehicleType) &&
        isNumber(fields.vehicleYear) &&
        isNumber(fields.vehicleCapacity) &&
        isString(toStr(fields.driverLicenseNumber)) &&
        isString(toStr(fields.vehicleRegistrationNumber)) &&
        isBoolean(fields.vehicleInsurance) &&
        isBoolean(fields.refrigerated) &&
        scheduleValid
      );

    default:
      return true; // warehouse, picker, etc.
  }
};

// Request employment: save in role-specific, in employmentApplications AND in users
const requestEmployment = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    birthDate,
    position,
    extraFields,
    acceptAgreement,
    certifyAccuracy,
  } = req.body;

  // ─── Server-side Validation ─────────────────────────────────────────────

  // 1. Names: required, ≥2 chars, letters only
  if (!firstName || firstName.length < 2 || !/^[A-Za-z]+$/.test(firstName)) {
    return res.status(400).send({
      error: !firstName
        ? "First name is required."
        : firstName.length < 2
        ? "First name must be at least 2 characters."
        : "First name must contain only letters.",
    });
  }
  if (!lastName || lastName.length < 2 || !/^[A-Za-z]+$/.test(lastName)) {
    return res.status(400).send({
      error: !lastName
        ? "Last name is required."
        : lastName.length < 2
        ? "Last name must be at least 2 characters."
        : "Last name must contain only letters.",
    });
  }

  // 2. Email: required, Gmail only
  if (!email) {
    return res.status(400).send({ error: "Email is required." });
  }
  if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(email)) {
    return res
      .status(400)
      .send({ error: "Email must be a valid Gmail address." });
  }

  // 3. Phone: required, international format (e.g. +972509876543)
  if (!phone) {
    return res.status(400).send({ error: "Phone number is required." });
  }
  if (!/^\+\d{9,14}$/.test(phone)) {
    return res.status(400).send({
      error: "Phone must be in international format, e.g. +972509876543.",
    });
  }

  // 4. Address
  if (!address) {
    return res.status(400).send({ error: "Address is required." });
  }

  // 5. Birth date: required, ≥18 years old
  if (!birthDate) {
    return res.status(400).send({ error: "Birth date is required." });
  }
  {
    const today = new Date();
    const bd = new Date(birthDate);
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    if (age < 18) {
      return res
        .status(400)
        .send({ error: "You must be at least 18 years old to register." });
    }
  }

  // ─── End Validation ──────────────────────────────────────────────────────

  if (!acceptAgreement || !certifyAccuracy) {
    return res.status(400).send({ error: "All agreements must be accepted." });
  }

  if (!extraFields || typeof extraFields !== "object") {
    return res
      .status(400)
      .send({ error: "Extra fields are missing or invalid." });
  }

  if (!validateExtraFields(position, extraFields)) {
    return res.status(400).send({
      error: `Invalid or missing extra fields for position '${position}'. Check required inputs.`,
    });
  }

  const col = roleCollectionMap[position];
  if (!col) {
    return res.status(400).send({ error: "Unknown position" });
  }

  try {
    // Prevent duplicate application
    const existing = await db.collection(col).doc(email).get();
    if (existing.exists) {
      return res.status(400).send({ error: "Application already submitted." });
    }

    // Ensure Auth user exists (using email as password stub if needed)
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password: email,
      });
    }
    const uid = userRecord.uid;

    // Save in role-specific sub-collection
    await db.collection("Pending-employment").doc(uid).set({
      firstName,
      lastName,
      email,
      phone,
      address,
      birthDate,
      position,
      extraFields,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Save full application details
    await db
      .collection("employmentApplications")
      .doc(uid)
      .set({
        firstName,
        lastName,
        email,
        phone,
        address,
        birthDate,
        position,

        ...extraFields,
      });

    res.status(201).send({
      success: true,
      message: "Application submitted. We will contact you shortly.",
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// Login: encrypt incoming password, store hash in users collection, then return role
const login = async (req, res) => {
  const { uid, password } = req.body;

  try {
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

    const profileData = filterFields(doc.data());
    res.json(profileData);
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
