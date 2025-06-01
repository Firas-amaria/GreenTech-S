const { admin, db } = require("../firebaseConfig");

// Get  user's profile from Firestore

const getProfile = async (req, res) => {
  const uid = req.user.uid;

  try {
    // Fetch user document from 'users' collection
    const userDoc = await db.collection("users").doc(uid).get();

    // If the document doesn't exist, return 404
    if (!userDoc.exists)
      return res.status(404).send({ error: "User not found" });

    // Return filtered profile data
    const profileData = filterFields(userDoc.data());
    res.send(profileData);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// Helper to remove unwanted fields from a document (e.g., createdAt, uid)
const filterFields = (data) => {
  const { createdAt, uid, ...rest } = data; // ???? -createdAt
  return rest;
};

module.exports = {
  getProfile,
};
