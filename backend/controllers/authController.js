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
    await admin
      .auth()
      .setCustomUserClaims(uid, { role: "customer" });

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

// Helper function to validate extraFields based on position
const validateExtraFields = (position, fields) => {
  const isString = (val) => typeof val === "string";
  const isBoolean = (val) => typeof val === "boolean";
  const isNumber = (val) => typeof val === "number";

  switch (position) {
    case "Farmer":
      return isBoolean(fields.agriculturalInsurance);

    case "Delivery":
    case "TruckDriver":
      return (
        isString(fields.licenseType) &&
        isString(fields.vehicleType) &&
        isNumber(fields.vehicleCapacity) &&
        (fields.vehicleExtraCapacity === undefined ||
          isNumber(fields.vehicleExtraCapacity)) &&
        isString(fields.driverLicenseNumber) &&
        isString(fields.vehicleRegistrationNumber) &&
        isBoolean(fields.insurance) &&
        typeof fields.availabilitySchedule === "object" &&
        (position === "TruckDriver" ? isBoolean(fields.refrigerated) : true)
      );

    case "LogisticsCenterWorker":
      return true; // אין שדות נוספים

    default:
      return false;
  }
};

// Register an employee (pending approval) with extra fields by position
const registerEmployee = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    birthDate,
    position,
    password,
    confirmPassword,
    extraFields, // dynamic fields depending on selected position,
    acceptAgreement,
    certifyAccuracy,
  } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send({ error: "Passwords do not match" });
  }
  if (!acceptAgreement || !certifyAccuracy) {
    return res.status(400).send({ error: "All agreements must be accepted." });
  }
  if (!validateExtraFields(position, extraFields)) {
    return res.status(400).send({
      error: "Invalid or missing extra fields for selected position.",
    });
  }

  try {
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({ email, password });

    // Set custom claim 'role' to 'pendingEmployee'
    await admin
      .auth()
      .setCustomUserClaims(userRecord.uid, { role: "pendingEmployee" });

    // Save basic user info to users collection
    await db.collection("users").doc(userRecord.uid).set({
      firstName,
      lastName,
      email,
      phone,
      address,
      role: "pendingEmployee",
      position,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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

    res.status(201).send({ uid: userRecord.uid });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const login = async (req,res)=>{
  const {uid} = req.body;
  try{
  const user_docuement = await db.collection("users").doc(uid).get();
  //check if user not exist 
  if(!user_docuement){
    return res.status(404).json({message:"User of this id is not exist!!!"});
  }
  //fetched user object 
  const user = doc.data();
  res.status(200).json({"message":user.role})
  }catch(err){
    console.error("something went wrong",err);
    res.status(500).json({message:"something went wrong!!!"})
  }
}

module.exports = {
  registerCustomer,
  registerEmployee,
  login,
};
