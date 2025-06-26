const { admin, db } = require("../firebaseConfig");

// Admin API to approve a pending employee and move them into their role collection
const roleCollectionMap = {
  farmer: "farmers",
  deliverer: "deliverers",
  "industrial-driver": "industrialDrivers",
  sorting: "sorters",
  picker: "pickers",
  "warehouse-worker": "warehouseWorkers",
};

async function updateApplicationStatus(req, res) {
  const uid = req.params.uid;
  const { status, role, firstName, lastName, phoneNumber } = req.body;

  if (!uid || !status) {
    return res.status(400).send({ error: "Missing UID or status" });
  }

  const validStatuses = ["pending", "contacted", "denied", "approved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).send({ error: `Invalid status: ${status}` });
  }

  const appRef = db.collection("employmentApplications").doc(uid);

  try {
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return res.status(404).send({ error: "Application not found" });
    }

    const appData = appSnap.data();

    // If status is approved, do the full approval process
    if (status === "approved") {
      const targetCol = roleCollectionMap[role];
      if (!targetCol) {
        return res.status(400).send({ error: `Unknown role: ${role}` });
      }

      // 1. Copy to the role-specific collection
      await db
        .collection(targetCol)
        .doc(uid)
        .set({
          //add name and phone number
          ...appData,
          firstName,
          lastName,
          phoneNumber,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // 2. Update user's main role
      await db.collection("users").doc(uid).set(
        {
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // For all statuses (including "approved"), update the application status
    await appRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.send({ message: `Application marked as ${status}` });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send({ error: error.message });
  }
}

// Allows an admin to update another user's role in Firebase Authentication and Firestore
// Requires admin authentication via middleware
// Expected body: { uid: string, role: 'customer' | 'employee' | 'admin' | 'pendingEmployee' }
const setRole = async (req, res) => {
  const { uid, role } = req.body;

  try {
    // Set custom user claims in Firebase Auth (used for role-based auth)
    // await admin.auth().setCustomUserClaims(uid, { role });

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

    const applications = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const uid = doc.id;
        const applicationData = doc.data();

        // Only allow 'pending' or 'contacted' statuses
        if (
          applicationData.status !== "pending" &&
          applicationData.status !== "contacted"
        ) {
          return null;
        }
        // Get the user profile using the same UID
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
          console.warn(`User profile not found for UID: ${uid}`);
          return null; // <- return null so we can filter it out
        }
        const userData = userDoc.data();
        return {
          uid: uid,
          role: applicationData.role,
          status: applicationData.status,
          submittedAt: applicationData.submittedAt,
          extraFields: applicationData.extraFields,

          // Append user profile fields
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          address: userData.address,
          birthDate: userData.birthDate,
        };
      })
    );
    res.send(applications.filter((a) => a !== null));
  } catch (error) {
    console.error("Error fetching applications:", error);
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
  updateApplicationStatus,
  setRole,
  getApplication,
  getProfileById,
  getAllApplications,
  updateUser,
  deleteUser,
  getAllUsers,
  getAllApplications,
};
