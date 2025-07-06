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


/*
TODO:
get farmer inventory id 
update max order-=committed quantity

then in shipment finalize
commitedOrders= originalCommittedQuantityKg- currentAvailableQuantityKg
// Update farmer inventory with finalized quantity 
maxOrder =maxOrder- finalizedQuantityKg+ orginalCommittedQuantityKg

farmerId_itemId

*/


const createStockItem = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  const today = new Date();

  try {
    const {
      logisticCenterId = "LC-1",
      shift, // e.g., "monday-morning"
      itemId,
      itemDisplayName,
      itemPictureUrl = "https://example.com/images/default.jpg",
      sourceFarmerId,
      sourceFarmerName,
      sourceLandId,
      currentAvailableQuantityKg,
      originalCommittedQuantityKg
    } = req.body;

    // 🔥 Manager details from headers
    const updatedBy = req.headers["x-user-id"] || "UNKNOWN-UID";
    const updatedByName = req.headers["x-user-name"] || "Unknown Manager";

    const now = new Date();
    const [dayName, shiftType] = shift.toLowerCase().split("-");
    const targetDate = getNextWeekdayDate(dayName);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dateForId = dateStr.replace(/-/g, "_");

    // 🔎 Lookup item price from items collection
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ error: "Item not found in catalog" });
    }
    const itemData = itemDoc.data();
    const basePrice = (itemData.price?.a) || 0;
    const finalPrice = parseFloat((basePrice * 1.2).toFixed(2));

//Lookup for farm name 
    const farmerDoc = await db.collection("farmers").doc(farmerId).get();
    if(!farmerDoc.exists) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    const farmerData= farmerDoc.data();
    const sourceFarmName = farmerData.farmName || "UNKNOWN FARM";
    //const sourceFarmerName = farmerData.name || "UNKNOWN FARMER";

    // 🔥 Create / update availableStock
    const stockDocId = `${logisticCenterId}_AS_${dateForId}_${shift}`;
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
          createdByManagerName: createdByName,
          createdByManagerName: createdByName,
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

      await db.collection("shipmentRequests").doc(sreqId).set(shipmentRequest);
      createdShipmentIds.push(sreqId);
    }

    // Save stock data
    stockData.lastUpdatedAt = today.toISOString();
    stockData.createdbyID = createdbyID;
    stockData.createdByName = createdByName;

    await stockDocRef.set(stockData, { merge: true });

    res.status(200).json({
      message: "Stock item and shipment request saved successfully.",
      stockId: stockDocId,
      shipmentRequestId: sreqId
    });
  } catch (err) {
    console.error("Error creating stock:", err);
    res.status(500).json({
      error: err.message || "failed to create stock item"
    });
  }

//Update maxOrder in farmer inventory

const farmerInventoryId = `${farmerId}_${itemId}`;
const inventoryRef = db.collection("farmerInventory").doc(farmerInventoryId);
await inventoryRef.update({
  maxOrder: admin.firestore.FieldValue.increment(-originalCommittedQuantityKg)
});

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
  const todayDay = today.getDay();
  const diff = targetDay - todayDay + 7; // 0 = today
  const result = today;
  result.setDate(today.getDate() + diff);

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
    const stockDoc = await db.collection("availableMarketStock").doc(stockDocId).get();
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
        const matchingItem = stockItems.find(item =>
          item.itemId === data.itemId && item.sourceFarmerId === data.farmerId
        );

        let committedOrders = null;
        if (matchingItem) {
          committedOrders = matchingItem.originalCommittedQuantityKg - matchingItem.currentAvailableQuantityKg;
        }

        return {
          id: doc.id,
          ...data,
          committedOrders
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
const farmerInventoryId = `${shipmentRequest.farmerId}_${shipmentRequest.itemId}`;
const farmerInventoryRef = db.collection("farmerInventory").doc(farmerInventoryId);
const farmerInventorySnap = await farmerInventoryRef.get();

if (farmerInventorySnap.exists) {
  const farmerData = farmerInventorySnap.data();
  const updatedMaxOrder = 
    (parseFloat(farmerData.maxOrder || 0) + 
     shipmentRequest.forecastedQuantityKg - 
     finalConfirmedQuantityKg).toFixed(2);

  await farmerInventoryRef.update({
    maxOrder: parseFloat(updatedMaxOrder)
  });
}


    const now = new Date();
    const shipmentRequest = sreqSnap.data();

    // Update shipment request
    await sreqRef.update({
      finalConfirmedQuantityKg,
      status: "finalQuantitiesConfirmed",
      exactAmountConfirmedAt: now.toISOString(),
    });

    // // Create shipment
    // const shipmentId = `SHIP_${shipmentRequest.farmerId}_${
    //   shipmentRequest.itemId
    // }_${now.getTime()}`;
    // const shipmentData = {
    //   id: shipmentId,
    //   logisticCenterId: shipmentRequest.logisticCenterId || "LC-1",
    //   farmerId: shipmentRequest.farmerId,
    //   driverId: null,
    //   origin: null,
    //   destination: null,
    //   createdAt: now.toISOString(),
    //   pickupTime: null,
    //   overallStatus: null,
    //   problemFlag: false,
    //   shipmentRequestId,
    //   shipmentBarcode: null,
    //   containerBarcodes: [],
    //   stages: [],
    //   fullReport: null,
    // };

    // await db.collection("shipments").doc(shipmentId).set(shipmentData);

    // // Optionally update the shipmentRequest with shipment ID
    // await sreqRef.update({
    //   correspondingShipmentId: shipmentId,
    // });

    // res.status(200).json({ message: "Shipment request finalized", shipmentId });
    res.status(200).json({ message: "Shipment request updated" });
  } catch (error) {
    console.error("Error finalizing shipment request:", error);
    res.status(500).json({ error: "Failed to finalize shipment request" });
  }
};

module.exports = {
  getShipmentRequestsForShift,
  shipmentRequestQuantitiesConfirmed,
  getDemandStatistics,
  getFarmerInventory,
  createStockItem,
  getDashboardStatus,
};
