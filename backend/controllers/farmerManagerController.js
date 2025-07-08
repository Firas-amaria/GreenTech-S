const { admin, db } = require("../firebaseConfig");

const getDashboardStatus = async (req, res) => {
  try {
    const logisticCenterId = "LC-1";

    const shiftsSnap = await db.collection("shifts").get();
    const allShifts = shiftsSnap.docs.map((doc) => doc.id); // e.g., ["morning", "afternoon", "night"]

    const createdShifts = [];
    const notCreatedShifts = [];

    const today = new Date();

    // Loop from past 1 days to 3 days ahead
    for (let offset = -1; offset <= 3; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);

      const dateStr = date.toISOString().split("T")[0];
      const dateForId = dateStr.replace(/-/g, "_");

      const dayName = date
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      for (const shift of allShifts) {
        const shiftId = `${dayName}-${shift}`;
        const docId = `${logisticCenterId}_AS_${dateForId}_${shift}`;
        // console.log("Checking stock for:", docId);

        const stockSnap = await db
          .collection("availableMarketStock")
          .doc(docId)
          .get();

        const hasItems = stockSnap.exists && stockSnap.data().items?.length > 0;

        if (hasItems) {
          createdShifts.push({
            shift: shiftId,
            count: stockSnap.data().items.length,
            date: dateStr,
          });
        } else if (offset === 1) {
          // Only mark as missing if it's TOMORROW and not created
          notCreatedShifts.push(shiftId);
        }
      }
    }

    return res.json({ createdShifts, notCreatedShifts });
  } catch (err) {
    console.error("Error fetching dashboard status:", err);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

// GET demand statistics for a given shift
const getDemandStatistics = async (req, res) => {
  try {
    const { shift } = req.params; // e.g., "sunday-morning"
    //console.log("🔍 Received request for demand statistics with shift:", shift);

    if (!shift) {
      console.warn("⚠️ Missing shift parameter in request.");
      return res.status(400).json({ error: "Missing shift param" });
    }

    const docRef = db.collection("demandStatistics").doc(shift);
    // console.log("📄 Firestore doc path:", docRef.path);

    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn(
        `❌ No document found for shift '${shift}' in demandStatistics.`
      );
      return res.status(404).json({ error: "No stats for this shift" });
    }

    const data = doc.data();
    // console.log("📦 Document data:", data);

    return res.json({ items: data.items || [] });
  } catch (err) {
    console.error("❗ Error getting demand statistics:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET all farmer inventory for a specific itemId
// GET all farmer inventory entries for a specific itemId
const getFarmerInventory = async (req, res) => {
  try {
    const snapshot = await db.collection("farmerInventory").get();

    const results = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        farmerId: data.farmerId,
        itemId: data.itemId,
        currentAvailableForProcurementKg: data.currentAvailableForProcurementKg,
        maxOrder: data.maxOrder,
        status: data.status,
        pickupAddress: data.pickupAddress || "UNKNOWN ADDRESS",
        // add more fields if needed
      });
    });

    return res.json({ inventory: results });
  } catch (err) {
    console.error("Error fetching all inventory:", err);
    return res.status(500).json({ error: "Server error" });
  }
};



const createStockItem = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  const today = new Date();

  try {
    const {
      logisticCenterId,
      shift, // e.g., "monday-morning"
      items = [], // Array of stock items
    } = req.body;

    const decodedToken = await admin.auth().verifyIdToken(token);
    const createdbyID = decodedToken.uid;

    const userDoc = await db.collection("users").doc(createdbyID).get();
    if (!userDoc.exists) {
      console.warn(`User profile not found for UID: ${createdbyID}`);
      return null; // <- return null so we can filter it out
    }
    const userData = userDoc.data();
    const createdByName = userData.firstName + " " + userData.lastName;

    const [dayName, shiftType] = shift.toLowerCase().split("-");
    const targetDate = getNextOrTodayWeekdayDate(dayName);
    console.log(
      `� Next or today date for ${dayName}: ${targetDate.toISOString()}`
    );

    const dateStr = targetDate.toISOString().split("T")[0];
    const dateForId = dateStr.replace(/-/g, "_");
    console.log(`📅 Formatted date for ID: ${dateForId}`);

    const stockDocId = `${logisticCenterId}_AS_${dateForId}_${shiftType}`;
    const stockDocRef = db.collection("availableMarketStock").doc(stockDocId);
    const stockDoc = await stockDocRef.get();

    const stockData = stockDoc.exists
      ? stockDoc.data()
      : {
          logisticCenterId,
          availableDate: `${dateStr}T00:00:00Z`,
          availableShift: shift,
          generatedAt: today.toISOString(),
          createdByManagerId: createdbyID,
          items: [],
        };

    const createdShipmentIds = [];

    for (const item of items) {
      const {
        itemId,
        itemDisplayName,
        sourceFarmerId,
        pickupAddress,
        currentAvailableQuantityKg,
        originalCommittedQuantityKg,
      } = item;

      // 🔎 Lookup item price from items collection
      const itemDoc = await db.collection("items").doc(itemId).get();
      if (!itemDoc.exists) {
        console.warn(`⚠️ Item not found in catalog: ${itemId}`);
        continue; // Skip this item
      }

      const itemData = itemDoc.data();
      const basePrice = itemData.price?.a || 0;
      const finalPrice = parseFloat((basePrice * 1.2).toFixed(2));

      const sourceFarmerDoc = await db
        .collection("users")
        .doc(sourceFarmerId)
        .get();
      if (!sourceFarmerDoc.exists) {
        console.warn(`User profile not found for UID: ${sourceFarmerId}`);
        return null; // <- return null so we can filter it out
      }
      const sourceFarmerData = sourceFarmerDoc.data();
      const sourceFarmerName =
        sourceFarmerData.firstName + " " + sourceFarmerData.lastName;
      const farmerDoc = await db
        .collection("farmers")
        .doc(sourceFarmerId)
        .get();
      if (!farmerDoc.exists) {
        console.warn(`User profile not found for UID: ${sourceFarmerId}`);
        return null; // <- return null so we can filter it out
      }
      const farmerData = farmerDoc.data();

      //shimReq unique ID
      const sreqId = `${logisticCenterId}_SReq_${dateForId}_${shiftType}_${sourceFarmerId}_${itemId}`;
      // Add stock item
      stockData.items.push({
        itemId,
        itemDisplayName,
        sourceFarmerId,
        sourceFarmerName: sourceFarmerName,
        sourceFarmName: farmerData.farmName || "UNKNOWN FARM",
        pickupAddress,
        currentAvailableQuantityKg,
        originalCommittedQuantityKg,
        pricePerUnit: finalPrice,
        status: "active",
        shipReqId: sreqId,
      });

      const shiftTimeData = db.collection("shifts").doc(shiftType);

      // 🔥 Create shipmentRequest

      const shipmentRequest = {
        logisticCenterId,
        farmerManagerId: createdbyID,
        farmerManagerName: createdByName,
        farmerId: sourceFarmerId,
        farmerName: sourceFarmerName,
        pickupAddress,
        createdAt: today.toISOString(),
        scheduledPickupDate: `${dateStr}T00:00:00Z`,
        scheduledPickupTimeSlot: shift,
        status: "forecasted",
        itemId,
        itemDisplayName,
        forecastedQuantityKg: originalCommittedQuantityKg,
        finalConfirmedQuantityKg: null,
        //Future Purposes: container can handle 20KG Created avg rate per unit in gr and get it from item  data
        expectedContainerCount: Math.ceil(originalCommittedQuantityKg / 20),
        exactAmountConfirmedAt: null,
        farmerLastNotifiedAt: null,
        lastUpdatedAt: today.toISOString(),
        createdbyID,
        createdByName,
        correspondingShipmentId: null,
      };

      const farmerInventoryId = `${sourceFarmerId}_${itemId}`;
      const inventoryRef = db
        .collection("farmerInventory")
        .doc(farmerInventoryId);
      await inventoryRef.update({
        maxOrder: admin.firestore.FieldValue.increment(
          -originalCommittedQuantityKg
        ),
        currentAvailableForProcurementKg: admin.firestore.FieldValue.increment(
          -originalCommittedQuantityKg
        ),
      });

      await db.collection("shipmentRequests").doc(sreqId).set(shipmentRequest);
      createdShipmentIds.push(sreqId);
    }

    // Save stock data
    stockData.lastUpdatedAt = today.toISOString();
    stockData.createdbyID = createdbyID;
    stockData.createdByName = createdByName;

    await stockDocRef.set(stockData, { merge: true });

    res.status(200).json({
      message: "✅ Stock items and shipment requests saved.",
      stockId: stockDocId,
      shipmentRequestIds: createdShipmentIds,
    });
  } catch (err) {
    console.error("❌ Error creating stock items:", err);
    res.status(500).json({
      error: err.message || "failed to create stock items",
    });
  }

  //Update maxOrder in farmer inventory
};

// 🔁 Helper function to get the next date for a given weekday
function getNextOrTodayWeekdayDate(dayName) {
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const targetDay = daysOfWeek.indexOf(dayName.toLowerCase());
  if (targetDay === -1) throw new Error("Invalid day name in shift");
  const today = new Date();
  console.log(`🔍 Today is: ${today.toISOString()}`);
  const todayDay = today.getDay();
  console.log(`🔍 Target day is: ${targetDay} (${dayName})`);
  const diff = targetDay - todayDay; // 0 = today
  if (diff < 0) {
    diff += 7; // If the target day is in the past, move to next week
  }
  console.log(`🔍 Day difference: ${diff}`);
  const result = today;
  result.setDate(today.getDate() + diff);
  console.log(`🔍 Resulting date: ${result.toISOString()}`);
  return result;
}

// GET /api/farmerManager/shipmentRequests/:shift
const getShipmentRequestsForShift = async (req, res) => {
  try {
    const { shift } = req.params; // e.g. "sunday-afternoon"
    const [dayName, shiftType] = shift.split("-");

    if (!dayName || !shiftType) {
      return res
        .status(400)
        .json({ error: "Invalid shift format. Use 'sunday-morning'" });
    }

    // 🔁 Calculate target date
    const targetDate = getNextOrTodayWeekdayDate(dayName.toLowerCase());
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}_${mm}_${dd}`;

    // 🔥 Load matching availableMarketStock
    const stockDocId = `LC-1_AS_${shift}_${formattedDate}`;
    const stockDoc = await db
      .collection("availableMarketStock")
      .doc(stockDocId)
      .get();
    const stockItems = stockDoc.exists ? stockDoc.data().items : [];

    // 🔍 Query all shipmentRequests with status != finalized
    const snapshot = await db
      .collection("shipmentRequests")
      .where("status", "!=", "finalized")
      .get();

    // 🔍 Filter by ID structure
    const filtered = snapshot.docs
      .filter((doc) => {
        const parts = doc.id.split("_");
        return (
          parts[0] === "LC-1" &&
          parts[1] === "SReq" &&
          parts[2] === yyyy.toString() &&
          parts[3] === mm &&
          parts[4] === dd &&
          parts[5] === shiftType
        );
      })
      .map((doc) => {
        const data = doc.data();
        // 🔍 Try to find matching stock item
        const matchingItem = stockItems.find(
          (item) =>
            item.itemId === data.itemId && item.sourceFarmerId === data.farmerId
        );

        let committedOrders = null;
        if (matchingItem) {
          committedOrders =
            matchingItem.originalCommittedQuantityKg -
            matchingItem.currentAvailableQuantityKg;
        }

        return {
          id: doc.id,
          ...data,
          committedOrders,
        };
      });

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error in getShipmentRequestsForShift:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/farmerManager/finalizeShipmentRequest
const shipmentRequestQuantitiesConfirmed = async (req, res) => {
  try {
    const { shipmentRequestId, finalConfirmedQuantityKg } = req.body;

    if (!shipmentRequestId || finalConfirmedQuantityKg == null) {
      return res.status(400).json({ error: "Missing data in request body" });
    }

    const sreqRef = db.collection("shipmentRequests").doc(shipmentRequestId);
    const sreqSnap = await sreqRef.get();

    if (!sreqSnap.exists) {
      return res.status(404).json({ error: "Shipment request not found" });
    }

    // 🔥 Now update farmer inventory maxOrder
    const farmerInventoryId = `${sreqRef.farmerId}_${sreqRef.itemId}`;
    const farmerInventoryRef = db
      .collection("farmerInventory")
      .doc(farmerInventoryId);
    const farmerInventorySnap = await farmerInventoryRef.get();

    if (farmerInventorySnap.exists) {
      const farmerData = farmerInventorySnap.data();
      const updatedMaxOrder = (
        parseFloat(farmerData.maxOrder || 0) +
        shipmentRequest.forecastedQuantityKg -
        finalConfirmedQuantityKg
      ).toFixed(2);
      const updateAVailableForProcurementKg = (
        parseFloat(farmerData.currentAvailableForProcurementKg || 0) +
        shipmentRequest.forecastedQuantityKg -
        finalConfirmedQuantityKg
      ).toFixed(2);

      await farmerInventoryRef.update({
        maxOrder: parseFloat(updatedMaxOrder),
        currentAvailableForProcurementKg: parseFloat(updateAVailableForProcurementKg),
      });
    }

    const now = new Date();
    const shipmentRequest = sreqSnap.data();

    // Update shipment request
    await sreqRef.update({
      finalConfirmedQuantityKg,
      status: "finalized",
      exactAmountConfirmedAt: now.toISOString(),
    });

    // res.status(200).json({ message: "Shipment request finalized", shipmentId });
    res.status(200).json({ message: "Shipment request updated" });
  } catch (error) {
    console.error("Error finalizing shipment request:", error);
    res.status(500).json({ error: "Failed to finalize shipment request" });
  }
};

const getApplication = async (req, res) => {
  try {
    const snapshot = await db.collection("employmentApplications").get();
    const results = [];

    for (const doc of snapshot.docs) {
      const uid = doc.id;
      const applicationData = doc.data();

      // Only allow 'pending' or 'contacted' statuses
      if (
        applicationData.status !== "pending" &&
        applicationData.status !== "contacted"
      ) {
        continue;
      }

      if (applicationData.role !== "farmer") {
        continue;
      }

      // Get the user profile using the same UID
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        console.warn(`User profile not found for UID: ${uid}`);
        continue;
      }

      const userData = userDoc.data();
      results.push({
        uid: uid,
        role: applicationData.role,
        status: applicationData.status,
        submittedAt: applicationData.submittedAt,
        extraFields: applicationData.extraFields,

        // Append user profile fields
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        birthDate: userData.birthDate,
      });
    }

    res.send(results);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).send({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection("farmers").get();
    const results = [];

    for (const doc of snapshot.docs) {
      const uid = doc.id;
      const farmerData = doc.data();

      // Get the user profile using the same UID
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        console.warn(`User profile not found for UID: ${uid}`);
        continue;
      }

      const userData = userDoc.data();
      results.push({
        uid: uid,
        extraFields: farmerData.extraFields || {}, // Include any extra fields from farmer data
        // Append user profile fields
        firstName: userData.firstName,
        role: userData.role,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        birthDate: userData.birthDate,
      });
    }

    res.send(results);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

// PUT /api/farmerManager/updateAggrement/:uid
const updateAggrementPrecentage = async (req, res) => {
  const { uid } = req.params;
  const { agreementPercentage } = req.body;

  if (!uid || agreementPercentage == null) {
    return res
      .status(400)
      .json({ error: "Missing uid or agreementPercentage in request" });
  }

  try {
    const farmerRef = db.collection("farmers").doc(uid);
    const doc = await farmerRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    await farmerRef.update({ extraFields: { agreementPercentage } });
    return res.status(200).json({ message: "Agreement percentage updated" });
  } catch (error) {
    console.error("Error updating agreementPercentage:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

async function updateApplicationStatus(req, res) {
  const uid = req.params.uid;
  const { status, role, firstName, lastName, phone } = req.body;

  if (!uid || !status) {
    return res.status(400).send({ error: "Missing UID or status" });
  }

  const validStatuses = ["pending", "contacted", "denied", "approved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).send({ error: `Invalid status: ${status}` });
  }

  const appRef = db.collection("employmentApplications").doc(uid);

  try {
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return res.status(404).send({ error: "Application not found" });
    }

    const appData = appSnap.data();

    // If status is approved, do the full approval process
    if (status === "approved") {
      // 1. Copy to the role-specific collection
      await db
        .collection("farmers")
        .doc(uid)
        .set({
          //add name and phone number
          ...appData,
          firstName,
          lastName,
          phone,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // 2. Update user's main role
      await db.collection("users").doc(uid).set(
        {
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // For all statuses (including "approved"), update the application status
    await appRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.send({ message: `Application marked as ${status}` });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send({ error: error.message });
  }
}


// GET all items for farmer manager with all details
const getAllItems = async (req, res) => {
  try {
    const snapshot = await db.collection("items").get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(items);
  } catch (err) {
    console.error("Error getting items:", err);
    return res.status(500).json({ error: "Failed to load items" });
  }
};

// ADD new item
const addNewItem = async (req, res) => {
  try {
    const data = req.body;
    const ref = await db.collection("items").add({
      ...data,
      lastUpdated: new Date().toISOString(),
    });
    return res.json({ id: ref.id });
  } catch (err) {
    console.error("Error adding item:", err);
    return res.status(500).json({ error: "Failed to add item" });
  }
};

// EDIT existing item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("items").doc(id).update({
      ...req.body,
      lastUpdated: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Error updating item:", err);
    return res.status(500).json({ error: "Failed to update item" });
  }
};


const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({ error: "Missing item ID" });
    }

    await db.collection("items").doc(itemId).delete();

    return res.json({ success: true, message: "Item deleted successfully." });
  } catch (err) {
    console.error("Failed to delete item:", err);
    return res.status(500).json({ error: "Could not delete item" });
  }
};


module.exports = {
  updateApplicationStatus,
  getAllUsers,
  getApplication,
  getShipmentRequestsForShift,
  updateAggrementPrecentage,
  shipmentRequestQuantitiesConfirmed,
  getDemandStatistics,
  getFarmerInventory,
  createStockItem,
  getDashboardStatus,
   getAllItems,
  addNewItem,
  updateItem,
  deleteItem
};