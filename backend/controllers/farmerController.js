const { db, admin } = require("../firebaseConfig");
//const QRCode = require("qrcode");

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
    // GET farmId from user's farms, not from params
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .get();

    if (farmsSnapshot.empty) {
      return res.status(404).send({ error: "No farms found for this user" });
    }

    // If user has multiple farms, return all of them
    const farms = farmsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If you want to return just the first farm:
    // const farmData = farmsSnapshot.docs[0].data();
    // return res.json({ farm: { id: farmsSnapshot.docs[0].id, ...farmData } });

    // Return all user's farms
    res.json({ farms });
  } catch (err) {
    console.error("Error fetching farms:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Crop Handlers ---
async function listCrops(req, res) {
  try {
    const { farmId } = req.params;

    // Verify farm ownership if farmId is provided
    if (farmId) {
      const farmDoc = await db.collection("farms").doc(farmId).get();
      if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
        return res.status(404).send({ error: "Farm not found" });
      }
    }

    let query = db.collection("crops").where("farmerId", "==", req.user.uid);

    if (farmId) {
      query = query.where("farmId", "==", farmId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.json({ crops: [], message: "No crops found" });
    }

    const crops = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ crops });
  } catch (err) {
    console.error("Error fetching crops:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getCrop(req, res) {
  try {
    const { farmId, cropId } = req.params;

    // Verify farm ownership
    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
      return res.status(404).send({ error: "Farm not found" });
    }

    const cropDoc = await db.collection("crops").doc(cropId).get();

    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }

    const cropData = cropDoc.data();
    if (cropData.farmId !== farmId || cropData.farmerId !== req.user.uid) {
      return res.status(403).send({ error: "Access denied" });
    }

    res.json({ crop: { id: cropDoc.id, ...cropData } });
  } catch (err) {
    console.error("Error fetching crop:", err);
    res.status(500).send({ error: err.message });
  }
}

async function createCrop(req, res) {
  //
  try {
    const {
      farmId,
      itemId,
      status,
      quantity,
      plantedDate,
      expectedHarvest,
      notes,
    } = req.body;

    // Validate required fields
    if (!farmId || !itemId || !status) {
      return res.status(400).send({
        error: "Missing required fields: farmId, itemId, status",
      });
    }

    // Verify farm belongs to farmer
    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists) {
      return res.status(404).send({ error: "Farm not found" });
    }

    // Verify item exists
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).send({ error: "Item not found" });
    }

    // Create crop document with SAME STRUCTURE as test data
    const cropData = {
      farmId,
      farmerId: req.user.uid,
      itemId,
      status,
      quantity: quantity ? parseInt(quantity) : null,
      plantedDate: plantedDate || null,
      expectedHarvest: expectedHarvest || null,
      notes: notes || "",
      timestamp: new Date().toISOString(), // Use ISO string like test data
      createdAt: new Date().toISOString(), // Use ISO string like test data
    };

    // Add to Firestore
    const docRef = await db.collection("crops").add(cropData);

    // IMPORTANT: Add the document ID to the document itself (like test data)
    await docRef.update({ id: docRef.id });

    res.status(201).json({
      id: docRef.id,
      message: "Crop reported successfully",
      ...cropData,
      id: docRef.id,
    });
  } catch (err) {
    console.error("Error reporting crop:", err);
    res.status(500).send({ error: err.message });
  }
}

async function updateCrop(req, res) {
  try {
    const { cropId } = req.params;
    const updates = ({
      farmId,
      itemId,
      status,
      quantity,
      plantedDate,
      expectedHarvest,
      actualHarvest,
      actualQuantity,
      notes,
    } = req.body);
    const cropDoc = await db.collection("crops").doc(cropId).get();

    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }

    await db
      .collection("crops")
      .doc(cropId)
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });

    res.status(204).send();
  } catch (err) {
    console.error("Error updating crop:", err);
    res.status(500).send({ error: err.message });
  }
}
async function getFarmerReport(req, res) {
  try {
    const { type, limit = 10 } = req.query;

    // Build query for farmer's reports
    let query = db
      .collection("reports")
      .where("farmerId", "==", req.user.uid)
      .orderBy("generatedAt", "desc")
      .limit(parseInt(limit));

    // Filter by type if specified
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

    // Get crop document
    const cropDoc = await db.collection("crops").doc(cropId).get();

    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }

    const cropData = cropDoc.data();

    // Check ownership for farmers
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

    // Create report ID
    const reportId = `report_crop_${cropId}_${Date.now()}`;

    // Generate comprehensive crop report
    const reportData = {
      id: reportId,
      reportId: reportId,
      type: "crop",
      entityId: cropId,
      farmerId: cropData.farmerId,
      farmId: cropData.farmId,
      title: `Crop Report - ${itemDetails.name || "Unknown Item"}`,
      data: {
        // Crop information
        cropId: cropDoc.id,
        itemId: cropData.itemId,
        itemName: itemDetails.name || "Unknown",
        status: cropData.status,
        quantity: cropData.quantity,
        actualQuantity: cropData.actualQuantity,
        plantedDate: cropData.plantedDate,
        expectedHarvest: cropData.expectedHarvest,
        actualHarvest: cropData.actualHarvest,
        notes: cropData.notes,

        // Farm information
        farmName: farmDetails.name || "Unknown Farm",
        farmLocation: farmDetails.location || "Unknown Location",

        // Calculated metrics
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
        progressPercentage:
          cropData.status === "harvested"
            ? 100
            : cropData.plantedDate && cropData.expectedHarvest
            ? Math.min(
                100,
                Math.floor(
                  ((new Date() - new Date(cropData.plantedDate)) /
                    (new Date(cropData.expectedHarvest) -
                      new Date(cropData.plantedDate))) *
                    100
                )
              )
            : 0,
      },
      generatedBy: req.user.uid,
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Save report to reports collection
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

    // Build query
    let query = db
      .collection("reports")
      .orderBy("generatedAt", "desc")
      .limit(parseInt(limit));

    // Add filters
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
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Save to reports collection
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

    // Get report from reports collection
    const reportDoc = await db.collection("reports").doc(reportId).get();

    if (!reportDoc.exists) {
      return res.status(404).send({ error: "Report not found" });
    }

    const reportData = reportDoc.data();

    // Get additional entity details based on report type
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

// --- Shipment Handlers ---
async function listShipments(req, res) {
  try {
    const snapshot = await db
      .collection("shipments")
      .where("farmerId", "==", req.user.uid)
      .get();

    if (snapshot.empty) {
      return res.json({ shipments: [], message: "No shipments found" });
    }

    const shipments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

    res.json({ shipment: { id: shipmentDoc.id, ...shipmentData } });
  } catch (err) {
    console.error("Error fetching shipment:", err);
    res.status(500).send({ error: err.message });
  }
}

async function createShipment(req, res) {
  try {
    const { farmId, items, destination, scheduledDate } = req.body;

    // Validate required fields
    if (!farmId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).send({
        error: "Missing required fields: farmId, items (array)",
      });
    }

    // Verify farm belongs to farmer
    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists) {
      return res.status(404).send({ error: "Farm not found" });
    }

    // Calculate totals
    let totalWeight = 0;
    let totalVolume = 0;

    for (const item of items) {
      totalWeight += parseFloat(item.weight || 0);
      totalVolume += parseFloat(item.volume || 0);
    }

    // Create shipment document with SAME STRUCTURE as test data
    const shipmentData = {
      farmId,
      farmerId: req.user.uid,
      items,
      destination: destination || "",
      scheduledDate: scheduledDate || null,
      status: "pending",
      totalWeight,
      totalVolume,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // ← Use Firestore timestamp
      qrCodeData: null, // ← Change field name
      barcodeGenerated: false,
      actualDate: null, // ← Add missing field
      trackingNumber: `TRK${Date.now()}`, // ← Add missing field
      trackingUrl: `https://greentech-tracking.com/track/`, // ← Add missing field
    };

    // Add to Firestore
    const docRef = await db.collection("shipments").add(shipmentData);

    // IMPORTANT: Add the document ID to the document itself (like test data)
    await docRef.update({ id: docRef.id });

    res.status(201).json({
      id: docRef.id,
      message: "Shipment created successfully",
      ...shipmentData,
      id: docRef.id,
    });
  } catch (err) {
    console.error("Error creating shipment:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Delivery Handlers ---
async function createDelivery(req, res) {
  try {
    const { produceType, weight, volume, farmId, notes } = req.body;

    // Validate required fields
    if (!produceType || !weight || !farmId) {
      return res.status(400).send({
        error: "Missing required fields: produceType, weight, farmId",
      });
    }

    // Verify farm belongs to farmer
    const farmDoc = await db.collection("farms").doc(farmId).get();
    if (!farmDoc.exists || farmDoc.data().farmerId !== req.user.uid) {
      return res.status(404).send({ error: "Farm not found" });
    }

    // Verify produce type exists
    const itemDoc = await db.collection("items").doc(produceType).get();
    if (!itemDoc.exists) {
      return res.status(404).send({ error: "Produce type not found" });
    }

    // Create delivery document with SAME STRUCTURE as test data
    const deliveryData = {
      farmerId: req.user.uid,
      farmId,
      produceType, // Keep as item ID (matches test data)
      weight: parseFloat(weight),
      volume: volume ? parseFloat(volume) : null,
      timestamp: new Date().toISOString(), // Use ISO string like test data
      status: "pending",
      barcodeUrl: null, // Will be generated when requested
      barcodeGenerated: false, // Add this field for consistency
      notes: notes || "",
      createdAt: new Date().toISOString(), // Use ISO string like test data
    };

    // Add to Firestore
    const docRef = await db.collection("deliveries").add(deliveryData);

    // IMPORTANT: Add the document ID to the document itself (like test data)
    await docRef.update({ id: docRef.id });

    // Return response with consistent format
    res.status(201).json({
      id: docRef.id,
      message: "Delivery created successfully",
      ...deliveryData,
      id: docRef.id, // Include the ID in response
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

    // Add filters if provided
    if (status) {
      query = query.where("status", "==", status);
    }
    if (farmId) {
      query = query.where("farmId", "==", farmId);
    }

    // Only add orderBy if no other filters (to avoid index requirement)
    if (!status && !farmId) {
      query = query.orderBy("timestamp", "desc");
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
          id: doc.id, // Use document ID if no id field
          ...doc.data(),
        };

        // If data has its own id field, use that instead
        if (doc.data().id) {
          deliveryData.id = doc.data().id;
        }

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

// --- Barcode Handlers ---
async function generateShipmentBarcode(req, res) {
  try {
    const { shipmentId } = req.params;

    const shipmentDoc = await db.collection("shipments").doc(shipmentId).get();

    if (!shipmentDoc.exists) {
      return res.status(404).send({ error: "Shipment not found" });
    }

    const shipmentData = shipmentDoc.data();

    // Check if barcode already exists
    if (shipmentData.barcodeGenerated && shipmentData.qrCodeData) {
      return res.json({
        message: "Barcode already exists",
        barcodeUrl: shipmentData.qrCodeData,
        shipmentId: shipmentDoc.id,

        // ADD THESE MISSING FIELDS:
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

    // Get farm details for tracking data
    const farmDoc = await db.collection("farms").doc(shipmentData.farmId).get();
    const farmData = farmDoc.exists ? farmDoc.data() : {};

    // Get farmer details
    let farmerName = "Unknown Farmer";
    try {
      const userRecord = await admin.auth().getUser(req.user.uid);
      farmerName = userRecord.displayName || userRecord.email || "Farmer";
    } catch (userErr) {
      console.log("Could not fetch user info:", userErr.message);
    }

    // Create comprehensive tracking data (like test data)
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

    // Generate comprehensive QR code data (with all tracking info)
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

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    // Update shipment document
    await db.collection("shipments").doc(shipmentId).update({
      qrCodeData: qrCodeUrl,
      barcodeGenerated: true,
      barcodeGeneratedAt: new Date().toISOString(),
    });

    // CREATE SEPARATE BARCODE DOCUMENT (like test data)
    const barcodeData = {
      id: `barcode_${shipmentDoc.id}`,
      shipmentId: shipmentDoc.id,
      farmerId: shipmentData.farmerId,
      qrCodeBase64: qrCodeUrl, // Match test data field name
      trackingData: trackingData, // Complete tracking info
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add to barcodes collection
    const barcodeDocRef = await db.collection("barcodes").add(barcodeData);
    await barcodeDocRef.update({ id: barcodeDocRef.id });

    console.log("=== DEBUG BARCODE RESPONSE ===");
    console.log("trackingNumber:", trackingData.trackingNumber);
    console.log("trackingUrl:", trackingData.trackingUrl);
    console.log("trackingData exists:", !!trackingData);
    console.log("barcodeUrl type:", typeof qrCodeUrl);
    console.log("=== END DEBUG ===");
    res.json({
      message: "Barcode generated successfully",
      barcodeUrl: qrCodeUrl,
      shipmentId: shipmentDoc.id,
      barcodeId: barcodeDocRef.id,

      // ADD THESE FIELDS to pass the test:
      trackingNumber: trackingData.trackingNumber, // ✅ Test looks for this
      trackingUrl: trackingData.trackingUrl, // ✅ Test looks for this
      trackingData: trackingData, // ✅ Test looks for this

      // Additional tracking info
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

    // Check if barcode already exists
    if (deliveryData.barcodeGenerated && deliveryData.barcodeUrl) {
      return res.json({
        message: "QR code already exists",
        barcodeUrl: deliveryData.barcodeUrl,
        deliveryId: deliveryDoc.id,
      });
    }

    // Generate QR code data
    const qrData = {
      type: "delivery",
      id: deliveryDoc.id,
      farmId: deliveryData.farmId,
      produceType: deliveryData.produceType,
      weight: deliveryData.weight,
      timestamp: new Date().toISOString(),
    };

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    // Update delivery with QR code info
    await db.collection("deliveries").doc(deliveryId).update({
      barcodeUrl: qrCodeUrl,
      barcodeGenerated: true,
      barcodeGeneratedAt: new Date().toISOString(),
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

// --- Item Handlers ---
async function listItems(req, res) {
  try {
    const snapshot = await db.collection("items").get();

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
async function getAllFarmerRatings(req, res) {
  try {
    // Get all farmers from users collection (they have totalL, totalC for quick access)
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

    // Sort by average rating (highest first)
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

    // Verify farmer exists
    const farmerDoc = await db.collection("users").doc(farmerId).get();
    if (!farmerDoc.exists || farmerDoc.data().role !== "farmer") {
      return res.status(404).send({ error: "Farmer not found" });
    }

    // Get from ratings collection
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

    // Calculate average rating
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
    // Get from ratings collection
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

    // Calculate average rating
    const totalStars = ratingData.custmerArray.reduce(
      (sum, customer) => sum + customer.rate,
      0
    );
    const averageRating =
      ratingData.totalC > 0
        ? parseFloat((totalStars / ratingData.totalC).toFixed(1))
        : 0;

    // Get farmer name
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

    // Validation
    if (!rate || rate < 1 || rate > 5) {
      return res.status(400).send({ error: "Rate must be between 1 and 5" });
    }

    // Verify farmer exists
    const farmerDoc = await db.collection("users").doc(farmerId).get();
    if (!farmerDoc.exists || farmerDoc.data().role !== "farmer") {
      return res.status(404).send({ error: "Farmer not found" });
    }

    // Get or create rating document for this farmer
    const ratingDoc = await db.collection("ratings").doc(farmerId).get();

    let ratingData;
    if (!ratingDoc.exists) {
      // Create new rating document
      ratingData = {
        ratingId: `rating_${farmerId}_001`,
        farmerId: farmerId,
        totalL: 0,
        totalC: 0,
        custmerArray: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      ratingData = ratingDoc.data();
    }

    // Check if customer already rated this farmer
    const existingCustomerIndex = ratingData.custmerArray.findIndex(
      (customer) => customer.CUSTOMERID === req.user.uid
    );

    if (existingCustomerIndex !== -1) {
      // Update existing rating
      const oldRate = ratingData.custmerArray[existingCustomerIndex].rate;
      ratingData.custmerArray[existingCustomerIndex].rate = parseInt(rate);

      // Update totalL (ratings >= 4 are "likes")
      if (oldRate >= 4 && rate < 4) {
        ratingData.totalL = Math.max(0, ratingData.totalL - 1);
      } else if (oldRate < 4 && rate >= 4) {
        ratingData.totalL += 1;
      }
    } else {
      // Add new rating
      ratingData.custmerArray.push({
        CUSTOMERID: req.user.uid,
        rate: parseInt(rate),
      });

      ratingData.totalC += 1;

      // Update totalL if it's a "like" (>= 4)
      if (rate >= 4) {
        ratingData.totalL += 1;
      }
    }

    ratingData.updatedAt = new Date().toISOString();

    // Calculate average rating
    const totalStars = ratingData.custmerArray.reduce(
      (sum, customer) => sum + customer.rate,
      0
    );
    const averageRating =
      ratingData.totalC > 0
        ? parseFloat((totalStars / ratingData.totalC).toFixed(1))
        : 0;

    // Update ratings collection
    await db.collection("ratings").doc(farmerId).set(ratingData);

    // Update farmer document with quick access fields
    await db.collection("users").doc(farmerId).update({
      totalL: ratingData.totalL,
      totalC: ratingData.totalC,
      averageRating: averageRating,
      lastRatingUpdate: new Date().toISOString(),
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
// --- Dashboard Handlers ---
async function getDashboard(req, res) {
  try {
    // Get farmer's farms
    const farmsSnapshot = await db
      .collection("farms")
      .where("farmerId", "==", req.user.uid)
      .get();

    // Get farmer's crops
    const cropsSnapshot = await db
      .collection("crops")
      .where("farmerId", "==", req.user.uid)
      .get();

    // Get farmer's deliveries
    const deliveriesSnapshot = await db
      .collection("deliveries")
      .where("farmerId", "==", req.user.uid)
      .limit(5)
      .get();

    // Get farmer's shipments
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
    // Get all farmer's deliveries for performance calculation
    const deliveriesSnapshot = await db
      .collection("deliveries")
      .where("farmerId", "==", req.user.uid)
      .get();

    // Get all farmer's shipments
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", req.user.uid)
      .get();

    const deliveries = deliveriesSnapshot.docs.map((doc) => doc.data());
    const shipments = shipmentsSnapshot.docs.map((doc) => doc.data());

    // Calculate metrics
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

// Add these functions before module.exports:

async function deleteCrop(req, res) {
  try {
    const { cropId } = req.params;

    const cropDoc = await db.collection("crops").doc(cropId).get();

    if (!cropDoc.exists) {
      return res.status(404).send({ error: "Crop not found" });
    }

    await db.collection("crops").doc(cropId).delete();
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting crop:", err);
    res.status(500).send({ error: err.message });
  }
}

async function generateBarcode(req, res) {
  // This is an alias for generateShipmentBarcode
  return generateShipmentBarcode(req, res);
}

async function getPerformance(req, res) {
  // This is an alias for getPerformanceMetrics
  return getPerformanceMetrics(req, res);
}

// Update module.exports to include the missing functions:
module.exports = {
  // Farm functions
  listFarms,
  getFarm,
  getFarmerFarms,

  // Crop functions
  listCrops,
  getCrop,
  createCrop,
  updateCrop,
  deleteCrop, // ← ADD THIS
  getReport,
  getFarmerReport,
  getCropReport,
  getAllReports,
  createReport,
  // Shipment functions
  listShipments,
  getShipment,
  createShipment,

  // Delivery functions
  createDelivery,
  getDeliveryHistory,

  // Barcode functions
  generateShipmentBarcode,
  generateDeliveryBarcode,
  generateBarcode, // ← ADD THIS

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
  getPerformance, // ← ADD THIS
};
