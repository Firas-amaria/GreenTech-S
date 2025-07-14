const { admin, db } = require("../firebaseConfig");
const { DateTime } = require("luxon");
const { getUpcomingShiftsList } = require("../utils/shiftHelper");
const { FieldPath } = require("firebase-admin/firestore");

function parseTimeStr(timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hour, minute };
}


async function getAllOrdersForShifts(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided." });

    await admin.auth().verifyIdToken(token);

    const upcomingShifts = await getUpcomingShiftsList(db, 6);
    //console.log(upcomingShifts);

    const results = [];
    for (const entry of upcomingShifts) {
      const prefix = `LC-1_ORD_${entry.date}_${entry.shift}`;
      //console.log(`Counting orders for: ${prefix}`);

      const ordersSnap = await db
        .collection("orders")
        .where(FieldPath.documentId(), ">=", prefix)
        .where(FieldPath.documentId(), "<", prefix + "\uf8ff")
        .get();

      results.push({
        shift: `${entry.date.replace(/_/g, "-")} ${capitalizeWords(entry.shift)}`,
        orders: ordersSnap.size
      });
    }

    //console.log("Returning shifts summary:", results);
    return res.json(results);

  } catch (err) {
    //console.error("Error fetching orders for shifts:", err.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

async function getOrdersForShift(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided." });

    await admin.auth().verifyIdToken(token);

    const { date, shift } = req.query;
    if (!date || !shift) {
      return res.status(400).json({ error: "Missing date or shift in query." });
    }

    const prefix = `LC-1_ORD_${date.replace(/-/g, "_")}_${shift}`;
    //console.log(`Looking up orders with prefix: ${prefix}`);

    const ordersSnap = await db.collection("orders")
      .where(FieldPath.documentId(), ">=", prefix)
      .where(FieldPath.documentId(), "<", prefix + "\uf8ff")
      .get();

    const orders = ordersSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        data,
        
      };
    });

   // console.log(`Found ${orders.length} orders for ${date} ${shift}`);
    return res.json(orders);

  } catch (err) {
    //console.error("Error fetching orders for shift:", err.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// orders summary for shift -orders+ summarry by items, by farmer
async function getOrdersWithSummaryForShift(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token." });

    await admin.auth().verifyIdToken(token);

    const { shift, date } = req.query;
    if (!shift || !date)
      return res.status(400).json({ error: "Missing shift or date." });

    const prefix = `LC-1_ORD_${date}_${shift}`;
   // console.log(`Fetching orders+summary for docId prefix: ${prefix}`);

    const ordersSnap = await db
      .collection("orders")
      .where(FieldPath.documentId(), ">=", prefix)
      .where(FieldPath.documentId(), "<", prefix + "\uf8ff")
      .get();

    const orders = [];
    const summaryMap = {};

    ordersSnap.forEach((doc) => {
      const data = doc.data();
      const docParts = doc.id.split("_");
      const randomNumber = docParts[docParts.length - 1];

      orders.push({
        orderNumber: randomNumber,
        ...data,
      });

      (data.items || []).forEach((item) => {
        if (!summaryMap[item.itemName]) {
          summaryMap[item.itemName] = { totalKg: 0, sources: {} };
        }
        summaryMap[item.itemName].totalKg += item.quantity;

        const farmerId = item.sourceFarmerId || "UNKNOWN_ID";
        const farmName = item.sourceFarmName || "UNKNOWN FARM";
        const farmerKey = `${farmerId}|${farmName}`;

        if (!summaryMap[item.itemName].sources[farmerKey]) {
          summaryMap[item.itemName].sources[farmerKey] = 0;
        }
        summaryMap[item.itemName].sources[farmerKey] += item.quantity;
      });
    });

    return res.json({ orders, summary: summaryMap });
  } catch (error) {
   // console.error("Error loading orders+summary for shift:", error.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getOrdersForUpcomingShifts(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided." });

    await admin.auth().verifyIdToken(token);

    // Load shifts
    const shiftsSnap = await db.collection("shifts").get();
    if (shiftsSnap.empty)
      return res.status(404).json({ error: "No shifts defined." });

    let shifts = [];
    shiftsSnap.forEach((doc) => {
      const data = doc.data();
      shifts.push({
        name: doc.id.toLowerCase(),
        start: data.start,
        end: data.end,
      });
    });

    shifts.sort((a, b) => {
      const timeA =
        parseTimeStr(a.start).hour * 60 + parseTimeStr(a.start).minute;
      const timeB =
        parseTimeStr(b.start).hour * 60 + parseTimeStr(b.start).minute;
      return timeA - timeB;
    });

    const now = DateTime.local();
    const upcomingShifts = [];
    let dayCursor = now;

    while (upcomingShifts.length < 6) {
      const dateStr = dayCursor.toISODate().replace(/-/g, "_");

      for (const shift of shifts) {
        const { hour: startHour, minute: startMinute } = parseTimeStr(
          shift.start
        );
        const { hour: endHour, minute: endMinute } = parseTimeStr(shift.end);

        let shiftStartTime = dayCursor.set({
          hour: startHour,
          minute: startMinute,
          second: 0,
          millisecond: 0,
        });

        let shiftEndTime = dayCursor.set({
          hour: endHour,
          minute: endMinute,
          second: 0,
          millisecond: 0,
        });

        // Handle night shifts that end after midnight
        if (
          endHour < startHour ||
          (endHour === startHour && endMinute < startMinute)
        ) {
          shiftEndTime = shiftEndTime.plus({ days: 1 });
        }

        if (shiftEndTime > now) {
          upcomingShifts.push({ date: dateStr, shift: shift.name });
          if (upcomingShifts.length === 6) break;
        }
      }

      dayCursor = dayCursor.plus({ days: 1 });
    }

    // Now for each shift, count matching orders by docId prefix
    const results = [];
    for (const entry of upcomingShifts) {
      const prefix = `LC-1_ORD_${entry.date}_${entry.shift}`;
     // console.log(`Counting orders for: ${prefix}`);

      const ordersSnap = await db
        .collection("orders")
        .where(FieldPath.documentId(), ">=", prefix)
        .where(FieldPath.documentId(), "<", prefix + "\uf8ff")
        .get();

      console.log(
        `Found ${ordersSnap.size} orders for ${entry.shift} on ${entry.date}`
      );

      results.push({
        shift: entry.shift,
        date: entry.date,
        totalOrders: ordersSnap.size,
      });
    }

    return res.json(results);
  } catch (error) {
    console.error("Error fetching upcoming orders by shift:", error.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
}


module.exports={
  getAllOrdersForShifts,
  getOrdersForShift,
  getOrdersWithSummaryForShift,
  getOrdersForUpcomingShifts,

}