const { admin, db } = require("../firebaseConfig");

// Register a customer with basic details and default 'customer' role
const registerCustomer = async (req, res) => {
  const {
    uid,
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
    // Create Firebase Auth user
    // const userRecord = await admin.auth().createUser({ email, password });

    // Set custom claim 'role' to 'customer'
    await admin.auth().setCustomUserClaims(uid, { role: "customer" });

    // Store customer details in Firestore
    await db.collection("users").doc(uid).set({
      role: "customer",
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      address,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).send({ firstName, lastName });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// Get role from custom claims or Firestore
const getUserRole = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ error: "Missing or invalid token" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    // 1. Verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Check Firestore for user's role (preferred)
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: "User not found in Firestore" });
    }

    const userData = userDoc.data();
    const role = userData.role || decodedToken.role || "unknown";

    return res.status(200).send({ role });
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).send({ error: "Unauthorized" });
  }
};

// Helper function to validate extraFields based on position
const validateExtraFields = (position, fields) => {
  const isString = (val) => typeof val === "string";
  const isBoolean = (val) => typeof val === "boolean";
  const isNumber = (val) => typeof val === "number";

  switch (position) {
    case "farmer":
      return (
        isString(fields.licenseType) &&
        isString(fields.fieldArea) &&
        isString(fields.crops) &&
        isString(fields.pickupAddress) &&
        isBoolean(fields.agriculturalInsurance) 

      );

    case "deliverer":
      return (
        isString(fields.licenseType) &&
        isString(fields.vehicleType) &&
        isNumber(fields.vehicleCapacity) &&
        isString(fields.driverLicenseNumber) &&
        isString(fields.vehicleRegistrationNumber) &&
        isBoolean(fields.insurance) &&

        typeof fields.availabilitySchedule === "object" &&
        (position === "TruckDriver" ? isBoolean(fields.refrigerated) : true)
      );

    case "industrial-driver":
      return (
        isString(fields.licenseType) &&
        isString(fields.vehicleType) &&
        isNumber(fields.vehicleCapacity) &&
        isString(fields.driverLicenseNumber) &&
        isString(fields.vehicleRegistrationNumber) &&
        isBoolean(fields.insurance) &&
        isBoolean(fields.refrigerated) &&

        typeof fields.availabilitySchedule === "object" &&
        (position === "TruckDriver" ? isBoolean(fields.refrigerated) : true)
      );

    case "sorting":
    case "picker":
    case "warehouse":

      return true; // אין שדות נוספים

    default:
      return false;
  }
};

// request employment (pending approval) with extra fields by position
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

  console.log("Request Employment Data:", req.body);

  let userId = ""; // Assuming authentication middleware sets req.user
  userId = "WkhbrMJ8qiUKf3Ddo815SJbdOUB2";
  if (!userId) {
    return res
      .status(401)
      .send({ error: "Unauthorized. No user ID provided." });
  }

  if (!acceptAgreement || !certifyAccuracy) {
    return res.status(400).send({ error: "All agreements must be accepted." });
  }

  console.log("Position:", position);
  console.log("Extra Fields:", extraFields);

  if (!validateExtraFields(position, extraFields)) {
    return res.status(400).send({
      error: "Invalid or missing extra fields for selected position.",
    });
  }

  try {
    // Optional: Validate that user exists in Firebase Auth
    const userRecord = await admin.auth().getUser(userId);

    // Set custom user claims
    await admin.auth().setCustomUserClaims(userId, { role: "pendingEmployee" });

    // Update or create user data in Firestore
    await db.collection("users").doc(userId).set(
      {
        firstName,
        lastName,
        email,
        phone,
        address,
        birthDate,
        position,
        extraFields,
        role: "pendingEmployee",
        status: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // Ensures existing fields are preserved unless overwritten
    );
    // Save full application with position-specific fields
    await db
      .collection("employmentApplications")
      .doc(userRecord.uid)
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
      message:
        "Application submitted successfully. We will contact you shortly.",
      uid: userRecord.uid,
    });
  } catch (error) {
    res.status(400).send({ error: error.message, success: false });
  }
};

const login = async (req, res) => {
  const { uid } = req.body;
  try {
    const user_docuement = await db.collection("users").doc(uid).get();
    //check if user not exist
    if (!user_docuement.exists) {
      return res
        .status(404)
        .json({ message: "User of this id is not exist!!!" });
    }
    //fetched user object
    const user = user_docuement.data();
    // console.log("user", user);
    res.status(200).json({
      role: user.role,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("something went wrong", err);
    res.status(500).json({ message: "something went wrong!!!" });
  }
};

module.exports = {
  registerCustomer,
  requestEmployment,
  getUserRole,
  login,
};
