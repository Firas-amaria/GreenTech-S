// customerController.js

const { DateTime } = require("luxon");
const { admin, db } = require("../firebaseConfig");

// getSavedAddresses ===
async function getSavedAddress (req, res) {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    const data = userDoc.data();
    const address = data.address || "";
    res.json({ address });
  } catch (err) {
    console.error("Error fetching address:", err);
    res.status(500).json({ error: "Failed to load address." });
  }
};



async function getCustomerOrders(req, res) {
  try {
    const { uid } = req.user;
    const customerSnap = await db.collection("customers").doc(uid).get();

    if (!customerSnap.exists) {
      return res.json([]); // customer doesn't exist yet
    }

    const customerData = customerSnap.data();
    const orderIds = customerData.orders || [];

    if (!orderIds.length) {
      return res.json([]); // no orders
    }

    // load all orders
    const orderDocs = await Promise.all(orderIds.map(id => db.collection("orders").doc(id).get()));
    const orders = orderDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(orders);
  } catch (err) {
    console.error("Failed to fetch customer orders:", err);
    res.status(500).json({ error: "Failed to load orders." });
  }
}


// =================== PROFILE ===================
async function getCustomerProfile(req, res) {
  try {
    const doc = await db.collection("users").doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).send({ error: "User not found" });
    res.json({ profile: doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function updateCustomerProfile(req, res) {
  try {
    const updates = req.body;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("users").doc(req.user.uid).update(updates);
    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}














module.exports = {
 
  getSavedAddress,
  getCustomerProfile,
  getCustomerOrders,
};
