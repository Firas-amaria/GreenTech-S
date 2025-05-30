const { db, admin } = require('../firebaseConfig');

// --- Farm Handlers ---
async function listFarms(req, res) {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('farms').where('farmerId', '==', uid).get();
    const farms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(farms);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getFarm(req, res) {
  try {
    const { farmId } = req.params;
    const doc = await db.collection('farms').doc(farmId).get();
    if (!doc.exists || doc.data().farmerId !== req.user.uid) return res.status(404).send({ error: 'Farm not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// --- Crop Handlers ---
async function listCrops(req, res) {
  try {
    const { farmId } = req.params;
    const snapshot = await db.collection('crops').where('farmId', '==', farmId).get();
    const crops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(crops);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getCrop(req, res) {
  try {
    const { cropId } = req.params;
    const doc = await db.collection('crops').doc(cropId).get();
    if (!doc.exists || doc.data().farmerId !== req.user.uid) return res.status(404).send({ error: 'Crop not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function reportCrop(req, res) {
  try {
    const uid = req.user.uid;
    const { farmId, itemId, status } = req.body;
    const data = { farmId, itemId, status, farmerId: uid, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('crops').add(data);
    res.status(201).send({ message: 'Crop reported', cropId: ref.id });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
}

async function updateCrop(req, res) {
  try {
    const { cropId } = req.params;
    const { status } = req.body;
    const docRef = db.collection('crops').doc(cropId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().farmerId !== req.user.uid) return res.status(404).send({ error: 'Crop not found' });
    await docRef.update({ status });
    res.status(204).end();
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
}

async function deleteCrop(req, res) {
  try {
    const { cropId } = req.params;
    const docRef = db.collection('crops').doc(cropId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().farmerId !== req.user.uid) return res.status(404).send({ error: 'Crop not found' });
    await docRef.delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getCropReport(req, res) {
  try {
    const { cropId } = req.params;
    const doc = await db.collection('crops').doc(cropId).get();
    if (!doc.exists || doc.data().farmerId !== req.user.uid) return res.status(404).send({ error: 'Crop not found' });
    const { itemId, status } = doc.data();
    res.json({ itemId, status });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// --- Shipment Handlers ---
async function listShipments(req, res) {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('shipments').where('farmerId','==',uid).get();
    const shipments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(shipments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    const doc = await db.collection('shipments').doc(shipmentId).get();
    if (!doc.exists || doc.data().farmerId !== req.user.uid) return res.status(404).send({ error: 'Shipment not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function createShipment(req, res) {
  try {
    const uid = req.user.uid;
    const { farmId, items } = req.body;
    const data = { farmerId: uid, farmId, items, status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('shipments').add(data);
    res.status(201).send({ shipmentId: ref.id });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
}

async function generateBarcode(req, res) {
  try {
    const { shipmentId } = req.params;
    const barcodeUrl = `https://example.com/barcodes/${shipmentId}.png`;
    res.json({ barcodeUrl });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// --- Item Handlers ---
async function listItems(req, res) {
  try {
    const snapshot = await db.collection('items').get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getItem(req, res) {
  try {
    const { itemId } = req.params;
    const doc = await db.collection('items').doc(itemId).get();
    if (!doc.exists) return res.status(404).send({ error: 'Item not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// --- Rating Handlers ---
async function listRatings(req, res) {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('ratings')
      .where('targetType', '==', 'farmer')
      .where('targetId', '==', uid)
      .get();
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(ratings);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getRating(req, res) {
  try {
    const { ratingId } = req.params;
    const doc = await db.collection('ratings').doc(ratingId).get();
    if (!doc.exists) return res.status(404).send({ error: 'Rating not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function createRating(req, res) {
  try {
    const { targetId, stars, comment } = req.body;
    const data = { targetId, targetType: 'farmer', stars, comment, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('ratings').add(data);
    res.status(201).send({ ratingId: ref.id });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
}

// --- Dashboard & Performance Handlers ---
async function getDashboard(req, res) {
  try {
    const uid = req.user.uid;
    const farmsSnap = await db.collection('farms').where('farmerId','==',uid).get();
    const cropsSnap = await db.collection('crops').where('farmerId','==',uid).get();
    const shipmentsSnap = await db.collection('shipments').where('farmerId','==',uid).get();
    const total = cropsSnap.size;
    const harvested = cropsSnap.docs.filter(d => d.data().status === 'harvested').length;
    const rate = total ? harvested / total : 0;
    res.json({ totalFarms: farmsSnap.size, totalCrops: total, harvestRate: rate, totalShipments: shipmentsSnap.size });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getPerformance(req, res) {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('ratings')
      .where('targetType', '==', 'farmer')
      .where('targetId', '==', uid)
      .get();
    const ratings = snapshot.docs.map(doc => doc.data().stars);
    const average = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0;
    res.json({ average });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

module.exports = {
  listFarms,
  getFarm,
  listCrops,
  getCrop,
  reportCrop,
  updateCrop,
  deleteCrop,
  getCropReport,
  listShipments,
  getShipment,
  createShipment,
  generateBarcode,
  listItems,
  getItem,
  listRatings,
  getRating,
  createRating,
  getDashboard,
  getPerformance
};