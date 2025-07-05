const { db } = require("../firebaseConfig");

const getDashboardStatus = async (req, res) => {
  try {
    const logisticCenterId = "LC-1";

    // Get shift names from DB
    const shiftsSnap = await db.collection("shifts").get();
    const allShifts = shiftsSnap.docs.map((doc) => doc.id); // ["morning", "afternoon", "night"]

    const createdShifts = [];
    const notCreatedShifts = [];

    // Helper to process a date
    const processDay = async (date, includeMissing) => {
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayName = date
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase(); // e.g., "saturday"

      for (const shift of allShifts) {
        const shiftId = `${dayName}-${shift}`;
        const docId = `${logisticCenterId}_${dateStr}_${shiftId}`;

        const stockSnap = await db
          .collection("availableMarketStock")
          .doc(docId)
          .get();

        if (stockSnap.exists && stockSnap.data().items?.length > 0) {
          createdShifts.push({
            shift: shiftId,
            count: stockSnap.data().items.length,
            date: dateStr,
          });
        } else if (includeMissing) {
          notCreatedShifts.push(shiftId);
        }
      }
    };

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await processDay(today, false); // created only
    await processDay(tomorrow, true); // created + not created

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
TO CHECK:
- get auth if role is FM or admin 
- get user id and user name 
-createdbyID  + createdByName 
when creating shipment make sure in farmer inventory  to decrease from max order the forecastedQuantityKg



*/


const createStockItem = async (req, res) => {
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
          generatedAt: now.toISOString(),
          createdByManagerId: updatedBy,
          items: []
        };

    stockData.items.push({
      itemId,
      itemDisplayName,
      itemPictureUrl,
      sourceFarmerId,
      sourceFarmerName,
      sourceFarmName: "UNKNOWN FARM",
      currentAvailableQuantityKg,
      originalCommittedQuantityKg,
      pricePerUnit: finalPrice,
      status: "active",
      sourceLandId
    });

    stockData.lastUpdatedAt = now.toISOString();
    stockData.updatedBy = updatedBy;
    stockData.updatedByName = updatedByName;

    await stockDocRef.set(stockData, { merge: true });

    // 🔥 Create shipmentRequest
    const sreqId = `${logisticCenterId}_SReq_${dateForId}_${shiftType}_${sourceFarmerId}_${itemId}`;
    const shipmentRequest = {
      logisticCenterId,
      farmerManagerId: updatedBy,
      farmerManagerName: updatedByName,
      farmerId: sourceFarmerId,
      farmerName: sourceFarmerName,
      createdAt: now.toISOString(),
      scheduledPickupDate: `${dateStr}T00:00:00Z`,
      scheduledPickupTimeSlot: shift,
      status: "forecasted",
      itemId,
      itemDisplayName,
      forecastedQuantityKg: originalCommittedQuantityKg,
      finalConfirmedQuantityKg: null,
      expectedContainerCount: Math.ceil(originalCommittedQuantityKg / 50),
      exactAmountConfirmedAt: null,
      farmerLastNotifiedAt: null,
      lastUpdatedAt: now.toISOString(),
      updatedBy,
      updatedByName,
      correspondingShipmentId: null
    };
    await db.collection("shipmentRequests").doc(sreqId).set(shipmentRequest);

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
};





// 🔁 Helper function to get the next date for a given weekday
function getNextWeekdayDate(dayName) {
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
  const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = (targetDay + 7 - todayDay) % 7 || 7; // Get the next occurrence of the day (never today)
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

module.exports = {
  getDemandStatistics,
  getFarmerInventory,
  createStockItem,
  getDashboardStatus,
};
