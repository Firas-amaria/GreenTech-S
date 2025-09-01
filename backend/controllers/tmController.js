// controllers/tmController.js
const { admin, db } = require("../firebaseConfig");
const { DateTime } = require("luxon");
const { FieldPath } = require("firebase-admin").firestore;
const { getUpcomingShiftsList } = require("../utils/shiftHelper");

// ------------------------------
// Shift bitmask helpers
// ------------------------------
const SHIFT_BITS = { morning: 8, afternoon: 4, evening: 2, night: 1 };

function buildShiftMask(input) {
  // Accept: "morning" OR ["morning","afternoon"]
  if (!input) return 0;
  const arr = Array.isArray(input) ? input : [input];
  return arr.reduce((mask, name) => {
    const bit = SHIFT_BITS[String(name).toLowerCase()];
    return bit ? mask | bit : mask;
  }, 0);
}

function bitForShift(name) {
  return SHIFT_BITS[String(name).toLowerCase()] || 0;
}

// ------------------------------
// DELIVERERS — core mappers
// ------------------------------
// controllers/tmController.js

function mapDelivererDoc(doc) {
  const d = doc.data() || {};
  const cap = d.capacity || {};

  // normalize typo: reccomendedMiv -> recommendedMix
  const recommendedMix =
    cap.recommendedMix || cap.reccomendedMiv || { Small: 0, Medium: 0, Large: 0 };

  return {
    uid: doc.id,
    status: d.status || "inactive",
    role: d.role || "deliverer",
    firstName: d.firstName || "",
    lastName: d.lastName || "",
    email: d.email || "",
    phone: d.phone || "",
    driverLicenseNumber: d.driverLicenseNumber || "",
    licenseType: d.licenseType || "",

    // capacity (from nested capacity.*)
    gridFit: cap.gridFit || { Small: 0, Medium: 0, Large: 0 },
    recommendedMix,
    weightCap: cap.weightCap || { Small: 0, Medium: 0, Large: 0 },
    cargoVolumeLiters: cap.cargoVolumeLiters ?? d.cargoVolumeLiters ?? null,

    // other specs (top-level on your doc)
    limitKg: d.limitKg ?? null,
    cargoDimensionsCm: d.cargoDimensionsCm || null,
    speedKmH: d.speedKmH ?? null,
    cost: d.cost || null,
    vehicle: d.vehicle || null,
    notes: d.notes ?? null,
    approvedAt: d.approvedAt || null,
    updatedAt: d.updatedAt || null,
  };
}



// ======================================================
// POST /api/tm/deliverers/active-for-shift
// Body: { date: "YYYY-MM-DD", shift: "morning" } OR { date, shifts: ["morning","evening"] }
// Uses: collection("delivererSchedule") { currentMonth, activeSchedule[dayIndex] = bitmask }
// ======================================================
async function getActiveDeliverersForShift(req, res) {
  try {
    const { date, shifts, shift } = req.body || {};
    if (!date || (!shifts && !shift)) {
      return res.status(400).json({
        error: "Missing required fields: date (YYYY-MM-DD), and shift or shifts",
      });
    }

    const shiftMask = buildShiftMask(shifts ?? shift);
    if (shiftMask === 0) {
      return res.status(400).json({ error: "Unknown or empty shift(s)" });
    }

    // Parse date → month/day
    const [Y, M, D] = String(date).split("-").map(Number);
    if (!Y || !M || !D) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }
    const dayIndex = D - 1; // 0-based
    const monthNum = M;

    // Query delivererSchedule for this month
    const schedSnap = await db
      .collection("delivererSchedule")
      .where("currentMonth", "==", monthNum)
      .get();

    const active = [];
    schedSnap.forEach((doc) => {
      const s = { uid: doc.id, ...doc.data() };
      const mask = Array.isArray(s.activeSchedule) ? s.activeSchedule[dayIndex] : 0;
      // Match ANY requested shift
      if ((mask & shiftMask) !== 0) {
        active.push({
          uid: s.uid,
          cargoDimensionsCm: s.cargoDimensionsCm || null,
          limitKg: s.limitKg ?? null,
          speedKmH: s.speedKmH ?? null,
          notes: s.notes ?? null,
          cost: s.cost || null,
          vehicleType: s.vehicleType || null,
          capacity: s.capacity || null,
        });
      }
    });

    return res.json(active);
  } catch (err) {
    console.error("[getActiveDeliverersForShift] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---------- helpers ----------
function bitForShift(name) {
  return SHIFT_BITS[String(name).toLowerCase()] || 0;
}
function chunk(arr, size = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
async function readAcceptedDeliverersByUids(uids) {
  if (!uids || uids.length === 0) return new Map();
  const map = new Map();
  for (const group of chunk(uids, 10)) {
    const snap = await db
      .collection("deliverers")
      .where(FieldPath.documentId(), "in", group)
      .where("status", "==", "active") // accepted
      .get();
    snap.forEach((doc) => {
      const d = doc.data() || {};
      map.set(doc.id, {
        uid: doc.id,
        firstName: d.firstName || "",
        lastName: d.lastName || "",
        email: d.email || "",
        phone: d.phone || "",
        status: d.status || "inactive",
        // capacity (flatten from nested capacity if present)
        gridFit: (d.capacity && d.capacity.gridFit) || d.gridFit || null,
        recommendedMix: (d.capacity && (d.capacity.recommendedMix || d.capacity.reccomendedMiv)) || d.recommendedMix || null,
        weightCap: (d.capacity && d.capacity.weightCap) || d.weightCap || null,
      });
    });
  }
  return map;
}
function dayIndexFromISO(dateStr) {
  const [, , d] = String(dateStr).split("-").map(Number);
  return (d || 1) - 1;
}

// ======================================================
// GET /api/tm/deliverers/active-upcoming?count=6
// Uses getUpcomingShiftsList to build the next N shifts, then resolves who is working.
// standbyCount is hardcoded to 8 for now (you can swap later).
// ======================================================
async function getActiveDeliverersUpcoming(req, res) {
  try {
    const count = Math.max(1, Math.min(30, Number(req.query.count) || 6));
    const upcoming = await getUpcomingShiftsList(db, count); // [{date:'YYYY_MM_DD', shift:'morning'}, ...]
    if (!Array.isArray(upcoming) || upcoming.length === 0) return res.status(200).json([]);

    // group by month for schedule reads
    const byMonth = new Map(); // monthNum -> [{ dateISO, shift, dayIndex }]
    for (const s of upcoming) {
      const [Y, M, D] = String(s.date).split("_").map(Number);
      const dateISO = `${Y}-${String(M).padStart(2,"0")}-${String(D).padStart(2,"0")}`;
      const arr = byMonth.get(M) || [];
      arr.push({ dateISO, shift: s.shift, dayIndex: (D || 1) - 1 });
      byMonth.set(M, arr);
    }

    const results = [];

    // For each month, read delivererSchedule(currentMonth == M) once
    for (const [monthNum, entries] of byMonth.entries()) {
      const schedSnap = await db
        .collection("delivererSchedule")
        .where("currentMonth", "==", monthNum)
        .get();

      // Build a map: uid -> activeSchedule array
      const schedMap = new Map();
      schedSnap.forEach((doc) => {
        const s = doc.data() || {};
        schedMap.set(doc.id, Array.isArray(s.activeSchedule) ? s.activeSchedule : []);
      });

      // Collect working UIDs per shift entry
      for (const { dateISO, shift, dayIndex } of entries) {
        const bit = bitForShift(shift);
        const workingUids = [];
        schedMap.forEach((arr, uid) => {
          const mask = arr[dayIndex] || 0;
          if (bit && (mask & bit) !== 0) workingUids.push(uid);
        });

        // Join to accepted deliverers to get contact info and ensure only status=active
        const delivMap = await readAcceptedDeliverersByUids(workingUids);
        const deliverers = Array.from(delivMap.values());

        results.push({
          date: dateISO,
          shift,
          activeCount: deliverers.length,
          standbyCount: 8,           // <— fixed for now
          deliverers,                // [{uid, firstName, lastName, email, phone, ...}]
        });
      }
    }

    // Keep the same order as upcoming
    results.sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));
    return res.status(200).json(results);
  } catch (e) {
    console.error("[getActiveDeliverersUpcoming] error:", e);
    return res.status(500).json({ error: "Failed to compute upcoming active deliverers." });
  }
}

// ======================================================
// POST /api/tm/deliverers/active-for-shifts
// Body: { queries: [{ date:"YYYY-MM-DD", shift:"morning" } | { date, shifts:["morning","evening"] }, ...] }
// Returns an array with the same schema as active-upcoming entries.
// ======================================================
async function getActiveDeliverersForShifts(req, res) {
  try {
    const { queries } = req.body || {};
    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "Body.queries must be a non-empty array." });
    }

    // Normalize into flat list of {date, shift}
    const flat = [];
    for (const q of queries) {
      if (!q || !q.date || (!q.shift && !q.shifts)) {
        return res.status(400).json({ error: "Each query needs date and shift or shifts." });
      }
      const dateISO = String(q.date);
      const shifts = Array.isArray(q.shifts) ? q.shifts : [q.shift];
      for (const s of shifts) flat.push({ date: dateISO, shift: String(s) });
    }

    // Group by month
    const byMonth = new Map(); // monthNum -> [{dateISO, shift, dayIndex}]
    for (const item of flat) {
      const [Y, M, D] = item.date.split("-").map(Number);
      if (!Y || !M || !D) return res.status(400).json({ error: "Use YYYY-MM-DD dates." });
      const arr = byMonth.get(M) || [];
      arr.push({ dateISO: item.date, shift: item.shift, dayIndex: D - 1 });
      byMonth.set(M, arr);
    }

    const results = [];

    for (const [monthNum, entries] of byMonth.entries()) {
      const schedSnap = await db
        .collection("delivererSchedule")
        .where("currentMonth", "==", monthNum)
        .get();

      const schedMap = new Map();
      schedSnap.forEach((doc) => {
        const s = doc.data() || {};
        schedMap.set(doc.id, Array.isArray(s.activeSchedule) ? s.activeSchedule : []);
      });

      for (const { dateISO, shift, dayIndex } of entries) {
        const bit = bitForShift(shift);
        const workingUids = [];
        schedMap.forEach((arr, uid) => {
          const mask = arr[dayIndex] || 0;
          if (bit && (mask & bit) !== 0) workingUids.push(uid);
        });

        const delivMap = await readAcceptedDeliverersByUids(workingUids);
        const deliverers = Array.from(delivMap.values());

        results.push({
          date: dateISO,
          shift,
          activeCount: deliverers.length,
          standbyCount: 8,
          deliverers,
        });
      }
    }

    results.sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));
    return res.status(200).json(results);
  } catch (e) {
    console.error("[getActiveDeliverersForShifts] error:", e);
    return res.status(500).json({ error: "Failed to compute active deliverers for shifts." });
  }
}

// ======================================================
// GET /api/tm/deliverers
// Only return deliverers whose status = "active" (i.e., accepted into the job)
// ======================================================
async function getAllDeliverers(req, res) {
  try {
    const snap = await db
      .collection("deliverers")
      .where("status", "==", "active") // accepted deliverers only
      .get();

    if (snap.empty) {
      return res.status(200).json([]); // none accepted yet
    }

    const list = snap.docs.map(mapDelivererDoc);
    return res.status(200).json(list);
  } catch (e) {
    console.error("[getAllDeliverers] error:", e);
    return res.status(500).json({ error: "Failed to fetch deliverers." });
  }
}



// ======================================================
// GET /api/tm/deliverers/active
// ======================================================
async function getActiveDeliverers(req, res) {
  try {
    const snap = await db.collection("deliverers").where("status", "==", "active").get();
    const list = snap.docs.map(mapDelivererDoc);
    return res.status(200).json(list);
  } catch (e) {
    console.error("[getActiveDeliverers] error:", e);
    return res.status(500).json({ error: "Failed to fetch active deliverers." });
  }
}

// ======================================================
// GET /api/tm/deliverers/active-per-shift
// Returns upcoming shifts with counts: [{ date:"YYYY-MM-DD", shift, active, standby }]
// active: number of deliverers whose schedule bit includes <shift>
// standby: number of deliverers with status=="standby" AND schedule includes <shift>
// ======================================================
async function getActivePerShiftDeliverers(req, res) {
  try {
    const upcoming = await getUpcomingShiftsList(db, 6); // [{date:'YYYY_MM_DD', shift:'morning'}, ...]
    if (!Array.isArray(upcoming) || upcoming.length === 0) {
      return res.status(200).json([]);
    }

    // Collect months we need to query once per month
    const monthsNeeded = new Set();
    for (const s of upcoming) {
      // s.date likes "YYYY_MM_DD"
      const [y, m] = String(s.date).split("_").map(Number);
      if (m) monthsNeeded.add(m);
    }

    // Load schedules by month
    const monthToSchedules = new Map(); // monthNumber -> Map(uid -> scheduleDocData)
    for (const m of monthsNeeded) {
      const snap = await db.collection("delivererSchedule").where("currentMonth", "==", m).get();
      const map = new Map();
      snap.forEach((doc) => map.set(doc.id, { uid: doc.id, ...doc.data() }));
      monthToSchedules.set(m, map);
    }

    // Load standby deliverers once (uids)
    const standbySnap = await db.collection("deliverers").where("status", "==", "standby").get();
    const standbyUids = new Set(standbySnap.docs.map((d) => d.id));

    // For each upcoming shift, count active/standby using schedules
    const out = [];
    for (const s of upcoming) {
      const [Y, M, D] = String(s.date).split("_").map(Number);
      const dayIndex = (D || 1) - 1;
      const bit = bitForShift(s.shift);
      let active = 0;
      let standby = 0;

      const monthMap = monthToSchedules.get(M) || new Map();
      monthMap.forEach((sched) => {
        const mask = Array.isArray(sched.activeSchedule) ? (sched.activeSchedule[dayIndex] || 0) : 0;
        if (bit && (mask & bit) !== 0) {
          active++;
          if (standbyUids.has(sched.uid)) standby++;
        }
      });

      out.push({
        date: String(s.date).replace(/_/g, "-"),
        shift: s.shift,
        active,
        standby,
      });
    }

    return res.status(200).json(out);
  } catch (e) {
    console.error("[getActivePerShiftDeliverers] error:", e);
    return res.status(500).json({ error: "Failed to compute active-per-shift." });
  }
}

// ======================================================
// GET /api/tm/deliverers/:uid
// ======================================================
async function getDelivererById(req, res) {
  try {
    const { uid } = req.params;
    const ref = db.collection("deliverers").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Deliverer not found." });
    return res.status(200).json(mapDelivererDoc(snap));
  } catch (e) {
    console.error("[getDelivererById] error:", e);
    return res.status(500).json({ error: "Failed to fetch deliverer." });
  }
}

// ======================================================
// PUT /api/tm/deliverers/:uid
// ======================================================
async function updateDeliverer(req, res) {
  try {
    const { uid } = req.params;
    const payload = req.body || {};
    payload.updatedAt = new Date();

    await db.collection("deliverers").doc(uid).set(payload, { merge: true });
    const snap = await db.collection("deliverers").doc(uid).get();
    return res.status(200).json(mapDelivererDoc(snap));
  } catch (e) {
    console.error("[updateDeliverer] error:", e);
    return res.status(500).json({ error: "Failed to update deliverer." });
  }
}

// ======================================================
// GET /api/tm/deliverers/:uid/capacity
// Source of truth: delivererSchedule/{uid}
// Returns read-only capacity fields calculated by the system.
// Primary source: deliverers/{uid}.capacity{ cargoVolumeLiters, gridFit, reccomendedMiv/recommendedMix, weightCap }
// Also surfaces limitKg and cargoDimensionsCm if present on deliverers/{uid} (top-level).
// Fallback: delivererSchedule/{uid} with same normalization.
async function getDelivererCapacity(req, res) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "Missing uid parameter." });

    // ---- 1) deliverers/{uid} (preferred) ----
    const delRef = db.collection("deliverers").doc(uid);
    const delSnap = await delRef.get();

    if (delSnap.exists) {
      const d = delSnap.data() || {};
      const cap = d.capacity || {};

      // normalize typo: reccomendedMiv -> recommendedMix
      const recommendedMix = cap.recommendedMix || cap.reccomendedMiv || { Small: 0, Medium: 0, Large: 0 };

      return res.status(200).json({
        uid,
        cargoVolumeLiters: cap.cargoVolumeLiters ?? null,
        gridFit: cap.gridFit || { Small: 0, Medium: 0, Large: 0 },
        recommendedMix,
        weightCap: cap.weightCap || { Small: 0, Medium: 0, Large: 0 },

        // these appear outside capacity in your example — include if present:
        cargoDimensionsCm: d.cargoDimensionsCm || null,
        limitKg: d.limitKg ?? null,
      });
    }

    // ---- 2) Fallback: delivererSchedule/{uid} ----
    let schedSnap = await db.collection("delivererSchedule").doc(uid).get();
    if (!schedSnap.exists) {
      const q = await db.collection("delivererSchedule").where("uid", "==", uid).limit(1).get();
      if (!q.empty) schedSnap = q.docs[0];
    }

    if (schedSnap.exists) {
      const s = schedSnap.data() || {};
      const cap = s.capacity || {};

      const recommendedMix = cap.recommendedMix || cap.reccomendedMiv || s.recommendedMix || { Small: 0, Medium: 0, Large: 0 };

      return res.status(200).json({
        uid,
        cargoVolumeLiters: cap.cargoVolumeLiters ?? s.cargoVolumeLiters ?? null,
        gridFit: cap.gridFit || s.gridFit || { Small: 0, Medium: 0, Large: 0 },
        recommendedMix,
        weightCap: cap.weightCap || s.weightCap || { Small: 0, Medium: 0, Large: 0 },
        cargoDimensionsCm: s.cargoDimensionsCm || null,
        limitKg: s.limitKg ?? null,
      });
    }

    // ---- 3) Nothing found ----
    return res.status(404).json({ error: "Capacity not found for this deliverer." });
  } catch (e) {
    console.error("[getDelivererCapacity] error:", e);
    return res.status(500).json({ error: "Failed to load deliverer capacity." });
  }
}


// =====================================================================
// INDUSTRIAL DRIVERS — stubs (safe responses until DB is created)
// =====================================================================

// GET /api/tm/industrial-drivers
async function getAllIndustrialDrivers(req, res) {
  try {
    return res.status(200).json([]); // empty list for now
  } catch (e) {
    console.error("[getAllIndustrialDrivers] error:", e);
    return res.status(500).json({ error: "Failed to fetch industrial drivers." });
  }
}

// GET /api/tm/industrial-drivers/active
async function getActiveIndustrialDrivers(req, res) {
  try {
    return res.status(200).json([]); // none active yet
  } catch (e) {
    console.error("[getActiveIndustrialDrivers] error:", e);
    return res.status(500).json({ error: "Failed to fetch active industrial drivers." });
  }
}

// GET /api/tm/industrial-drivers/active-per-shift
async function getActivePerShiftIndustrialDrivers(req, res) {
  try {
    const upcoming = await getUpcomingShiftsList(db, 6);
    const out = (upcoming || []).map((s) => ({
      date: String(s.date).replace(/_/g, "-"),
      shift: s.shift,
      active: 0,
      standby: 0,
    }));
    return res.status(200).json(out);
  } catch (e) {
    console.error("[getActivePerShiftIndustrialDrivers] error:", e);
    return res.status(500).json({ error: "Failed to compute active-per-shift for industrial drivers." });
  }
}

// GET /api/tm/industrial-drivers/:id
async function getIndustrialDriverById(req, res) {
  try {
    return res.status(404).json({ error: "Industrial driver not found (DB not created yet)." });
  } catch (e) {
    console.error("[getIndustrialDriverById] error:", e);
    return res.status(500).json({ error: "Failed to fetch industrial driver." });
  }
}

// PUT /api/tm/industrial-drivers/:id
async function updateIndustrialDriver(req, res) {
  try {
    return res.status(501).json({ error: "Updating industrial drivers is not implemented yet." });
  } catch (e) {
    console.error("[updateIndustrialDriver] error:", e);
    return res.status(500).json({ error: "Failed to update industrial driver." });
  }
}

// ------------------------------
// Exports
// ------------------------------
module.exports = {
  // Deliverers
  getActiveDeliverersForShift,
  getAllDeliverers,
  getActiveDeliverers,
  getActivePerShiftDeliverers,
  getDelivererById,
  updateDeliverer,
  getDelivererCapacity,
  getActiveDeliverersForShifts,
  getActiveDeliverersUpcoming,

  // Industrial (stubs)
  getAllIndustrialDrivers,
  getActiveIndustrialDrivers,
  getActivePerShiftIndustrialDrivers,
  getIndustrialDriverById,
  updateIndustrialDriver,
};
