const { db, admin } = require("../firebaseConfig");
const QRCode = require("qrcode");

// --- Helper Functions ---

// Get farmer's lands from extraFields
async function getFarmerLandsByUid(farmerId) {
  const farmerDoc = await db.collection("farmers").doc(farmerId).get();
  if (!farmerDoc.exists) {
    throw new Error("Farmer not found");
  }

  const farmerData = farmerDoc.data();
  return farmerData.extraFields?.lands || [];
}

// Update farmer's lands in extraFields
async function updateFarmerLands(farmerId, lands) {
  const farmerRef = db.collection("farmers").doc(farmerId);

  // Convert any FieldValue.serverTimestamp() to actual timestamp before saving
  const cleanedLands = lands.map((land) => {
    if (
      land.crop &&
      land.crop.updatedAt &&
      land.crop.updatedAt.constructor &&
      land.crop.updatedAt.constructor.name === "FieldValue"
    ) {
      // Replace FieldValue.serverTimestamp() with actual timestamp
      return {
        ...land,
        crop: {
          ...land.crop,
          updatedAt: admin.firestore.Timestamp.now(),
        },
      };
    }
    return land;
  });

  try {
    await farmerRef.update({
      "extraFields.lands": cleanedLands,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
}

// Inventory management helper function
async function manageInventory(farmerId, crop, landIndex, action) {
  try {
    const inventoryRef = db.collection("farmerInventory");
    const cropId = `${farmerId}_${crop.itemId}`; // Use farmerId, itemId, and landIndex to create unique cropId

    const farmer = await db.collection("farmers").doc(farmerId).get();
    if (!farmer.exists) {
      return res.status(404).send({ error: "Farmer not found" });
    }
    const farmerData = farmer.data();
    const lands = farmerData.extraFields?.lands || [];
    const pickupAddress = lands[landIndex].pickupAddress || "Unknown Address";
    const agreementPercentage = (farmerData.agreementPercentage || 60) / 100; // Default to 60% if not set
    if (action === "add") {
      // Add to inventory when harvesting
      const inventoryData = {
        farmerId: farmerId,
        logisticCenterId: "LC-1",
        itemId: crop.itemId,
        currentAvailableForProcurementKg:
          crop.expectedHarvestingKg * crop.statusPercentage || 60,
        maxOrder: crop.expectedHarvestingKg * agreementPercentage || 60, // Default to 60% of expected harvesting
        status: crop.status,
        statusPercentage: crop.statusPercentage || 0,
        harvestedDate: admin.firestore.Timestamp.now(),
        addedToInventory: admin.firestore.Timestamp.now(),
        pickupAddress,
      };

      await inventoryRef.doc(cropId).set(inventoryData);
      //console.log(`✅ Added crop ${cropId} to farmer inventory`);
    } else if (action === "remove") {
      // Remove from inventory when field clearing or 100% harvested
      const docRef = inventoryRef.doc(cropId);
      const docSnapshot = await docRef.get();

      if (docSnapshot.exists) {
        await docRef.delete();
        //console.log(`✅ Removed crop ${cropId} from farmer inventory`);
      } else {
        //console.log(`⚠️ Crop ${cropId} not found in inventory, nothing to remove`);
      }
    }
  } catch (error) {
    console.error("❌ Error managing inventory:", error);
    throw error;
  }
}

// Submit Shipment Report
//TODO comeback after Barcode gen
async function submitShipmentReport(req, res) {
  try {
    // === Auth Check ===
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    // === Get Payload ===
    const { shipmentId, containers } = req.body;

    if (!shipmentId || !Array.isArray(containers) || containers.length === 0) {
      return res.status(400).json({ error: "Missing or invalid payload" });
    }

    // === Get Shipment Doc ===
    const shipmentRef = db.collection("farmerShipmentReports").doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();

    if (!shipmentSnap.exists) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    const shipmentData = shipmentSnap.data();

    if (shipmentData.farmerId !== farmerUid) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this shipment" });
    }

    const timestampNow = admin.firestore.Timestamp.now();

    // === Update Shipment Doc with containers + metadata ===
    await shipmentRef.update({
      containers, // top-level containers array
      status: "ready-for-pickup",
      statusUpdatedAt: timestampNow,
      lastUpdatedAt: timestampNow,
      history: admin.firestore.FieldValue.arrayUnion({
        timestamp: timestampNow,
        user: "farmer",
        action: `Submitted ${containers.length} containers.`,
      }),
      stages: admin.firestore.FieldValue.arrayUnion({
        key: "ready-for-pickup",
        label: "Ready for Pickup",
        timestamp: timestampNow,
        status: "ok",
      }),
    });

    const farmerShipmentDoc = {
      id: shipmentId,
      approvedAt: shipmentData.approvedAt?.toDate().toISOString() || null,
      createdAt: shipmentData.createdAt?.toDate().toISOString() || null,
      updatedAt: timestampNow.toDate().toISOString(),
      pickupTime: shipmentData.pickupTime || null,
      destination: shipmentData.destination || null,
      farmerId: farmerUid,
      driver: shipmentData.driver || null,
      reportSubmittedAt: timestampNow.toDate().toISOString(),
      reportSubmittedBy: farmerUid,
      reportNotes: "",
      reportedWeight: totalWeight,
      totalWeight: totalWeight,
      totalVolume: totalWeight, // Change this logic if volume ≠ weight
      status: "pending",
      items: shipmentData.item
        ? [
            {
              name: shipmentData.item.name,
              quantity: shipmentData.item.quantityKg,
            },
          ]
        : [],
      containers: containers,
    };

    await db
      .collection("farmer_shipment")
      .doc(shipmentId)
      .set(farmerShipmentDoc);

    return res
      .status(200)
      .json({ message: "Shipment report submitted successfully" });
  } catch (err) {
    console.error("[submitShipmentReport] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function approveShipmentRequest(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    const { requestId } = req.params;

    // Step 1: Get the shipment request document
    const requestRef = db.collection("shipmentRequests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Shipment request not found" });
    }

    const requestData = requestDoc.data();

    // Check that the request belongs to the logged-in farmer
    if (requestData.farmerId !== farmerUid) {
      return res
        .status(403)
        .json({ error: "Unauthorized to approve this request" });
    }

    // Step 2: Update the request's status to "approved"
    await requestRef.update({
      status: "approved",
      approvedAt: admin.firestore.Timestamp.now(),
    });

    const shipmentId = requestId.replace("_SReq_", "_SH_");

    await db
      .collection("farmerShipmentReports")
      .doc(shipmentId)
      .set({
        ...requestData,
        driverId: null, // to be filled later
        origin: requestData.pickupAddress || null,
        destination: null, // e.g., warehouse name – unknown for now
        createdAt: admin.firestore.Timestamp.now(),
        status: "at-farm",
        problemFlag: false,
        shipmentRequestId: requestId,
        shipmentBarcode: null, // You can customize the format
        farmerReports: [],

        containerBarcodes: [],
        history: [
          {
            timestamp: admin.firestore.Timestamp.now(),
            user: "system",
            action: "Shipment record generated.",
          },
        ],
        stages: [
          {
            key: "at-farm",
            label: "At Farm",
            timestamp: admin.firestore.Timestamp.now(),
            status: "ok",
          },
        ],
      });

    res.status(200).json({
      message: "Shipment request approved and shipment created",
      shipmentId: shipmentId,
    });
  } catch (err) {
    console.error("[approveShipmentRequest] Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function getApprovedShipments(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    // Get shipments
    const shipmentsSnapshot = await db
      .collection("farmerShipmentReports")
      .where("farmerId", "==", farmerUid)
      .get();

    // .where("overallStatus", "==", "at-farm")

    // Filter and format approved shipments
    const approvedShipments = shipmentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(approvedShipments);
  } catch (err) {
    console.error("[getApprovedShipments] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getApprovedShipmentsByID(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    const { shipmentId } = req.params;

    const approvedShipmentSnap = await db
      .collection("farmerShipmentReports")
      .doc(shipmentId)
      .get();

    if (!approvedShipmentSnap.exists) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    const approvedShipment = approvedShipmentSnap.data();

    if (approvedShipment.farmerId !== farmerUid) {
      return res.status(403).send("Farmer IDs don't match");
    }

    res.json(approvedShipment);
  } catch (err) {
    console.error("[getApprovedShipments] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getShipmentRequests(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    // Get shipments
    const shipmentsSnapshot = await db
      .collection("shipmentRequests")
      .where("farmerId", "==", farmerUid)
      .get();

    // Filter and format approved shipments
    const approvedShipments = shipmentsSnapshot.docs
      .filter((doc) => {
        const status = doc.data().status;
        return status === "forecasted" || status === "finalized";
      })
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    res.json(approvedShipments);
  } catch (err) {
    console.error("[getShipmentRequests] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getFarmerLands(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    const farmerDoc = await db.collection("farmers").doc(farmerUid).get();
    if (!farmerDoc.exists) {
      throw new Error("Farmer not found");
    }

    const farmerData = farmerDoc.data();
    lands = farmerData.extraFields?.lands || [];
    lands = lands.map((land, index) => ({
      ...land,
      id: `land-${index}`,
    }));
    res.json(lands);
  } catch (err) {
    console.error("[getFarmerLands] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

const getItemList = async (req, res) => {
  try {
    const itemsSnapshot = await db.collection("items").get();

    const itemsData = itemsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(itemsData);
  } catch (err) {
    console.error("Error fetching all inventory:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

async function deleteCropByLandId(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;
    const { landId } = req.params;

    const index = parseInt(landId.split("-")[1]);
    const lands = await getFarmerLandsByUid(farmerUid);

    if (isNaN(index) || index < 0 || index >= lands.length) {
      return res.status(404).json({ error: "Invalid landId" });
    }

    const land = lands[index];
    if (!land.crop) {
      return res.status(404).json({ error: "No crop found in this land" });
    }

    try {
      await manageInventory(farmerUid, land.crop, index, "remove");
    } catch (err) {
      console.warn(
        "[deleteCropByLandId] Inventory removal failed:",
        err.message
      );
    }

    delete lands[index].crop;

    await updateFarmerLands(farmerUid, lands);

    res.json({ message: "Crop removed successfully" });
  } catch (err) {
    console.error("[deleteCropByLandId] Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function updateCropByLandId(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;
    const { landId } = req.params; // e.g., "land-0"
    const updateData = req.body;

    const lands = await getFarmerLandsByUid(farmerUid);

    const index = parseInt(landId.split("-")[1]); // ✅ FIXED HERE
    if (isNaN(index) || index < 0 || index >= lands.length) {
      return res.status(404).json({ error: "Invalid landId" });
    }

    const land = lands[index];
    if (!land.crop) {
      return res.status(404).json({ error: "No crop found in this land" });
    }

    const oldStatus = land.crop.status || "";
    const oldPercentage = land.crop.statusPercentage || 0;

    // Update values
    land.crop.status = updateData.status || oldStatus;
    land.crop.statusPercentage = updateData.statusPercentage ?? oldPercentage;
    land.crop.updatedAt = admin.firestore.Timestamp.now();

    const newStatus = land.crop.status;
    const newPercentage = land.crop.statusPercentage;

    // Manage inventory if needed
    if (newStatus === "Harvesting" && oldStatus !== "Harvesting") {
      await manageInventory(farmerUid, land.crop, index, "add");
    } else if (newStatus === "Field Clearing") {
      await manageInventory(farmerUid, land.crop, index, "remove");
    } else if (
      newStatus === "Harvested" &&
      newPercentage === 100 &&
      oldPercentage < 100
    ) {
      await manageInventory(farmerUid, land.crop, index, "remove");
    }

    await updateFarmerLands(farmerUid, lands);

    res.json({
      message: "Crop status updated successfully",
      crop: {
        landId,
        ...land.crop,
      },
    });
  } catch (err) {
    console.error("[updateCropByLandId] Error:", err);
    res.status(500).json({ error: err.message });
  }
}

//KEEP
async function createCropByLandId(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const farmerUid = decodedToken.uid;

    const { landId, crop } = req.body;

    //console.log(`[createCropByLandId] Creating crop for farmerId: ${farmerId}, farmId: ${farmId}`);

    // Get current lands
    const lands = await getFarmerLandsByUid(farmerUid);

    if (!landId || typeof landId !== "string" || !landId.includes("-")) {
      return res.status(400).json({ error: "Invalid or missing landId" });
    }

    const landIndex = parseInt(landId.split("-")[1]); // ✅ FIXED HERE
    if (isNaN(landIndex) || landIndex < 0 || landIndex >= lands.length) {
      return res.status(404).json({ error: "Invalid landId" });
    }
    // Since farmId doesn't match landId, let's find land by name or use as index

    if (
      !crop.itemId ||
      typeof crop.itemId !== "string" ||
      crop.itemId.trim() === ""
    ) {
      return res.status(400).json({ error: "Invalid or missing itemId" });
    }

    // Check if item exists and get item details
    const itemDoc = await db.collection("items").doc(crop.itemId).get();
    if (!itemDoc.exists) {
      return res.status(400).json({ error: "Item not found" });
    }

    const itemData = itemDoc.data();
    //console.log(`[createCropByLandId] Item found: ${itemData.name}`);

    // Create crop data combining frontend fields + auto-generated fields
    const cropData = {
      // Frontend fields (use as-is)
      plantedAmount: crop.plantedAmount || 0,
      avgRatePerUnit: crop.avgRatePerUnit || 0,
      status: crop.status || "Planting",
      statusPercentage: crop.statusPercentage || 0,
      ExpectedFruitingPerPlant: crop.ExpectedFruitingPerPlant || 1.5, // Default to 1.5 if not provided
      expectedHarvestingKg: crop.expectedHarvestingKg,
      plantedDate: crop.plantedOn,
      expectedHarvestDate: crop.expectedHarvestDate,
      itemId: crop.itemId,
      imageUrl: crop.imageUrl,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    //console.log(`[createCropByLandId] Crop data prepared:`, cropData);

    // Update the specific land with crop data
    lands[landIndex].crop = cropData;

    // Save updated lands
    try {
      await updateFarmerLands(farmerUid, lands);
    } catch (saveError) {
      console.error(`🔧 DEBUG: updateFarmerLands failed:`, saveError);
      throw saveError;
    }

    //console.log(`[createCropByLandId] Successfully created crop in land ${landIndex}`);
    res.status(201).json({
      message: "Crop created successfully",
      crop: {
        id: `crop_${farmerUid}_${landIndex}`,
        landIndex: landIndex,
        landName: lands[landIndex].landName,
        ...cropData,
      },
    });
  } catch (err) {
    console.error("Error creating crop:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Export all functions ---
module.exports = {
  getShipmentRequests,
  getApprovedShipments,
  getApprovedShipmentsByID,
  getFarmerLands,
  getItemList,

  //old
  createCropByLandId,
  updateCropByLandId,
  deleteCropByLandId,

  approveShipmentRequest,
  submitShipmentReport,
};
