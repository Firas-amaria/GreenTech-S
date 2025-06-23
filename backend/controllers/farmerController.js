const { db, admin } = require("../firebaseConfig");
const QRCode = require("qrcode");

// --- Farm Handlers ---
async function listFarms(req, res) {
  try {
    const snapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .get();

    if (snapshot.empty) {
      return res.json({ farms: [], message: "No farms found" });
    }

    const farms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ farms });
  } catch (err) {
    console.error("Error fetching farms:", err);
    res.status(500).send({ error: err.message });
  }
}




async function getFarm(req, res) {
  try {
    const { farmId } = req.params;
    const farmDoc = await db.collection("farms").doc(farmId).get();

    if (!farmDoc.exists) {
      return res.status(404).send({ error: "Farm not found" });
    }

    const farmData = farmDoc.data();
    if (farmData.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    res.json({ farm: { id: farmDoc.id, ...farmData } });
  } catch (err) {
    console.error("Error fetching farm:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getFarmerFarms(req, res) {
  try {
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .get();

    if (farmsSnapshot.empty) {
      return res.status(404).send({ error: "No farms found for this user" });
    }

    const farms = farmsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ farms });
  } catch (err) {
    console.error("Error fetching farms:", err);
    res.status(500).send({ error: err.message });
  }
}

// List crops with computed expected harvest quantity
async function listCrops(req, res) {
  try {
    const { farmId } = req.params;
    const { status, itemId } = req.query;

    if (farmId) {
      const farmDoc = await db.collection("farms").doc(farmId).get();
      if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
        return res.status(404).send({ error: "Farm not found" });
      }
    }

    let query = db.collection("crops").where("farmerId", "==", req.user.uid);
    if (farmId) query = query.where("farmId", "==", farmId);
    if (status) query = query.where("status", "==", status);
    if (itemId) query = query.where("itemId", "==", itemId);

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({ crops: [], message: "No crops found" });
    }

    const crops = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const crop = {
          id: doc.id,
          farmId: data.farmId,
          itemId: data.itemId,
          variety: data.variety || null,
          quantity: data.quantity,
          avgRatePerUnit: data.avgRatePerUnit,
          fruitingPerPlant: data.fruitingPerPlant,
          statusPercentage: data.statusPercentage,
          agreementPercentage: data.agreementPercentage,
          status: data.status,
          plantedDate: data.plantedDate,
          expectedHarvestDate: data.expectedHarvestDate,
          notes: data.notes || "",
        };

        // Compute expected harvest quantity if not stored
        crop.expectedHarvestQuantity = data.expectedHarvestQuantity !== undefined
          ? data.expectedHarvestQuantity
          : (crop.quantity * crop.fruitingPerPlant * crop.avgRatePerUnit);

        // Attach item details
        if (crop.itemId) {
          const itemDoc = await db.collection("items").doc(crop.itemId).get();
          if (itemDoc.exists) {
            crop.itemName = itemDoc.data().name;
            crop.itemDetails = itemDoc.data();
          }
        }
        return crop;
      })
    );

    res.json({ crops });
  } catch (err) {
    console.error("Error fetching crops:", err);
    res.status(500).send({ error: err.message });
  }
}


// Get a single crop with computed expected harvest quantity
async function getCrop(req, res) {
  try {
    const { farmId, cropId } = req.params;
    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
      return res.status(404).send({ error: "Farm not found" });
    }

    const cropDoc = await db.collection("crops").doc(cropId).get();
    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }
    const data = cropDoc.data();
    if (data.farmId !== farmId || data.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    const crop = {
      id: cropDoc.id,
      farmId: data.farmId,
      itemId: data.itemId,
      variety: data.variety || null,
      quantity: data.quantity,
      avgRatePerUnit: data.avgRatePerUnit,
      fruitingPerPlant: data.fruitingPerPlant,
      statusPercentage: data.statusPercentage,
      agreementPercentage: data.agreementPercentage,
      status: data.status,
      plantedDate: data.plantedDate,
      expectedHarvestDate: data.expectedHarvestDate,
      notes: data.notes || "",
    };
    crop.expectedHarvestQuantity = data.expectedHarvestQuantity !== undefined
      ? data.expectedHarvestQuantity
      : (crop.quantity * crop.fruitingPerPlant * crop.avgRatePerUnit);

    // Attach item details
    if (crop.itemId) {
      const itemDoc = await db.collection("items").doc(crop.itemId).get();
      if (itemDoc.exists) {
        crop.itemDetails = itemDoc.data();
      }
    }

    res.json({ crop });
  } catch (err) {
    console.error("Error fetching crop:", err);
    res.status(500).send({ error: err.message });
  }
}


// Create crop with computed expected harvest quantity
async function createCrop(req, res) {
  try {
    const {
      farmId,
      itemId,
      variety,
      avgRatePerUnit,
      fruitingPerPlant,
      statusPercentage,
      agreementPercentage,
      status,
      quantity,
      plantedDate,
      expectedHarvestDate,
      notes,
    } = req.body;

    if (!farmId || !itemId || !status) {
      return res.status(400).send({ error: "Missing required fields: farmId, itemId, status" });
    }

    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
      return res.status(404).send({ error: "Farm not found or access denied" });
    }

    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).send({ error: "Item not found" });
    }

    const qty = parseInt(quantity, 10);
    const avgRate = parseFloat(avgRatePerUnit);
    const fruiting = parseInt(fruitingPerPlant, 10);

    const expectedQty = qty * fruiting * avgRate;

    const cropData = {
      farmId,
      farmerId: req.user.uid,
      itemId,
      variety: variety || null,
      avgRatePerUnit: avgRate,
      fruitingPerPlant: fruiting,
      statusPercentage: statusPercentage ? parseFloat(statusPercentage) : 0,
      agreementPercentage: agreementPercentage ? parseFloat(agreementPercentage) : 0,
      status,
      quantity: qty,
      plantedDate: plantedDate || null,
      expectedHarvestDate: expectedHarvestDate || null,
      expectedHarvestQuantity: expectedQty,
      notes: notes || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("crops").add(cropData);
    await docRef.update({ id: docRef.id });

    res.status(201).json({
      id: docRef.id,
      message: "Crop created successfully",
      crop: { id: docRef.id, ...cropData },
    });
  } catch (err) {
    console.error("Error creating crop:", err);
    res.status(500).send({ error: err.message });
  }
}


// Update crop with recomputed expected harvest quantity
async function updateCrop(req, res) {
  try {
    const { cropId } = req.params;
    const updates = req.body;

    const cropDoc = await db.collection("crops").doc(cropId).get();
    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }
    const data = cropDoc.data();
    if (data.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Prepare updated fields
    const updateData = { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (updates.avgRatePerUnit !== undefined) updateData.avgRatePerUnit = parseFloat(updates.avgRatePerUnit);
    if (updates.fruitingPerPlant !== undefined) updateData.fruitingPerPlant = parseInt(updates.fruitingPerPlant, 10);
    if (updates.statusPercentage !== undefined) updateData.statusPercentage = parseFloat(updates.statusPercentage);
    if (updates.agreementPercentage !== undefined) updateData.agreementPercentage = parseFloat(updates.agreementPercentage);
    if (updates.quantity !== undefined) updateData.quantity = parseInt(updates.quantity, 10);

    // Recompute expected harvest quantity if key fields changed
    const finalQty = updateData.quantity !== undefined ? updateData.quantity : data.quantity;
    const finalFruiting = updateData.fruitingPerPlant !== undefined ? updateData.fruitingPerPlant : data.fruitingPerPlant;
    const finalAvgRate = updateData.avgRatePerUnit !== undefined ? updateData.avgRatePerUnit : data.avgRatePerUnit;
    updateData.expectedHarvestQuantity = finalQty * finalFruiting * finalAvgRate;

    await db.collection("crops").doc(cropId).update(updateData);
    res.json({ message: "Crop updated successfully" });
  } catch (err) {
    console.error("Error updating crop:", err);
    res.status(500).send({ error: err.message });
  }
}

// Delete crop (unchanged)
async function deleteCrop(req, res) {
  try {
    const { cropId } = req.params;
    const cropDoc = await db.collection("crops").doc(cropId).get();
    if (!cropDoc.exists) return res.status(404).send({ error: "Crop not found" });
    if (cropDoc.data().farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }
    await db.collection("crops").doc(cropId).delete();
    res.json({ message: "Crop deleted successfully" });
  } catch (err) {
    console.error("Error deleting crop:", err);
    res.status(500).send({ error: err.message });
  }
}


// --- Shipment Handlers ---
async function createShipment(req, res) {
  try {
    const { farmId, destination, scheduledDate, pickupTime, driver, items } =
      req.body;

    // Validate required fields
    if (
      !farmId ||
      !destination ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).send({
        error: "Missing required fields: farmId, destination, items (array)",
      });
    }

    // Verify farm belongs to farmer
    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
      return res.status(404).send({ error: "Farm not found or access denied" });
    }

    // Calculate totals from items
    let totalWeight = 0;
    let totalVolume = 0;

    for (const item of items) {
      totalWeight += parseFloat(item.weight || 0);
      totalVolume += parseFloat(item.volume || 0);
    }

    // Create shipment document with NEW_DATA structure
    const shipmentData = {
      farmId,
      farmerId: req.user.uid,
      destination,
      //logistic_center
      scheduledDate: scheduledDate
        ? admin.firestore.Timestamp.fromDate(new Date(scheduledDate))
        : null,
      pickupTime: pickupTime || null,
      driver: driver || null,
      items,
      status: "pending",
      totalWeight,
      totalVolume,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      qrCodeData: null, // Will be generated when requested
    };

    // Add to Firestore
    const docRef = await db.collection("shipments").add(shipmentData);

    // Add the document ID to the document itself
    await docRef.update({ id: docRef.id });

    res.status(201).json({
      id: docRef.id,
      message: "Shipment created successfully",
      shipment: {
        id: docRef.id,
        ...shipmentData,
      },
    });
  } catch (err) {
    console.error("Error creating shipment:", err);
    res.status(500).send({ error: err.message });
  }
}



async function createFarmerShipment(req, res) {
  try {
    const { item, quantity, pickupTime, variety } = req.body;

    if (!item || !quantity || !pickupTime) {
      return res.status(400).send({ error: "item, quantity, and pickupTime are required" });
    }

    // Find the farmer's farm
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .limit(1)
      .get();

    if (farmsSnapshot.empty) {
      return res.status(404).send({ error: "No farm found for this farmer" });
    }

    const farmDoc = farmsSnapshot.docs[0];
    const farmId = farmDoc.id;

    const shipmentData = {
      farmerId: req.user.uid,
      farmId,
      pickupTime,
      items: [
        {
          name: item,
          quantity: parseInt(quantity),
          variety: variety || null,
        },
      ],
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const shipmentRef = await db.collection("shipments").add(shipmentData);
    await shipmentRef.update({ id: shipmentRef.id });

    res.status(201).json({
      message: "Shipment created successfully",
      shipment: { id: shipmentRef.id, ...shipmentData },
    });
  } catch (err) {
    console.error("Error creating farmer shipment:", err);
    res.status(500).send({ error: err.message });
  }
}

async function listShipments(req, res) {
  try {
    const { status, farmId } = req.query;

    let query = db
      .collection("shipments")
      .where("farmerId", "==", req.user.uid);

    if (status) {
      query = query.where("status", "==", status);
    }
    if (farmId) {
      query = query.where("farmId", "==", farmId);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    if (snapshot.empty) {
      return res.json({ shipments: [], message: "No shipments found" });
    }

    const shipments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const shipmentData = { id: doc.id, ...doc.data() };

        // Get farm details
        if (shipmentData.farmId) {
          try {
            const farmDoc = await db
              .collection("farms")
              .doc(shipmentData.farmId)
              .get();
            if (farmDoc.exists) {
              shipmentData.farmName = farmDoc.data().name;
              shipmentData.pickupAddress =
                farmDoc.data().pickupAddress || farmDoc.data().location;
            }
          } catch (err) {
            console.log(
              `Could not fetch farm ${shipmentData.farmId}:`,
              err.message
            );
          }
        }

        return shipmentData;
      })
    );

    res.json({ shipments });
  } catch (err) {
    console.error("Error fetching shipments:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    const shipmentDoc = await db.collection("shipments").doc(shipmentId).get();

    if (!shipmentDoc.exists) {
      return res.status(404).send({ error: "Shipment not found" });
    }

    const shipmentData = shipmentDoc.data();

    // Check access for farmers
    if (req.user.role === "farmer" && shipmentData.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Get farm details
    let farmDetails = {};
    if (shipmentData.farmId) {
      const farmDoc = await db
        .collection("farms")
        .doc(shipmentData.farmId)
        .get();
      if (farmDoc.exists) {
        farmDetails = farmDoc.data();
      }
    }

    res.json({
      shipment: {
        id: shipmentDoc.id,
        ...shipmentData,
        farmDetails,
      },
    });
  } catch (err) {
    console.error("Error fetching shipment:", err);
    res.status(500).send({ error: err.message });
  }
}

// ...existing code...

// Keep all the existing functions for reports, deliveries, ratings, dashboard, etc.
// (The rest of the functions remain the same as in the original file)

async function getFarmerReport(req, res) {
  try {
    const { type, limit = 10 } = req.query;

    let query = db
      .collection("reports")
      .where("farmerId", "==", req.user.uid)
      .orderBy("generatedAt", "desc")
      .limit(parseInt(limit));

    if (type) {
      query = query.where("type", "==", type);
    }

    const reportsSnapshot = await query.get();

    if (reportsSnapshot.empty) {
      return res.json({
        reports: [],
        total: 0,
        message: "No reports found",
      });
    }

    const reports = reportsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      reports,
      total: reports.length,
      filters: { type, limit: parseInt(limit) },
    });
  } catch (err) {
    console.error("Error fetching farmer reports:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getCropReport(req, res) {
  try {
    const { cropId } = req.params;

    const cropDoc = await db.collection("crops").doc(cropId).get();

    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }

    const cropData = cropDoc.data();

    if (req.user.role === "farmer" && cropData.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Get farm details
    let farmDetails = {};
    if (cropData.farmId) {
      const farmDoc = await db.collection("farms").doc(cropData.farmId).get();
      if (farmDoc.exists) {
        farmDetails = farmDoc.data();
      }
    }

    // Get item details
    let itemDetails = {};
    if (cropData.itemId) {
      const itemDoc = await db.collection("items").doc(cropData.itemId).get();
      if (itemDoc.exists) {
        itemDetails = itemDoc.data();
      }
    }

    const reportId = `report_crop_${cropId}_${Date.now()}`;

    // Calculate progress based on NEW_DATA structure
    const progressPercentage = cropData.percentage_status || 0;
    const expectedYield =
      cropData.expected_fruiting_per_plant * cropData.quantity || 0;
    const avgWeight = cropData.avg_Weight_per_Unit || 0;

    const reportData = {
      id: reportId,
      reportId: reportId,
      type: "crop",
      entityId: cropId,
      farmerId: cropData.farmerId,
      farmId: cropData.farmId,
      title: `Crop Report - ${itemDetails.name || "Unknown Item"} (${
        cropData.variety || "Standard"
      })`,
      data: {
        // Basic crop information
        cropId: cropDoc.id,
        itemId: cropData.itemId,
        itemName: itemDetails.name || "Unknown",
        variety: cropData.variety || "",
        status: cropData.status,
        quantity: cropData.quantity,

        // Growth metrics from NEW_DATA
        avg_Weight_per_Unit: cropData.avg_Weight_per_Unit,
        expected_fruiting_per_plant: cropData.expected_fruiting_per_plant,
        percentage_status: cropData.percentage_status,
        percentage_total: cropData.percentage_total,

        // Dates
        plantedDate: cropData.plantedDate,
        expectedHarvest: cropData.expectedHarvest,
        notes: cropData.notes,

        // Farm information
        farmName: farmDetails.name || "Unknown Farm",
        farmLocation: farmDetails.location || "Unknown Location",

        // Calculated metrics
        expectedTotalYield: expectedYield,
        expectedTotalWeight: expectedYield * avgWeight,
        progressPercentage: progressPercentage,
        daysPlanted: cropData.plantedDate
          ? Math.floor(
              (new Date() - new Date(cropData.plantedDate)) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        daysToHarvest: cropData.expectedHarvest
          ? Math.floor(
              (new Date(cropData.expectedHarvest) - new Date()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      },
      generatedBy: req.user.uid,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("reports").doc(reportId).set(reportData);

    res.json({
      message: "Crop report generated successfully",
      report: reportData,
    });
  } catch (err) {
    console.error("Error generating crop report:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getAllReports(req, res) {
  try {
    const { type, farmerId, limit = 20 } = req.query;

    let query = db
      .collection("reports")
      .orderBy("generatedAt", "desc")
      .limit(parseInt(limit));

    if (type) {
      query = query.where("type", "==", type);
    }
    if (farmerId) {
      query = query.where("farmerId", "==", farmerId);
    }

    const reportsSnapshot = await query.get();

    if (reportsSnapshot.empty) {
      return res.json({
        reports: [],
        total: 0,
        message: "No reports found",
      });
    }

    const reports = reportsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      reports,
      total: reports.length,
      filters: { type, farmerId, limit: parseInt(limit) },
    });
  } catch (err) {
    console.error("Error fetching all reports:", err);
    res.status(500).send({ error: err.message });
  }
}

async function createReport(req, res) {
  try {
    const { type, entityId, title, customData } = req.body;

    if (!type || !entityId || !title) {
      return res.status(400).send({
        error: "Missing required fields: type, entityId, title",
      });
    }

    const reportId = `report_${type}_${entityId}_${Date.now()}`;

    const reportData = {
      id: reportId,
      reportId: reportId,
      type: type,
      entityId: entityId,
      farmerId: req.user.uid,
      title: title,
      data: customData || {},
      generatedBy: req.user.uid,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("reports").doc(reportId).set(reportData);

    res.status(201).json({
      message: "Report created successfully",
      report: reportData,
    });
  } catch (err) {
    console.error("Error creating report:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getReport(req, res) {
  try {
    const { reportId } = req.params;

    const reportDoc = await db.collection("reports").doc(reportId).get();

    if (!reportDoc.exists) {
      return res.status(404).send({ error: "Report not found" });
    }

    const reportData = reportDoc.data();

    let entityDetails = {};
    if (reportData.type === "crop" && reportData.entityId) {
      const cropDoc = await db
        .collection("crops")
        .doc(reportData.entityId)
        .get();
      if (cropDoc.exists) {
        entityDetails.crop = { id: cropDoc.id, ...cropDoc.data() };
      }
    }

    res.json({
      report: {
        id: reportDoc.id,
        ...reportData,
        entityDetails,
      },
    });
  } catch (err) {
    console.error("Error fetching report:", err);
    res.status(500).send({ error: err.message });
  }
}


// Create a simplified shipment request for the authenticated farmer
async function shipmentRequest(req, res) {
  try {
    const { item, quantity, pickupTime } = req.body;

    // Validate required input fields
    if (!item || !quantity || !pickupTime) {
      return res.status(400).send({
        error: "Missing required fields: item, quantity, pickupTime",
      });
    }

    // Fetch the first farm associated with the current authenticated farmer
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .limit(1)
      .get();

    // If no farm is found, return an error
    if (farmsSnapshot.empty) {
      return res.status(404).send({ error: "No farm found for this farmer" });
    }

    // Extract the farm ID from the fetched document
    const farmDoc = farmsSnapshot.docs[0];
    const farmId = farmDoc.id;

    // Build the shipment data structure
    const shipmentData = {
      farmerId: req.user.uid,
      farmId,
      pickupTime,
      items: [
        {
          name: item,
          quantity: parseInt(quantity),
        },
      ],
      status: "pending", // default status
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save the shipment to Firestore
    const shipmentRef = await db.collection("shipments").add(shipmentData);

    // Attach the generated ID to the document
    await shipmentRef.update({ id: shipmentRef.id });

    // Respond with success and shipment details
    res.status(201).json({
      message: "Shipment request created successfully",
      shipment: { id: shipmentRef.id, ...shipmentData },
    });
  } catch (err) {
    console.error("Error creating shipment request:", err);
    res.status(500).send({ error: err.message });
  }
}


// CREATE: Approved shipment submission for a specific farmer
async function createApprovedShipment(req, res) {
  try {
    const { item, quantity, pickupTime } = req.body;

    // Basic validation
    if (!item || !quantity || !pickupTime) {
      return res.status(400).send({
        error: "Missing required fields: item, quantity, pickupTime",
      });
    }

    // Find the farmer's first farm
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .limit(1)
      .get();

    if (farmsSnapshot.empty) {
      return res.status(404).send({ error: "No farm found for this farmer" });
    }

    const farmDoc = farmsSnapshot.docs[0];
    const farmId = farmDoc.id;

    // Prepare shipment data with status "approved"
    const shipmentData = {
      farmerId: req.user.uid,
      farmId,
      pickupTime,
      items: [
        {
          name: item,
          quantity: parseInt(quantity),
        },
      ],
      status: "approved", // DIFFERENCE: status is set to approved
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const shipmentRef = await db.collection("shipments").add(shipmentData);
    await shipmentRef.update({ id: shipmentRef.id });

    res.status(201).json({
      message: "Approved shipment created successfully",
      shipment: { id: shipmentRef.id, ...shipmentData },
    });
  } catch (err) {
    console.error("Error creating approved shipment:", err);
    res.status(500).send({ error: err.message });
  }
}



// Continue with all other existing functions...
// (Keep all delivery, barcode, item, rating, and dashboard functions as they were)

async function createDelivery(req, res) {
  try {
    const { produceType, weight, volume, farmId, notes } = req.body;

    if (!produceType || !weight || !farmId) {
      return res.status(400).send({
        error: "Missing required fields: produceType, weight, farmId",
      });
    }

    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
      return res.status(404).send({ error: "Farm not found" });
    }

    const itemDoc = await db.collection("items").doc(produceType).get();
    if (!itemDoc.exists) {
      return res.status(404).send({ error: "Produce type not found" });
    }

    const deliveryData = {
      farmerId: req.user.uid,
      farmId,
      produceType,
      weight: parseFloat(weight),
      volume: volume ? parseFloat(volume) : null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      barcodeUrl: null,
      barcodeGenerated: false,
      notes: notes || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("deliveries").add(deliveryData);
    await docRef.update({ id: docRef.id });

    res.status(201).json({
      id: docRef.id,
      message: "Delivery created successfully",
      delivery: {
        id: docRef.id,
        ...deliveryData,
      },
    });
  } catch (err) {
    console.error("Error creating delivery:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getDeliveryHistory(req, res) {
  try {
    const { status, farmId, limit = 10 } = req.query;

    let query = db
      .collection("deliveries")
      .where("farmerId", "==", req.user.uid)
      .limit(parseInt(limit));

    if (status) {
      query = query.where("status", "==", status);
    }
    if (farmId) {
      query = query.where("farmId", "==", farmId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.json({
        deliveries: [],
        total: 0,
        message: "No deliveries found",
      });
    }

    const deliveries = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const deliveryData = {
          id: doc.id,
          ...doc.data(),
        };

        // Get farm details
        try {
          const farmDoc = await db
            .collection("farms")
            .doc(deliveryData.farmId)
            .get();
          if (farmDoc.exists) {
            deliveryData.farmName = farmDoc.data().name;
          }
        } catch (farmErr) {
          console.log(
            `Could not fetch farm ${deliveryData.farmId}:`,
            farmErr.message
          );
        }

        // Get item details
        try {
          const itemDoc = await db
            .collection("items")
            .doc(deliveryData.produceType)
            .get();
          if (itemDoc.exists) {
            deliveryData.produceTypeName = itemDoc.data().name;
          }
        } catch (itemErr) {
          console.log(
            `Could not fetch item ${deliveryData.produceType}:`,
            itemErr.message
          );
        }

        return deliveryData;
      })
    );

    res.json({
      deliveries,
      total: deliveries.length,
      filters: { status, farmId, limit: parseInt(limit) },
    });
  } catch (err) {
    console.error("Error in getDeliveryHistory:", err);
    res.status(500).send({ error: err.message });
  }
}

async function generateShipmentBarcode(req, res) {
  try {
    const { shipmentId } = req.params;

    const shipmentDoc = await db.collection("shipments").doc(shipmentId).get();

    if (!shipmentDoc.exists) {
      return res.status(404).send({ error: "Shipment not found" });
    }

    const shipmentData = shipmentDoc.data();

    if (shipmentData.barcodeGenerated && shipmentData.qrCodeData) {
      return res.json({
        message: "Barcode already exists",
        barcodeUrl: shipmentData.qrCodeData,
        shipmentId: shipmentDoc.id,
        trackingNumber: shipmentData.trackingNumber || `TRK${Date.now()}`,
        trackingUrl:
          shipmentData.trackingUrl || `https://greentech-tracking.com/track/`,
        trackingData: {
          shipmentId: shipmentDoc.id,
          farmerId: shipmentData.farmerId,
          trackingNumber: shipmentData.trackingNumber || `TRK${Date.now()}`,
          trackingUrl:
            shipmentData.trackingUrl || `https://greentech-tracking.com/track/`,
        },
      });
    }

    const farmDoc = await db.collection("farms").doc(shipmentData.farmId).get();
    const farmData = farmDoc.exists ? farmDoc.data() : {};

    let farmerName = "Unknown Farmer";
    try {
      const userRecord = await admin.auth().getUser(req.user.uid);
      farmerName = userRecord.displayName || userRecord.email || "Farmer";
    } catch (userErr) {
      console.log("Could not fetch user info:", userErr.message);
    }

    const trackingData = {
      shipmentId: shipmentDoc.id,
      farmerId: shipmentData.farmerId,
      farmerName: farmerName,
      farmName: farmData.name || "Unknown Farm",
      destination: shipmentData.destination || "",
      trackingNumber: shipmentData.trackingNumber || `TRK${Date.now()}`,
      trackingUrl:
        shipmentData.trackingUrl ||
        `https://greentech-tracking.com/track/${shipmentDoc.id}`,
    };

    const qrData = {
      type: "shipment",
      id: shipmentDoc.id,
      shipmentId: shipmentDoc.id,
      farmId: shipmentData.farmId,
      farmerId: shipmentData.farmerId,
      items: shipmentData.items,
      destination: shipmentData.destination,
      status: shipmentData.status,
      totalWeight: shipmentData.totalWeight,
      totalVolume: shipmentData.totalVolume,
      trackingNumber: trackingData.trackingNumber,
      trackingUrl: trackingData.trackingUrl,
      farmerName: trackingData.farmerName,
      farmName: trackingData.farmName,
      timestamp: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
    };

    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    await db.collection("shipments").doc(shipmentId).update({
      qrCodeData: qrCodeUrl,
      barcodeGenerated: true,
      barcodeGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const barcodeData = {
      id: `barcode_${shipmentDoc.id}`,
      shipmentId: shipmentDoc.id,
      farmerId: shipmentData.farmerId,
      qrCodeBase64: qrCodeUrl,
      trackingData: trackingData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const barcodeDocRef = await db.collection("barcodes").add(barcodeData);
    await barcodeDocRef.update({ id: barcodeDocRef.id });

    res.json({
      message: "Barcode generated successfully",
      barcodeUrl: qrCodeUrl,
      shipmentId: shipmentDoc.id,
      barcodeId: barcodeDocRef.id,
      trackingNumber: trackingData.trackingNumber,
      trackingUrl: trackingData.trackingUrl,
      trackingData: trackingData,
      farmerId: shipmentData.farmerId,
      farmName: trackingData.farmName,
      destination: shipmentData.destination,
    });
  } catch (err) {
    console.error("Error generating shipment barcode:", err);
    res.status(500).send({ error: err.message });
  }
}

async function generateDeliveryBarcode(req, res) {
  try {
    const { deliveryId } = req.params;

    const deliveryDoc = await db.collection("deliveries").doc(deliveryId).get();

    if (!deliveryDoc.exists) {
      return res.status(404).send({ error: "Delivery not found" });
    }

    const deliveryData = deliveryDoc.data();
    if (deliveryData.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    if (deliveryData.barcodeGenerated && deliveryData.barcodeUrl) {
      return res.json({
        message: "QR code already exists",
        barcodeUrl: deliveryData.barcodeUrl,
        deliveryId: deliveryDoc.id,
      });
    }

    const qrData = {
      type: "delivery",
      id: deliveryDoc.id,
      farmId: deliveryData.farmId,
      produceType: deliveryData.produceType,
      weight: deliveryData.weight,
      timestamp: new Date().toISOString(),
    };

    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    await db.collection("deliveries").doc(deliveryId).update({
      barcodeUrl: qrCodeUrl,
      barcodeGenerated: true,
      barcodeGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      message: "QR code generated successfully",
      barcodeUrl: qrCodeUrl,
      deliveryId: deliveryDoc.id,
    });
  } catch (err) {
    console.error("Error generating delivery QR code:", err);
    res.status(500).send({ error: err.message });
  }
}

async function listItems(req, res) {
  try {
    const { category, season } = req.query;

    let query = db.collection("items");

    if (category) {
      query = query.where("category", "==", category);
    }
    if (season) {
      query = query.where("season", "==", season);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.json({ items: [], message: "No items found" });
    }

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ items });
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getItem(req, res) {
  try {
    const { itemId } = req.params;
    const itemDoc = await db.collection("items").doc(itemId).get();

    if (!itemDoc.exists) {
      return res.status(404).send({ error: "Item not found" });
    }

    res.json({ item: { id: itemDoc.id, ...itemDoc.data() } });
  } catch (err) {
    console.error("Error fetching item:", err);
    res.status(500).send({ error: err.message });
  }
}

// Rating functions (keep existing implementation)
async function getAllFarmerRatings(req, res) {
  try {
    const farmersSnapshot = await db
      .collection("users")
      .where("role", "==", "farmer")
      .get();

    if (farmersSnapshot.empty) {
      return res.json({ farmers: [], message: "No farmers found" });
    }

    const farmers = farmersSnapshot.docs.map((doc) => {
      const farmerData = doc.data();
      return {
        farmerId: doc.id,
        farmerName: `${farmerData.firstName} ${farmerData.lastName}`,
        email: farmerData.email,
        totalL: farmerData.totalL || 0,
        totalC: farmerData.totalC || 0,
        averageRating: farmerData.averageRating || 0,
      };
    });

    farmers.sort((a, b) => b.averageRating - a.averageRating);

    res.json({ farmers });
  } catch (err) {
    console.error("Error fetching all farmer ratings:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getFarmerRating(req, res) {
  try {
    const { farmerId } = req.params;

    const farmerDoc = await db.collection("users").doc(farmerId).get();
    if (!farmerDoc.exists || farmerDoc.data().role !== "farmer") {
      return res.status(404).send({ error: "Farmer not found" });
    }

    const ratingDoc = await db.collection("ratings").doc(farmerId).get();

    if (!ratingDoc.exists) {
      return res.json({
        rating: {
          ratingId: `rating_${farmerId}_001`,
          totalL: 0,
          totalC: 0,
          custmerArray: [],
        },
        averageRating: 0,
        farmerId: farmerId,
        farmerName: `${farmerDoc.data().firstName} ${
          farmerDoc.data().lastName
        }`,
      });
    }

    const ratingData = ratingDoc.data();
    const totalStars = ratingData.custmerArray.reduce(
      (sum, customer) => sum + customer.rate,
      0
    );
    const averageRating =
      ratingData.totalC > 0
        ? parseFloat((totalStars / ratingData.totalC).toFixed(1))
        : 0;

    res.json({
      rating: {
        ratingId: ratingData.ratingId,
        totalL: ratingData.totalL,
        totalC: ratingData.totalC,
        custmerArray: ratingData.custmerArray,
      },
      averageRating: averageRating,
      farmerId: farmerId,
      farmerName: `${farmerDoc.data().firstName} ${farmerDoc.data().lastName}`,
    });
  } catch (err) {
    console.error("Error fetching farmer rating:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getMyRatings(req, res) {
  try {
    const ratingDoc = await db.collection("ratings").doc(req.user.uid).get();

    if (!ratingDoc.exists) {
      return res.json({
        rating: {
          ratingId: `rating_${req.user.uid}_001`,
          totalL: 0,
          totalC: 0,
          custmerArray: [],
        },
        averageRating: 0,
        farmerName: "Unknown",
      });
    }

    const ratingData = ratingDoc.data();
    const totalStars = ratingData.custmerArray.reduce(
      (sum, customer) => sum + customer.rate,
      0
    );
    const averageRating =
      ratingData.totalC > 0
        ? parseFloat((totalStars / ratingData.totalC).toFixed(1))
        : 0;

    const farmerDoc = await db.collection("users").doc(req.user.uid).get();
    const farmerData = farmerDoc.data();

    res.json({
      rating: {
        ratingId: ratingData.ratingId,
        totalL: ratingData.totalL,
        totalC: ratingData.totalC,
        custmerArray: ratingData.custmerArray,
      },
      averageRating: averageRating,
      farmerName: `${farmerData.firstName} ${farmerData.lastName}`,
    });
  } catch (err) {
    console.error("Error fetching farmer ratings:", err);
    res.status(500).send({ error: err.message });
  }
}

async function addOrUpdateRating(req, res) {
  try {
    const { farmerId } = req.params;
    const { rate } = req.body;

    if (!rate || rate < 1 || rate > 5) {
      return res.status(400).send({ error: "Rate must be between 1 and 5" });
    }

    const farmerDoc = await db.collection("users").doc(farmerId).get();
    if (!farmerDoc.exists || farmerDoc.data().role !== "farmer") {
      return res.status(404).send({ error: "Farmer not found" });
    }

    const ratingDoc = await db.collection("ratings").doc(farmerId).get();

    let ratingData;
    if (!ratingDoc.exists) {
      ratingData = {
        ratingId: `rating_${farmerId}_001`,
        farmerId: farmerId,
        totalL: 0,
        totalC: 0,
        custmerArray: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    } else {
      ratingData = ratingDoc.data();
    }

    const existingCustomerIndex = ratingData.custmerArray.findIndex(
      (customer) => customer.CUSTOMERID === req.user.uid
    );

    if (existingCustomerIndex !== -1) {
      const oldRate = ratingData.custmerArray[existingCustomerIndex].rate;
      ratingData.custmerArray[existingCustomerIndex].rate = parseInt(rate);

      if (oldRate >= 4 && rate < 4) {
        ratingData.totalL = Math.max(0, ratingData.totalL - 1);
      } else if (oldRate < 4 && rate >= 4) {
        ratingData.totalL += 1;
      }
    } else {
      ratingData.custmerArray.push({
        CUSTOMERID: req.user.uid,
        rate: parseInt(rate),
      });

      ratingData.totalC += 1;

      if (rate >= 4) {
        ratingData.totalL += 1;
      }
    }

    ratingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const totalStars = ratingData.custmerArray.reduce(
      (sum, customer) => sum + customer.rate,
      0
    );
    const averageRating =
      ratingData.totalC > 0
        ? parseFloat((totalStars / ratingData.totalC).toFixed(1))
        : 0;

    await db.collection("ratings").doc(farmerId).set(ratingData);

    await db.collection("users").doc(farmerId).update({
      totalL: ratingData.totalL,
      totalC: ratingData.totalC,
      averageRating: averageRating,
      lastRatingUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      message:
        existingCustomerIndex !== -1
          ? "Rating updated successfully"
          : "Rating added successfully",
      rating: {
        ratingId: ratingData.ratingId,
        totalL: ratingData.totalL,
        totalC: ratingData.totalC,
        custmerArray: ratingData.custmerArray,
      },
      averageRating: averageRating,
      farmerName: `${farmerDoc.data().firstName} ${farmerDoc.data().lastName}`,
    });
  } catch (err) {
    console.error("Error adding/updating rating:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getDashboard(req, res) {
  try {
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .get();
    const cropsSnapshot = await db
      .collection("crops")
      .where("farmerId", "==", req.user.uid)
      .get();
    const deliveriesSnapshot = await db
      .collection("deliveries")
      .where("farmerId", "==", req.user.uid)
      .limit(5)
      .get();
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", req.user.uid)
      .limit(5)
      .get();

    const dashboard = {
      totalFarms: farmsSnapshot.size,
      totalCrops: cropsSnapshot.size,
      totalDeliveries: deliveriesSnapshot.size,
      totalShipments: shipmentsSnapshot.size,
      recentDeliveries: deliveriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
      recentShipments: shipmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    };

    res.json({ dashboard });
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getPerformanceMetrics(req, res) {
  try {
    const deliveriesSnapshot = await db
      .collection("deliveries")
      .where("farmerId", "==", req.user.uid)
      .get();
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", req.user.uid)
      .get();

    const deliveries = deliveriesSnapshot.docs.map((doc) => doc.data());
    const shipments = shipmentsSnapshot.docs.map((doc) => doc.data());

    const totalWeight = deliveries.reduce(
      (sum, delivery) => sum + (delivery.weight || 0),
      0
    );
    const totalVolume = deliveries.reduce(
      (sum, delivery) => sum + (delivery.volume || 0),
      0
    );

    const pendingDeliveries = deliveries.filter(
      (d) => d.status === "pending"
    ).length;
    const completedDeliveries = deliveries.filter(
      (d) => d.status === "completed"
    ).length;

    const performance = {
      totalDeliveries: deliveries.length,
      totalShipments: shipments.length,
      totalWeight,
      totalVolume,
      pendingDeliveries,
      completedDeliveries,
      completionRate:
        deliveries.length > 0
          ? ((completedDeliveries / deliveries.length) * 100).toFixed(1)
          : 0,
    };

    res.json({ performance });
  } catch (err) {
    console.error("Error fetching performance metrics:", err);
    res.status(500).send({ error: err.message });
  }
}

// Alias functions
async function generateBarcode(req, res) {
  return generateShipmentBarcode(req, res);
}

async function getPerformance(req, res) {
  return getPerformanceMetrics(req, res);
}






// Get all lands (farmer’s farms)
async function getLands(req, res) {
  try {
    const snapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .get();
    const lands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ lands });
  } catch (err) {
    console.error("Error fetching lands:", err);
    res.status(500).send({ error: err.message });
  }
}

// Mark a land (farm) as ready for harvest
async function markLandReady(req, res) {
  try {
    const { landId } = req.params;
    // update all crops under this land to status 'ready for harvest'
    const cropsSnap = await db.collection("crops")
      .where("farmId", "==", landId)
      .where("farmerId", "==", req.user.uid)
      .get();
    const batch = db.batch();
    cropsSnap.forEach(doc => {
      batch.update(doc.ref, {
        status: "ready for harvest",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    res.json({ message: "Land marked ready for harvest" });
  } catch (err) {
    console.error("Error marking land ready:", err);
    res.status(500).send({ error: err.message });
  }
}


// Quality-test an item (per container)
async function qualityTestItem(req, res) {
  try {
    const { itemId } = req.params;
    const { containerId, results } = req.body;
    // TODO: store `results` under a subcollection on this container
    await db.collection("containers")
      .doc(containerId)
      .collection("qualityTests")
      .add({
        itemId,
        results,
        testedAt: admin.firestore.FieldValue.serverTimestamp(),
        testerId: req.user.uid
      });
    res.json({ message: "Quality test recorded" });
  } catch (err) {
    console.error("Error recording quality test:", err);
    res.status(500).send({ error: err.message });
  }
}



// Generate barcode for a shipment container
async function generateShipmentBarcode(req, res) {
  try {
    const { shipmentId } = req.params;
    const barcodeData = await QRCode.toDataURL(shipmentId);
    res.json({ shipmentId, barcode: barcodeData });
  } catch (err) {
    console.error("Error generating shipment barcode:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Demand & Ordering Handlers ---

// Get item-demand per shift/day
async function getDemands(req, res) {
  try {
    // TODO: fetch from `itemDemands` collection
    const snapshot = await db.collection("itemDemands").get();
    const demands = snapshot.docs.map(d => d.data());
    res.json({ demands });
  } catch (err) {
    console.error("Error fetching demands:", err);
    res.status(500).send({ error: err.message });
  }
}

// Notify farmer to be ready for a predicted order
async function informFarmer(req, res) {
  try {
    const { farmerId, itemId, quantity, shift, day } = req.body;
    // TODO: send notification/record in `notifications`
    await db.collection("notifications").add({
      to: farmerId,
      itemId,
      quantity,
      shift,
      day,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: "Farmer informed" });
  } catch (err) {
    console.error("Error informing farmer:", err);
    res.status(500).send({ error: err.message });
  }
}

// Get order summaries (consumer orders aggregated per farmer)
async function getOrderSummaries(req, res) {
  try {
    // TODO: aggregate from `orders` collection
    const snapshot = await db.collection("orders").get();
    const summaries = snapshot.docs.map(d => d.data());
    res.json({ summaries });
  } catch (err) {
    console.error("Error fetching order summaries:", err);
    res.status(500).send({ error: err.message });
  }
}

// Post farmer shipment info (pickup time, etc.)
async function postFarmerShipmentInfo(req, res) {
  try {
    const { shipmentId } = req.body;
    const info = { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await db.collection("shipments").doc(shipmentId).update(info);
    res.json({ message: "Shipment info updated" });
  } catch (err) {
    console.error("Error updating shipment info:", err);
    res.status(500).send({ error: err.message });
  }
}

// Post driver assignment/notification
async function postDriverInfo(req, res) {
  try {
    const { shipmentId, driverName, driverContact } = req.body;
    await db.collection("shipments").doc(shipmentId).update({
      driver: { name: driverName, contact: driverContact },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: "Driver info recorded" });
  } catch (err) {
    console.error("Error recording driver info:", err);
    res.status(500).send({ error: err.message });
  }
}






module.exports = {
  // Farm functions
  listFarms,
  getFarm,
  getFarmerFarms,
    getLands,
  markLandReady,
    getDemands,
  informFarmer,
  getOrderSummaries,
  postFarmerShipmentInfo,
  postDriverInfo,
  qualityTestItem,

  // Crop functions
  listCrops,
  getCrop,
  createCrop,
  updateCrop,
  deleteCrop,

  // Report functions
  getReport,
  getFarmerReport,
  getCropReport,
  getAllReports,
  createReport,
  createFarmerShipment,

  // Shipment functions
  listShipments,
  getShipment,
  createShipment,
  shipmentRequest,
  createApprovedShipment,

  // Delivery functions
  createDelivery,
  getDeliveryHistory,

  // Barcode functions
  generateShipmentBarcode,
  generateDeliveryBarcode,
  generateBarcode,

  // Item functions
  listItems,
  getItem,

  // Rating functions
  addOrUpdateRating,
  getMyRatings,
  getFarmerRating,
  getAllFarmerRatings,

  // Dashboard functions
  getDashboard,
  getPerformanceMetrics,
  getPerformance,
};
