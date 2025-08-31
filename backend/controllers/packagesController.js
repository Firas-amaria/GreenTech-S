
//DELETE AFTER MAKING SURE SEED DONE PROPERLY

// controllers/packagesController.js
const { admin, db } = require("../firebaseConfig");

function computeUsableLiters({ l, w, h }, headroomPct = 0.15) {
  const liters = (l * w * h) / 1000;
  return Number((liters * (1 - headroomPct)).toFixed(2));
}

// POST/PUT /api/admin/packages/:id
async function upsertPackageById(req, res) {
  try {
    const { id } = req.params; // e.g. "Small"
    const {
      innerDimsCm,
      headroomPct = 0.15,
      maxWeightKg,
      mixingAllowed = true,
      maxSkusPerBox = 2,
      vented = false,
      tareWeightKg = 0.25,
    } = req.body || {};

    if (!id) return res.status(400).json({ error: "Missing id param." });
    if (!innerDimsCm || [innerDimsCm.l, innerDimsCm.w, innerDimsCm.h].some(v => typeof v !== "number")) {
      return res.status(400).json({ error: "innerDimsCm {l,w,h} (numbers) required." });
    }
    if (typeof maxWeightKg !== "number") {
      return res.status(400).json({ error: "maxWeightKg (number) required." });
    }

    const usableLiters = computeUsableLiters(innerDimsCm, headroomPct);

    await db.collection("packages").doc(id).set({
      key: id,
      innerDimsCm,
      headroomPct,
      usableLiters,
      maxWeightKg,
      mixingAllowed,
      maxSkusPerBox,
      vented,
      tareWeightKg,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ ok: true, id, usableLiters });
  } catch (err) {
    console.error("upsertPackageById error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/packages/seed
async function seedDefaultPackages(_req, res) {
  try {
    const defs = [
      { id: "Small",  innerDimsCm: { l:20, w:20, h:20 }, headroomPct:0.15, maxWeightKg:6,  mixingAllowed:true, maxSkusPerBox:2, vented:false, tareWeightKg:0.25 },
      { id: "Medium", innerDimsCm: { l:30, w:30, h:30 }, headroomPct:0.15, maxWeightKg:12, mixingAllowed:true, maxSkusPerBox:2, vented:false, tareWeightKg:0.35 },
      { id: "Large",  innerDimsCm: { l:60, w:60, h:60 }, headroomPct:0.15, maxWeightKg:25, mixingAllowed:true, maxSkusPerBox:3, vented:false, tareWeightKg:0.70 },
    ];
    const batch = db.batch();
    defs.forEach(d => {
      const ref = db.collection("packages").doc(d.id);
      const usableLiters = computeUsableLiters(d.innerDimsCm, d.headroomPct);
      batch.set(ref, {
        key: d.id,
        innerDimsCm: d.innerDimsCm,
        headroomPct: d.headroomPct,
        usableLiters,
        maxWeightKg: d.maxWeightKg,
        mixingAllowed: d.mixingAllowed,
        maxSkusPerBox: d.maxSkusPerBox,
        vented: d.vented,
        tareWeightKg: d.tareWeightKg,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    res.json({ ok: true, seeded: defs.map(d => d.id) });
  } catch (err) {
    console.error("seedDefaultPackages error:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/packages
async function listPackages(_req, res) {
  try {
    const snap = await db.collection("packages").orderBy("usableLiters", "asc").get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(data);
  } catch (err) {
    console.error("listPackages error:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { upsertPackageById, seedDefaultPackages, listPackages };
