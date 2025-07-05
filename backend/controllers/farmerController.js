const { db, admin } = require("../firebaseConfig");
const QRCode = require("qrcode");

// --- Helper Functions ---

// Get farmer's lands from extraFields
async function getFarmerLands(farmerId) {
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

// --- Data Transformation Functions ---

// Transform Firebase land data to frontend format
function transformLandToFrontendFormat(land, index) {
  return {
    LandId: String(index + 1).padStart(5, "0"), // Generate LandId: "00001", "00002", etc.
    name: land.landName || `Land ${index + 1}`,
    acres: land.acres || "0",
    Crops: land.crop ? transformCropToFrontendFormat(land.crop, index) : null,
  };
}

/* 
cropsDB:
{
  "cropId": {
    "itemId": "001",
    "plantedAmount": 500,
    "avgRatePerUnit": 50,
    "fruitingPerPlant": 0.5,
    "plantedDate": "01-10-2023",
    "expectedHarvestDate": "01-12-2023",
    "expectedHarvestingKg": 250, // Calculated: 500 plants * 0.5 kg/plant
    "status": "Growing",
    "statusPercentage": 20,
    
    "displayName": "Tomato Crop"   NOTE: its only to display name we dont have to save it but its to reserve the name instead of searcching the name to display by the id
  }
}

in frontend we will display like this
ItemName  
Planted amount(quantity) 
Average rate of unit = avgRatePerUnit
Expected fruiting per plant => fruitingPerPlant
Planted on(date):
Status:
Expected harvest date :  
statusPrecentage

Display 
Expected harvesting(kg) : we calculate 
Expected harvesting =Planted amount*expected fruiting* avgrateUnit



*/

// Transform Firebase crop data to frontend format
function transformCropToFrontendFormat(crop, landIndex) {
  return {
    id: landIndex + 1, // Generate crop id from land index
    itemId: crop.itemId || "001",
    plantedAmount: crop.plantedAmount || 0,
    plantedOn: crop.plantedDate
      ? formatDateForFrontend(crop.plantedDate)
      : formatDateForFrontend(new Date()),
    status: crop.status || "Growing",
    updatedOn: crop.updatedAt
      ? formatDateForFrontend(crop.updatedAt)
      : formatDateForFrontend(new Date()),
    percentage: crop.statusPercentage || crop.percentage || 0,
    imageUrl: crop.imageUrl || "https://via.placeholder.com/50",
    name: crop.name || "Unknown Crop",
  };
}

// Transform Firebase item data to frontend format
function transformItemToFrontendFormat(item) {
  return {
    id: item.id,
    itemId: item.id,
    itemName: item.name || "Unknown Item",
    name: item.name || "Unknown Item",
    category: item.category || "Standard",
    variety: item.category || "Standard", //varaity is same as category dont know why they use a different name
    imageUrl: item.imageUrl,
    season: item.season,
    caloriesPer100g: item.caloriesPer100g,
    farmerTips: item.farmerTips,
    customerInfo: item.customerInfo,
    qualityStandards: item.qualityStandards,
  };
}

/*  FUTURE FIRAS AFTER WE FINISH FARMER MANAGER COME BACK HERE  */

// Transform Firebase shipment data to frontend format
function transformShipmentToFrontendFormat(shipment, shipmentDoc) {
  const shipmentData = shipmentDoc ? shipmentDoc.data() : shipment;
  const shipmentId = shipmentDoc ? shipmentDoc.id : shipment.id;

  // Extract item name from items array if available
  let itemName = "Unknown Item";
  if (shipmentData.items && shipmentData.items.length > 0) {
    itemName = shipmentData.items[0].name || "Mixed Items";
  }

  return {
    id: shipmentId,
    item: itemName,
    amount: shipmentData.totalWeight || shipmentData.amount || 0,
    pickupTime: shipmentData.pickupTime || new Date().toISOString(),
  };
}

// Helper function to format Firebase Timestamp to frontend date string
///THIS IS ONLY FOR ID PURPOSES NOT TO DISPLAY THE DATE LIKE THAT
function formatDateForFrontend(timestamp) {
  if (!timestamp) return new Date().toISOString().split("T")[0];

  let date;
  if (timestamp.toDate) {
    // Firebase Timestamp
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // String timestamp
    date = new Date(timestamp);
  }

  return date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
}

// --- Land Handlers ---

async function getLands(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getLands] Fetching lands for farmerId: ${farmerId}`);

    const lands = await getFarmerLands(farmerId);
    //console.log(`[getLands] Found ${lands.length} lands`);

    res.json({ lands });
  } catch (err) {
    console.error("Error fetching lands:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getFrontendLands(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getFrontendLands] Fetching lands for farmerId: ${farmerId}`);

    const lands = await getFarmerLands(farmerId);
    //console.log(`[getFrontendLands] Found ${lands.length} lands`);

    // Transform lands to include farm info for frontend compatibility
    const transformedLands = lands.map((land, index) => ({
      id: `land_${farmerId}_${index}`,
      landName: land.landName,
      acres: land.acres,
      location: land.location,
      ownership: land.ownership,
      pickupAddress: land.pickupAddress,
      locLat: land.locLat,
      locLng: land.locLng,
      pickupLat: land.pickupLat,
      pickupLng: land.pickupLng,
      farmName: land.farmName || "Farm", // For backward compatibility
      crop: land.crop,
    }));

    //console.log(`[getFrontendLands] Returning ${transformedLands.length} transformed lands`);
    res.json({ lands: transformedLands });
  } catch (err) {
    console.error("[getFrontendLands] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Crop Handlers ---

/*  
IM GUESSING that the crop id they made is basically starts with crop_farmerId_landIndex
and they use it in farmerInventorys id as well

1. i changed some but incase i missed - quantity to plantedAmount
2. in some cases quantity is expectedHarvestingKg in cropsDB but 

*/
async function listCrops(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[listCrops] Fetching crops for farmerId: ${farmerId}`);

    const lands = await getFarmerLands(farmerId);
    const crops = [];

    // Extract crops from all lands
    lands.forEach((land, landIndex) => {
      if (land.crop) {
        crops.push({
          id: `crop_${farmerId}_${landIndex}`,
          landIndex: landIndex,
          landName: land.landName,
          landAcres: land.acres,
          ...land.crop,
        });
      }
    });

    //console.log(`[listCrops] Found ${crops.length} crops`);
    res.json({ crops });
  } catch (err) {
    console.error("Error fetching crops:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getCrop(req, res) {
  try {
    const farmerId = req.user.uid;
    const { cropId } = req.params;

    //console.log(`[getCrop] Fetching crop ${cropId} for farmerId: ${farmerId}`);

    // Extract land index from cropId (format: crop_farmerId_landIndex)
    const landIndex = parseInt(cropId.split("_").pop());

    const lands = await getFarmerLands(farmerId);

    if (landIndex >= 0 && landIndex < lands.length && lands[landIndex].crop) {
      const crop = {
        id: cropId,
        landIndex: landIndex,
        landName: lands[landIndex].landName,
        landAcres: lands[landIndex].acres,
        ...lands[landIndex].crop,
      };

      res.json({ crop });
    } else {
      res.status(404).send({ error: "Crop not found" });
    }
  } catch (err) {
    console.error("Error fetching crop:", err);
    res.status(500).send({ error: err.message });
  }
}

/*
what i understood
yield =expected harvestingKg 
actualYield-delete
img -  it can stay  not worth to be bothered with it anymroe but its the status pic not item pic
quantity is plantedAmount or expectedHarvestingKg/availedForProcurementKg if its farmer inventory data

*/

async function createCrop(req, res) {
  try {
    const farmerId = req.user.uid;

    const {
      farmId,
      itemId,
      plantedAmount,
      avgRatePerUnit,
      ExpectedFruitingPerPlant,
      plantedOn,
      expectedHarvestDate,
      expectedHarvestingKg,
      status,
      statusPercentage,
      imageUrl,
    } = req.body;

    //console.log(`[createCrop] Creating crop for farmerId: ${farmerId}, farmId: ${farmId}`);

    // Get current lands
    const lands = await getFarmerLands(farmerId);

    // Since farmId doesn't match landId, let's find land by name or use as index
    let landIndex = -1;

    // Try to parse farmId as direct index first
    // Frontend sends "00001", "00002", "00003" which should map to index 0, 1, 2
    if (!isNaN(farmId)) {
      const index = parseInt(farmId) - 1; // Convert "00001" to 0, "00002" to 1, etc.
      if (index >= 0 && index < lands.length) {
        landIndex = index;
      }
    }

    // If still not found, try to find by comparing land names or properties
    if (landIndex === -1) {
      // For now, let's find the first land without a crop
      landIndex = lands.findIndex((land) => !land.crop);
    }

    // If still not found, default to first land
    if (landIndex === -1 && lands.length > 0) {
      landIndex = 0;
    }

    if (landIndex === -1 || landIndex >= lands.length) {
      return res.status(400).json({ error: "No suitable land found" });
    }

    //console.log(`[createCrop] Found land at index: ${landIndex}`);

    // Check if item exists and get item details
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(400).json({ error: "Item not found" });
    }

    const itemData = itemDoc.data();
    //console.log(`[createCrop] Item found: ${itemData.name}`);

    // Create crop data combining frontend fields + auto-generated fields
    const cropData = {
      // Frontend fields (use as-is)
      plantedAmount: plantedAmount || 0,
      avgRatePerUnit: avgRatePerUnit || 0,
      status: status || "Planting",
      statusPercentage: statusPercentage || 0,
      ExpectedFruitingPerPlant: ExpectedFruitingPerPlant || 1.5, // Default to 1.5 if not provided
      expectedHarvestingKg: expectedHarvestingKg,
      plantedDate: plantedOn,
      expectedHarvestDate: expectedHarvestDate,
      itemId: itemId,
      imageUrl: imageUrl,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    //console.log(`[createCrop] Crop data prepared:`, cropData);

    // Update the specific land with crop data
    lands[landIndex].crop = cropData;

    // Save updated lands
    try {
      await updateFarmerLands(farmerId, lands);
    } catch (saveError) {
      console.error(`🔧 DEBUG: updateFarmerLands failed:`, saveError);
      throw saveError;
    }

    //console.log(`[createCrop] Successfully created crop in land ${landIndex}`);
    res.status(201).json({
      message: "Crop created successfully",
      crop: {
        id: `crop_${farmerId}_${landIndex}`,
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

// Inventory management helper function
async function manageInventory(farmerId, crop, landIndex, action) {
  try {
    const inventoryRef = db.collection("farmerInventory");
    const cropId = `${farmerId}_${crop.itemId}`; // Use farmerId, itemId, and landIndex to create unique cropId
    /*
farmerInventory 
when added
 "farmer-4_VEG-002": {
    farmerId: string;
    logisticCenterId: LC-1;
    itemId: string;
    currentAvailableForProcurementKg: number///expectedHarvestingKg* agreementPercentage(60% in default for now);
    statusPercentage: number;
    maxOrder: number; when added to farmer inventory for the first time its =expectedHarvestingKg*agreementPercentage(60% in default for now)

    status: string;
    
    sourceLandIds: string[];// change with pickUp location
}

*/

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
          crop.expectedHarvestingKg * agreementPercentage || 60,
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
//quantity is plantedAmount
//precentage is statusPercentage
async function updateCrop(req, res) {
  try {
    const farmerId = req.user.uid;
    const { cropId } = req.params;
    const updateData = req.body;

    //console.log(`[updateCrop] Updating crop ${cropId} for farmerId: ${farmerId}`);
    //console.log(`[updateCrop] Update data:`, updateData);

    // Handle different cropId formats
    let landIndex;
    if (cropId.includes("_")) {
      // Format: crop_farmerId_landIndex
      landIndex = parseInt(cropId.split("_").pop());
      //console.log(`[updateCrop] Found underscore format, landIndex: ${landIndex}`);
    } else {
      // Format: simple number (from frontend transformation) - convert to 0-based index
      landIndex = parseInt(cropId) - 1; // Convert 1-based to 0-based index
      //console.log(`[updateCrop] Found simple number format, converted ${cropId} to landIndex: ${landIndex}`);
    }

    const lands = await getFarmerLands(farmerId);
    //console.log(`[updateCrop] Found ${lands.length} lands for farmer`);

    if (
      isNaN(landIndex) ||
      landIndex < 0 ||
      landIndex >= lands.length ||
      !lands[landIndex].crop
    ) {
      //console.log(`[updateCrop] Crop not found. landIndex: ${landIndex}, landsCount: ${lands.length}, hasCrop: ${lands[landIndex]?.crop ? 'yes' : 'no'}`);
      return res.status(404).send({ error: "Crop not found" });
    }

    // Update crop data (map frontend field names to backend field names)
    const updatedCropData = {
      ...lands[landIndex].crop,
      updatedAt: admin.firestore.Timestamp.now(), // Use actual timestamp instead of FieldValue
    };

    // Map frontend fields to backend fields
    if (updateData.status) updatedCropData.status = updateData.status;
    if (updateData.statusPercentage !== undefined)
      updatedCropData.statusPercentage = updateData.statusPercentage;
    if (updateData.percentage !== undefined)
      updatedCropData.statusPercentage = updateData.percentage; // Handle both field names
    if (updateData.quantity !== undefined)
      updatedCropData.quantity = updateData.quantity;
    if (updateData.notes) updatedCropData.notes = updateData.notes;

    // Inventory management logic - Fixed order and conditions
    const oldStatus = lands[landIndex].crop.status;
    const oldPercentage = lands[landIndex].crop.statusPercentage || 0;
    const newStatus = updatedCropData.status;
    const newPercentage = updatedCropData.statusPercentage || 0;

    // Check for inventory management actions
    if (newStatus === "Harvesting" && oldStatus !== "Harvesting") {
      // Add to inventory when status changes TO harvesting
      await manageInventory(farmerId, updatedCropData, landIndex, "add");
    } else if (newStatus === "Field Clearing") {
      // Remove from inventory when field clearing
      await manageInventory(farmerId, updatedCropData, landIndex, "remove");
    } else if (
      newStatus === "Harvesting" &&
      newPercentage === 100 &&
      oldPercentage < 100
    ) {
      // Remove from inventory when harvesting reaches 100% complete
      await manageInventory(farmerId, updatedCropData, landIndex, "remove");
    }

    lands[landIndex].crop = updatedCropData;

    // Save updated lands
    await updateFarmerLands(farmerId, lands);

    //console.log(`[updateCrop] Successfully updated crop in land ${landIndex}`);
    res.json({
      message: "Crop updated successfully",
      crop: {
        id: cropId,
        landIndex: landIndex,
        landName: lands[landIndex].landName,
        ...lands[landIndex].crop,
      },
    });
  } catch (err) {
    console.error("Error updating crop:", err);
    res.status(500).send({ error: err.message });
  }
}

async function deleteCrop(req, res) {
  try {
    const farmerId = req.user.uid;
    const { cropId } = req.params;

    //console.log(`[deleteCrop] Deleting crop ${cropId} for farmerId: ${farmerId}`);

    // Handle different cropId formats
    let landIndex;
    if (cropId.includes("_")) {
      // Format: crop_farmerId_landIndex
      landIndex = parseInt(cropId.split("_").pop());
    } else {
      // Format: simple number (from frontend transformation)
      landIndex = parseInt(cropId) - 1; // Convert 1-based to 0-based index
    }

    //console.log(`[deleteCrop] Calculated land index: ${landIndex}`);

    const lands = await getFarmerLands(farmerId);

    if (
      isNaN(landIndex) ||
      landIndex < 0 ||
      landIndex >= lands.length ||
      !lands[landIndex].crop
    ) {
      //console.log(`[deleteCrop] Crop not found. landIndex: ${landIndex}, landsCount: ${lands.length}`);
      return res.status(404).send({ error: "Crop not found" });
    }

    try {
      const cropToDelete = lands[landIndex].crop; // Use existing crop id if available

      await manageInventory(farmerId, cropToDelete, landIndex, "remove");
      //console.log(`[deleteCrop] Removed crop ${cropId} from inventory`);
    } catch (inventoryError) {
      console.log(
        `[deleteCrop] Error removing from inventory (may not exist): ${inventoryError.message}`
      );
      // Don't fail the delete operation if inventory removal fails
    }
    // Remove crop from land
    delete lands[landIndex].crop;

    // Save updated lands
    await updateFarmerLands(farmerId, lands);

    // Remove from inventory if it exists

    //console.log(`[deleteCrop] Successfully deleted crop from land ${landIndex}`);
    res.json({ message: "Crop deleted successfully" });
  } catch (err) {
    console.error("Error deleting crop:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Item Handlers ---
//only thing that works i guess
async function getItems(req, res) {
  try {
    //console.log("[getItems] Fetching all generic items");

    const snapshot = await db.collection("items").get();

    if (snapshot.empty) {
      return res.json({ items: [], message: "No items found" });
    }

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    //console.log(`[getItems] Found ${items.length} generic items`);
    res.json({ items });
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).send({ error: err.message });
  }
}

/* future firas*/
// Frontend Shipments Function
async function getFrontendShipments(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getFrontendShipments] Fetching shipments for farmerId: ${farmerId}`);

    // Get shipments
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", farmerId)
      .get();

    // Transform shipments using our transformation function
    const approvedShipments = shipmentsSnapshot.docs
      .filter((doc) => ["approved", "delivered"].includes(doc.data().status))
      .map((doc) => transformShipmentToFrontendFormat(null, doc));

    const shipmentRequests = shipmentsSnapshot.docs
      .filter((doc) => doc.data().status === "pending")
      .map((doc) => transformShipmentToFrontendFormat(null, doc));

    const responseData = {
      approvedShipments,
      shipmentRequests,
    };

    //console.log(`[getFrontendShipments] Returning ${approvedShipments.length} approved, ${shipmentRequests.length} requests`);
    res.json(responseData);
  } catch (err) {
    console.error("[getFrontendShipments] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

// Frontend Items Function
async function getFrontendItems(req, res) {
  try {
    //console.log("[getFrontendItems] Fetching all generic items");

    const snapshot = await db.collection("items").get();

    if (snapshot.empty) {
      return res.json([]);
    }

    // Transform items to frontend format
    const items = snapshot.docs.map((doc) =>
      transformItemToFrontendFormat({ id: doc.id, ...doc.data() })
    );

    //console.log(`[getFrontendItems] Returning ${items.length} transformed items`);
    res.json(items);
  } catch (err) {
    console.error("Error fetching frontend items:", err);
    res.status(500).send({ error: err.message });
  }
}

/*future firas after FM*/
// --- Shipment Handlers ---

async function createShipment(req, res) {
  try {
    const farmerId = req.user.uid;
    const { destination, scheduledDate, pickupTime, driver, items } = req.body;

    //console.log(`[createShipment] Creating shipment for farmerId: ${farmerId}`);

    if (!destination || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).send({
        error: "Missing required fields: destination, items (array)",
      });
    }

    // Calculate totals from items
    let totalWeight = 0;
    let totalVolume = 0;

    for (const item of items) {
      totalWeight += item.quantity || 0;
      totalVolume += (item.quantity || 0) * 1.5; // Estimate volume
    }

    const shipmentData = {
      farmerId,
      destination,
      status: "pending",
      items,
      pickupTime: pickupTime || new Date().toISOString(),
      scheduledDate: scheduledDate || new Date().toISOString(),
      totalWeight,
      totalVolume,
      driver: driver || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("shipments").add(shipmentData);

    //console.log(`[createShipment] Successfully created shipment: ${docRef.id}`);
    res.status(201).json({
      message: "Shipment created successfully",
      shipment: { id: docRef.id, ...shipmentData },
    });
  } catch (err) {
    console.error("Error creating shipment:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getShipments(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getShipments] Fetching shipments for farmerId: ${farmerId}`);

    const snapshot = await db
      .collection("shipments")
      .where("farmerId", "==", farmerId)
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      return res.json({ shipments: [], message: "No shipments found" });
    }

    const shipments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings for frontend
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    //console.log(`[getShipments] Found ${shipments.length} shipments`);
    res.json({ shipments });
  } catch (err) {
    console.error("Error fetching shipments:", err);
    res.status(500).send({ error: err.message });
  }
}

async function getFrontendShipments(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getFrontendShipments] Fetching shipments for farmerId: ${farmerId}`);

    // Get shipments
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", farmerId)
      .get();

    // Transform shipments using our transformation function
    const approvedShipments = shipmentsSnapshot.docs
      .filter((doc) => ["approved", "delivered"].includes(doc.data().status))
      .map((doc) => transformShipmentToFrontendFormat(null, doc));

    const shipmentRequests = shipmentsSnapshot.docs
      .filter((doc) => doc.data().status === "pending")
      .map((doc) => transformShipmentToFrontendFormat(null, doc));

    const responseData = {
      approvedShipments,
      shipmentRequests,
    };

    //console.log(`[getFrontendShipments] Returning ${approvedShipments.length} approved, ${shipmentRequests.length} requests`);
    res.json(responseData);
  } catch (err) {
    console.error("[getFrontendShipments] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

// --- Dashboard Handlers ---
/* 

make sure data names same 
*/
async function getDashboardData(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getDashboardData] Fetching dashboard data for farmerId: ${farmerId}`);

    // Get farmer's lands and count crops
    const lands = await getFarmerLands(farmerId);
    const cropsCount = lands.filter((land) => land.crop).length;

    // Get shipments
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", farmerId)
      .get();

    // Get farmer info
    const farmerDoc = await db.collection("farmers").doc(farmerId).get();
    const farmerData = farmerDoc.exists ? farmerDoc.data() : {};

    const dashboardData = {
      totalLands: lands.length,
      totalCrops: cropsCount,
      totalShipments: shipmentsSnapshot.size,
      pendingShipments: shipmentsSnapshot.docs.filter(
        (doc) => doc.data().status === "pending"
      ).length,
      farmName: farmerData.extraFields?.farmName || "Farm",
      farmerName: `${farmerData.firstName || "Farmer"} ${
        farmerData.lastName || ""
      }`.trim(),
    };

    //console.log(`[getDashboardData] Dashboard data:`, dashboardData);
    res.json(dashboardData);
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send({ error: err.message });
  }
}
/*  future firas - once fm finished */
// Frontend Dashboard Function
async function getFrontendDashboard(req, res) {
  try {
    const farmerId = req.user.uid;
    //console.log(`[getFrontendDashboard] Fetching frontend dashboard data for farmerId: ${farmerId}`);

    // Get farmer's lands and count crops
    const lands = await getFarmerLands(farmerId);
    const cropsCount = lands.filter((land) => land.crop).length;

    // Get shipments
    const shipmentsSnapshot = await db
      .collection("shipments")
      .where("farmerId", "==", farmerId)
      .get();

    // Get farmer info
    const farmerDoc = await db.collection("farmers").doc(farmerId).get();
    const farmerData = farmerDoc.exists ? farmerDoc.data() : {};

    // Transform shipments to frontend format
    const allShipments = shipmentsSnapshot.docs.map((doc) =>
      transformShipmentToFrontendFormat(null, doc)
    );

    // Filter and format approved shipments
    const approvedShipments = shipmentsSnapshot.docs
      .filter((doc) => ["approved", "delivered"].includes(doc.data().status))
      .map((doc) => transformShipmentToFrontendFormat(null, doc));

    // Filter and format shipment requests
    const shipmentRequests = shipmentsSnapshot.docs
      .filter((doc) => doc.data().status === "pending")
      .map((doc) => transformShipmentToFrontendFormat(null, doc));

    // Transform lands to frontend format
    const parsedLands = lands.map((land, index) =>
      transformLandToFrontendFormat(land, index)
    );

    // Summary data for dashboard metrics
    const summary = {
      totalLands: lands.length,
      totalCrops: cropsCount,
      totalShipments: allShipments.length,
      totalRevenue: approvedShipments.reduce(
        (sum, shipment) => sum + shipment.amount * 25,
        0
      ), // Estimate ₹25 per kg
      totalFarms: 1, // Each farmer has one main farm in our structure
      pendingShipments: shipmentRequests.length,
      farmName: farmerData.extraFields?.farmName || "Farm",
      farmerName: `${farmerData.firstName || "Farmer"} ${
        farmerData.lastName || ""
      }`.trim(),
    };

    const responseData = {
      approvedShipments,
      shipmentRequests,
      parsedLands,
      summary,
    };

    //console.log(`[getFrontendDashboard] Returning data:`, {
    //   approvedShipmentsCount: approvedShipments.length,
    //   shipmentRequestsCount: shipmentRequests.length,
    //   parsedLandsCount: parsedLands.length,
    //   summary
    // });

    res.json(responseData);
  } catch (err) {
    console.error("[getFrontendDashboard] Error:", err);
    res.status(500).send({ error: err.message });
  }
}

// Approve shipment request function
async function approveShipmentRequest(req, res) {
  try {
    const farmerId = req.user.uid;
    const { requestId } = req.params;

    //console.log(`[approveShipmentRequest] Approving shipment ${requestId} for farmerId: ${farmerId}`);

    // Get the shipment document
    const shipmentRef = db.collection("shipments").doc(requestId);
    const shipmentDoc = await shipmentRef.get();

    if (!shipmentDoc.exists) {
      return res.status(404).send({ error: "Shipment request not found" });
    }

    const shipmentData = shipmentDoc.data();

    // Verify this shipment belongs to the farmer
    if (shipmentData.farmerId !== farmerId) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Verify this is a pending request
    if (shipmentData.status !== "pending") {
      return res
        .status(400)
        .send({ error: "Only pending shipments can be approved" });
    }

    // Update shipment status to approved
    await shipmentRef.update({
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    //console.log(`[approveShipmentRequest] Successfully approved shipment ${requestId}`);
    res.json({
      message: "Shipment request approved successfully",
      shipmentId: requestId,
      status: "approved",
    });
  } catch (err) {
    console.error("Error approving shipment request:", err);
    res.status(500).send({ error: err.message });
  }
}

// Submit Shipment Report
async function submitShipmentReport(req, res) {
  try {
    const farmerId = req.user.uid;
    const { shipmentId } = req.params;
    const { containers, totalWeight, notes } = req.body;

    //console.log(`[submitShipmentReport] Submitting report for shipment ${shipmentId} by farmer ${farmerId}`);

    // Validate required fields
    if (!containers || !Array.isArray(containers) || containers.length === 0) {
      return res.status(400).json({ error: "Containers data is required" });
    }

    // Get the shipment to verify it belongs to this farmer
    const shipmentDoc = await db.collection("shipments").doc(shipmentId).get();

    if (!shipmentDoc.exists) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    const shipmentData = shipmentDoc.data();

    if (shipmentData.farmerId !== farmerId) {
      return res.status(403).json({
        error: "Access denied - shipment belongs to different farmer",
      });
    }

    // Update shipment with report data
    const reportData = {
      status: "ready_for_pickup",
      containers: containers,
      reportedWeight:
        totalWeight ||
        containers.reduce(
          (sum, container) => sum + (container.weightKg || 0),
          0
        ),
      reportNotes: notes || "",
      reportSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reportSubmittedBy: farmerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("shipments").doc(shipmentId).update(reportData);

    //console.log(`[submitShipmentReport] Successfully updated shipment ${shipmentId} with report data`);

    res.json({
      success: true,
      message: "Shipment report submitted successfully",
      shipmentId: shipmentId,
      status: "ready_for_pickup",
    });
  } catch (err) {
    console.error("[submitShipmentReport] Error:", err);
    res.status(500).json({ error: "Failed to submit shipment report" });
  }
}

// --- Export all functions ---
module.exports = {
  // Land functions
  getLands,
  getFrontendLands,

  // Crop functions
  listCrops,
  getCrop,
  createCrop,
  updateCrop,
  deleteCrop,

  // Item functions
  getItems,
  getFrontendItems,

  // Shipment functions
  createShipment,
  getShipments,
  getFrontendShipments,

  // Dashboard functions
  getDashboardData,
  getFrontendDashboard,

  // Approve shipment request function
  approveShipmentRequest,

  // Submit Shipment Report
  submitShipmentReport,
};
