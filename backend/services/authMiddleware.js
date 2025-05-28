const { admin, db } = require("../firebaseConfig"); // make sure db = Firestore instance

// Middleware: Authenticate and fetch user's Firestore profile (including role)
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).send({ error: "No token provided" });

  try {
    // Verify token
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };

    // Fetch user role from Firestore
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) {
      return res.status(403).send({ error: "User profile not found" });
    }

    const userData = userDoc.data();

    // Explicitly check for role
    if (!userData.role) {
      throw new Error("unauthenticated user ");
    }

    req.user.role = userData.role;

    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).send({ error: "Invalid token" });
  }
};

// Middleware to check if user's role is included in allowed roles array
const requireRole = (roles) => {
  return (req, res, next) => {
    // Ensure roles is always an array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user's role is allowed
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).send({ error: "Insufficient permissions" });
    }

    next();
  };
};

module.exports = { authenticate, requireRole };
