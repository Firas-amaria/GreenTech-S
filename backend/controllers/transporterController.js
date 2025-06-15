const { db } = require("../firebaseConfig");

// Create or update transporter profile
async function upsertTransporterProfile(req, res) {
  try {
    const {
      name,
      phone,
      licenseType,
      vehicleType,
      vehicleCapacity,
      driverLicenseNumber,
      vehicleRegistrationNumber,
      insurance,
      refrigerated,
      acceptAgreement,
      certifyAccuracy,
      availabilitySchedule,
      regions,
      availability,
      currentLocation,
    } = req.body;

    const profile = {
      userId: req.user.uid,
      name,
      phone,
      licenseType,
      vehicleType,
      vehicleCapacity,
      driverLicenseNumber,
      vehicleRegistrationNumber,
      insurance,
      refrigerated,
      acceptAgreement,
      certifyAccuracy,
      availabilitySchedule,
      regions,
      availability,
      currentLocation,
      updatedAt: new Date().toISOString(),
    };

    await db
      .collection("transporters")
      .doc(req.user.uid)
      .set(profile, { merge: true });
    res.status(200).json({ message: "Profile saved", profile });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// Get own transporter profile
async function getMyTransporterProfile(req, res) {
  try {
    const doc = await db.collection("transporters").doc(req.user.uid).get();
    if (!doc.exists)
      return res.status(404).send({ error: "Profile not found" });
    res.json({ profile: doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// List all available shipments
async function listAvailableShipments(req, res) {
  try {
    const snapshot = await db
      .collection("shipments")
      .where("status", "==", "pending")
      .get();

    const shipments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json({ shipments });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// Accept a shipment
async function acceptShipment(req, res) {
  try {
    const { shipmentId } = req.params;

    const shipmentRef = db.collection("shipments").doc(shipmentId);
    const shipmentDoc = await shipmentRef.get();

    if (!shipmentDoc.exists)
      return res.status(404).send({ error: "Shipment not found" });

    await shipmentRef.update({
      status: "assigned",
      driver: req.user.uid,
      assignedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Shipment accepted" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// List transporter's own shipments
async function getMyShipments(req, res) {
  try {
    const snapshot = await db
      .collection("shipments")
      .where("driver", "==", req.user.uid)
      .get();

    const shipments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json({ shipments });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

// Update status of shipment (picked_up, in_transit, delivered)
async function updateShipmentStatus(req, res) {
  try {
    const { shipmentId } = req.params;
    const { status } = req.body;

    const allowed = ["assigned", "picked_up", "in_transit", "delivered"];
    if (!allowed.includes(status)) {
      return res.status(400).send({ error: "Invalid status" });
    }

    await db.collection("shipments").doc(shipmentId).update({
      status,
      statusUpdatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Status updated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

module.exports = {
  upsertTransporterProfile,
  getMyTransporterProfile,
  listAvailableShipments,
  acceptShipment,
  getMyShipments,
  updateShipmentStatus,
};
