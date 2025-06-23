const { admin, db } = require("../firebaseConfig");

// Admin API to approve a pending employee and move them into their role collection
const roleCollectionMap = {
  farmer: "farmers",
  deliverer: "deliverers",
  "industrial-driver": "industrialDrivers",
  sorting: "sorters",
  picker: "pickers",
  "warehouse-worker": "warehouseWorkers"
};

const approveEmployee = async (req, res) => {
  const { uid, role } = req.body;
  const pendingRef = db.collection("Pending-employment").doc(uid);

  try {
    // 1. Fetch the pending application
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      return res.status(404).send({ error: "Pending application not found" });
    }
    const data = pendingSnap.data();

    // 2. Update Firebase Auth custom claim
    await admin.auth().setCustomUserClaims(uid, { role });

    // 3. Copy into the new role-specific collection
    const targetCol = roleCollectionMap[role];
    if (!targetCol) {
      return res.status(400).send({ error: `Unknown role: ${role}` });
    }
    await db.collection(targetCol).doc(uid).set({
      ...data,
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Update top-level users collection with new role
    await db.collection("users").doc(uid).set(
      { role, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // 5. Delete the pending document
    await pendingRef.delete();

    res.send({ message: `User approved as ${role}` });
  } catch (error) {
    console.error("Error approving employee:", error);
    res.status(500).send({ error: error.message });
  }
};


// Allows an admin to update another user's role in Firebase Authentication and Firestore
// Requires admin authentication via middleware
// Expected body: { uid: string, role: 'customer' | 'employee' | 'admin' | 'pendingEmployee' }
const setRole = async (req, res) => {
  const { uid, role } = req.body;

  try {
    // Set custom user claims in Firebase Auth (used for role-based auth)
    await admin.auth().setCustomUserClaims(uid, { role });

    // Update the user's role in Firestore document
    await db.collection("users").doc(uid).update({
      role,
    });

    res.send({ message: `Role for user ${uid} updated to ${role}` });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// Get employment application from 'employmentApplications/{uid}' for admin
// Returns only relevant fields (excludes createdAt, uid)
const getApplication = async (req, res) => {
  const uid = req.user.uid;

  try {
    // Fetch application document from 'employmentApplications' collection
    const applicationDoc = await db
      .collection("employmentApplications")
      .doc(uid)
      .get();

    // If the document doesn't exist, return 404
    if (!applicationDoc.exists)
      return res.status(404).send({ error: "Application not found" });

    // Return the full application data without filtering
    res.send(applicationDoc.data());
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// Fetch any user's profile by UID (admin-only route)
const getProfileById = async (req, res) => {
  const uid = req.params.id;

  try {
    // Get the user document from Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    // If user doesn't exist
    if (!userDoc.exists) {
      return res.status(404).send({ error: "User not found" });
    }

    // Return user data (including createdAt, role, etc.)
    res.send(userDoc.data());
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// Fetch all employment applications from Firestore (admin only)
const getAllApplications = async (req, res) => {
  try {
    const snapshot = await db.collection("employmentApplications").get();
    const applications = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    res.send(applications);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// Update a specific user's profile fields (admin only)
const updateUser = async (req, res) => {
  const uid = req.params.id;
  const updates = req.body;

  try {
    await db.collection("users").doc(uid).update(updates);
    res.send({ message: `User ${uid} updated.` });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// Delete a user from Firebase Auth and Firestore (admin only)
const deleteUser = async (req, res) => {
  const uid = req.params.id;

  try {
    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete from Firestore
    await db.collection("users").doc(uid).delete();
    await db.collection("employmentApplications").doc(uid).delete();

    res.send({ message: `User ${uid} deleted.` });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// Fetch all users from 'users' collection (admin only)
const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  approveEmployee,
  setRole,
  getApplication,
  getProfileById,
  getAllApplications,
  updateUser,
  deleteUser,
  getAllUsers,
  getAllApplications,
};
