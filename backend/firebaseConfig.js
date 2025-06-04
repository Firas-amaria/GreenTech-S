// Firebase Admin SDK initialization and Firestore DB setup
require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

//connect to firebase DB
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

module.exports = { admin, db };
