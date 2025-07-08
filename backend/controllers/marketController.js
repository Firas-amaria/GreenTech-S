const { DateTime } = require("luxon");
const { admin, db } = require("../firebaseConfig");


async function getAvailableShifts(req, res) {
  try {
    const shiftsConfig = {
      morning: { start: "01:00", end: "07:00" },
      afternoon: { start: "07:00", end: "13:00" },
      evening: { start: "13:00", end: "19:00" },
      night: { start: "19:00", end: "01:00" }
    };

    const now = DateTime.now().setZone("Asia/Jerusalem");
    const availableShifts = [];

    for (let i = 0; i < 2; i++) {
      const day = now.plus({ days: i }).startOf("day");

      for (const [shiftName, times] of Object.entries(shiftsConfig)) {
        let shiftStart = DateTime.fromFormat(times.start, "HH:mm", { zone: "Asia/Jerusalem" });
        let shiftEnd = DateTime.fromFormat(times.end, "HH:mm", { zone: "Asia/Jerusalem" });

        if (shiftName !== "night") {
          shiftStart = shiftStart.set({ year: day.year, month: day.month, day: day.day });
          shiftEnd = shiftEnd.set({ year: day.year, month: day.month, day: day.day });
        } else {
          shiftStart = shiftStart.set({ year: day.year, month: day.month, day: day.day });
          shiftEnd = shiftEnd.plus({ days: 1 }).set({ year: day.plus({ days:1 }).year, month: day.plus({ days:1 }).month, day: day.plus({ days:1 }).day });
        }

        if (shiftStart > now) {
          // Check Firestore if this stock exists
          const stockId = `LC-1_AS_${day.toFormat("yyyy_MM_dd")}_${shiftName}`;
          const stockDoc = await db.collection("availableMarketStock").doc(stockId).get();

          if (stockDoc.exists) {
            const deliveryTime = shiftEnd.minus({ hours: 1 }).toFormat("HH:mm") + "-" + shiftEnd.toFormat("HH:mm");
            availableShifts.push({
              id: stockId, // now we return the actual stock id
              label: `${day.toFormat("cccc")} ${shiftName} (Delivery: ${deliveryTime})`
            });
          }
        }
      }
    }

    res.json(availableShifts);
  } catch (err) {
    console.error("Error fetching dynamic shifts:", err);
    res.status(500).json({ error: "Failed to load available shifts" });
  }
};


module.exports = {
 
  getAvailableShifts,
};
