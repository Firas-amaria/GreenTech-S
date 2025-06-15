const { admin, db } = require("../firebaseConfig");
const { emailDocuments } = require("../info/contactInfo");

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



const getEmailDocumnets = async (req, res) => {
  try {
    return res.send({ emailDocuments });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
};



// Get employment application from 'employmentApplications/{uid}' for user itself
// Returns only status
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
    res.send(applicationDoc.data().status);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}

module.exports = {
  getProfile,
  getEmailDocumnets,
  getApplication
  
};
