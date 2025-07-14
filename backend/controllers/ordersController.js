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

    console.log("Returning shifts summary:", results);
    return res.json(results);

  } catch (err) {
    console.error("Error fetching orders for shifts:", err.stack);
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
    console.log(`Looking up orders with prefix: ${prefix}`);

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

    console.log(`Found ${orders.length} orders for ${date} ${shift}`);
    return res.json(orders);

  } catch (err) {
    console.error("Error fetching orders for shift:", err.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
}


module.exports={
  getAllOrdersForShifts,
  getOrdersForShift,

}