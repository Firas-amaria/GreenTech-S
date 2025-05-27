const { admin } = require('../firebaseConfig');

// Middleware to validate Firebase Auth token
const authenticate = async (req, res, next) => { //  ?????? --- check if need do to user is the same user using this token
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).send({ error: 'No token provided' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).send({ error: 'Invalid token' });
  }
};

// Middleware to check if user's role is included in allowed roles array
const requireRole = (roles) => {
  return (req, res, next) => {
    // Ensure roles is always an array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user's role is allowed
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).send({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { authenticate, requireRole };