// customerController.js

const { db, admin } = require("../firebaseConfig");

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

// =================== ITEMS ===================
async function listItems(req, res) {
  try {
    const snapshot = await db.collection("items").get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ items });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getItem(req, res) {
  try {
    const { itemId } = req.params;
    const doc = await db.collection("items").doc(itemId).get();
    if (!doc.exists) return res.status(404).send({ error: "Item not found" });
    res.json({ item: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function searchItems(req, res) {
  try {
    const { q } = req.query;
    let query = db.collection("items");
    if (q)
      query = query.where("name", ">=", q).where("name", "<=", q + "\uf8ff");
    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ items });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== CART ===================
async function getCart(req, res) {
  try {
    const doc = await db.collection("carts").doc(req.user.uid).get();
    res.json({ cart: doc.exists ? doc.data().items : [] });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function addToCart(req, res) {
  try {
    const { itemId, quantity } = req.body;
    const ref = db.collection("carts").doc(req.user.uid);
    await ref.set(
      {
        items: admin.firestore.FieldValue.arrayUnion({ itemId, quantity }),
      },
      { merge: true }
    );
    res.json({ message: "Added to cart" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function updateCartItem(req, res) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const ref = db.collection("carts").doc(req.user.uid);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ error: "Cart not found" });
    let items = doc.data().items || [];
    items = items.map((i) => (i.itemId === itemId ? { itemId, quantity } : i));
    await ref.update({ items });
    res.json({ message: "Cart updated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function removeCartItem(req, res) {
  try {
    const { itemId } = req.params;
    const ref = db.collection("carts").doc(req.user.uid);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ error: "Cart not found" });
    let items = doc.data().items || [];
    items = items.filter((i) => i.itemId !== itemId);
    await ref.set({ items });
    res.json({ message: "Removed from cart" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function clearCart(req, res) {
  try {
    await db.collection("carts").doc(req.user.uid).delete();
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== ORDERS ===================
async function createOrder(req, res) {
  try {
    const { items, address, paymentMethod } = req.body;
    const order = {
      customerId: req.user.uid,
      items,
      address,
      paymentMethod,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("orders").add(order);
    await ref.update({ id: ref.id });
    res.status(201).json({ orderId: ref.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getOrderHistory(req, res) {
  try {
    const snapshot = await db
      .collection("orders")
      .where("customerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;
    const doc = await db.collection("orders").doc(orderId).get();
    if (!doc.exists) return res.status(404).send({ error: "Order not found" });
    res.json({ order: doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function cancelOrder(req, res) {
  try {
    const { orderId } = req.params;
    await db.collection("orders").doc(orderId).update({ status: "cancelled" });
    res.json({ message: "Order cancelled" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function trackOrder(req, res) {
  try {
    const { orderId } = req.params;
    const doc = await db.collection("orders").doc(orderId).get();
    if (!doc.exists) return res.status(404).send({ error: "Order not found" });
    res.json({ status: doc.data().status });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== FAVORITES ===================
async function listFavorites(req, res) {
  try {
    const doc = await db.collection("favorites").doc(req.user.uid).get();
    res.json({ favorites: doc.exists ? doc.data().items : [] });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function addFavorite(req, res) {
  try {
    const { itemId } = req.params;
    await db
      .collection("favorites")
      .doc(req.user.uid)
      .set(
        {
          items: admin.firestore.FieldValue.arrayUnion(itemId),
        },
        { merge: true }
      );
    res.json({ message: "Added to favorites" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function removeFavorite(req, res) {
  try {
    const { itemId } = req.params;
    const ref = db.collection("favorites").doc(req.user.uid);
    const doc = await ref.get();
    let items = doc.exists ? doc.data().items : [];
    items = items.filter((i) => i !== itemId);
    await ref.set({ items });
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== RATINGS ===================
async function submitProductRating(req, res) {
  try {
    const { productId, rating, comment } = req.body;
    const ref = db.collection("ratings").doc(`product_${productId}`);
    const newRating = {
      customerId: req.user.uid,
      rating,
      comment,
      ratedAt: new Date().toISOString(),
    };
    await ref.set(
      { ratings: admin.firestore.FieldValue.arrayUnion(newRating) },
      { merge: true }
    );
    res.json({ message: "Product rated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function submitFarmerRating(req, res) {
  try {
    const { farmerId, rating, comment } = req.body;
    const ref = db.collection("ratings").doc(`farmer_${farmerId}`);
    const newRating = {
      customerId: req.user.uid,
      rating,
      comment,
      ratedAt: new Date().toISOString(),
    };
    await ref.set(
      { ratings: admin.firestore.FieldValue.arrayUnion(newRating) },
      { merge: true }
    );
    res.json({ message: "Farmer rated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== LOYALTY ===================
async function getLoyaltyPoints(req, res) {
  try {
    const doc = await db.collection("loyalty").doc(req.user.uid).get();
    res.json({ points: doc.exists ? doc.data().points : 0 });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function redeemPoints(req, res) {
  try {
    const { points } = req.body;
    const ref = db.collection("loyalty").doc(req.user.uid);
    const doc = await ref.get();
    let current = doc.exists ? doc.data().points : 0;
    if (points > current)
      return res.status(400).send({ error: "Not enough points" });
    await ref.update({ points: current - points });
    res.json({ message: "Points redeemed" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== COUPONS ===================
async function listCoupons(req, res) {
  try {
    const snapshot = await db.collection("coupons").get();
    const coupons = snapshot.docs.map((doc) => ({
      code: doc.id,
      ...doc.data(),
    }));
    res.json({ coupons });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function applyCoupon(req, res) {
  try {
    const { code } = req.body;
    const doc = await db.collection("coupons").doc(code).get();
    if (!doc.exists) return res.status(404).send({ error: "Coupon not found" });
    res.json({ discount: doc.data().discount });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== SUPPORT ===================
async function submitSupportTicket(req, res) {
  try {
    const { subject, message } = req.body;
    const ticket = {
      customerId: req.user.uid,
      subject,
      messages: [
        { from: "customer", text: message, at: new Date().toISOString() },
      ],
      status: "open",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("supportTickets").add(ticket);
    await ref.update({ id: ref.id });
    res.status(201).json({ ticketId: ref.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getSupportTickets(req, res) {
  try {
    const snapshot = await db
      .collection("supportTickets")
      .where("customerId", "==", req.user.uid)
      .get();
    const tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ tickets });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function addSupportReply(req, res) {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const ref = db.collection("supportTickets").doc(ticketId);
    await ref.update({
      messages: admin.firestore.FieldValue.arrayUnion({
        from: "customer",
        text: message,
        at: new Date().toISOString(),
      }),
    });
    res.json({ message: "Reply added" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== NOTIFICATIONS ===================
async function getNotifications(req, res) {
  try {
    const snapshot = await db
      .collection("notifications")
      .where("customerId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();
    const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ notifications: notes });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function markNotificationRead(req, res) {
  try {
    const { notificationId } = req.params;
    await db
      .collection("notifications")
      .doc(notificationId)
      .update({ read: true });
    res.json({ message: "Notification marked read" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== PREFERENCES ===================
async function getPreferences(req, res) {
  try {
    const doc = await db.collection("preferences").doc(req.user.uid).get();
    res.json({ preferences: doc.exists ? doc.data() : {} });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function updatePreferences(req, res) {
  try {
    await db
      .collection("preferences")
      .doc(req.user.uid)
      .set(req.body, { merge: true });
    res.json({ message: "Preferences updated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// =================== RECOMMENDATIONS ===================
async function getRecommendations(req, res) {
  try {
    const snapshot = await db
      .collection("items")
      .orderBy("caloriesPer100g", "desc")
      .limit(10)
      .get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ recommendations: items });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  listItems,
  getItem,
  searchItems,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getOrderHistory,
  getOrderById,
  cancelOrder,
  trackOrder,
  listFavorites,
  addFavorite,
  removeFavorite,
  submitProductRating,
  submitFarmerRating,
  getLoyaltyPoints,
  redeemPoints,
  listCoupons,
  applyCoupon,
  submitSupportTicket,
  getSupportTickets,
  addSupportReply,
  getNotifications,
  markNotificationRead,
  getPreferences,
  updatePreferences,
  getRecommendations,
};
