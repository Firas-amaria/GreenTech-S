// controllers/tmPackagesController.js
// Transportation Manager: schema-driven Packages & Containers
// Firestore layout (TOP-LEVEL collections; no slashes in names):
//   tm_config_packageFields/{fieldId}   -> { label, type, defaultValue, createdAt, updatedAt }
//   packages/{packageId}                -> { name, values: { [fieldId]: any }, createdAt, updatedAt, derived? }
//   tm_config_containerFields/{fieldId} -> { label, type, defaultValue, createdAt, updatedAt }
//   containers/{containerId}            -> { name, values: { [fieldId]: any }, createdAt, updatedAt }

const { admin, db } = require("../firebaseConfig");
const { FieldPath } = require("firebase-admin").firestore;

const TS = admin.firestore.FieldValue.serverTimestamp;

const COLLECTIONS = {
  pkgFields: "tm_config_packageFields",
  ctrFields: "tm_config_containerFields",
  packages:  "packages",
  containers:"containers",
};

// ---------- helpers ----------
const coerce = (val, type) => {
  if (type === "number") {
    if (val === "" || val === null || val === undefined) return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return String(val ?? "");
};

const toSafeBool = (v) => v === true || v === "true";

// usable liters if we have L/W/H (cm) + optional headroomPct
function computeUsableLitersFromValues(valuesById, fields, headroomDefault = 0.15) {
  const byLabel = new Map(fields.map(f => [f.label.toLowerCase(), f]));
  const L  = byLabel.get("length (cm)");
  const W  = byLabel.get("width (cm)");
  const H  = byLabel.get("height (cm)");
  const HP = byLabel.get("headroompct"); // "HeadroomPct" label, lowercase map

  if (!L || !W || !H) return null;

  const l = Number(valuesById[L.id]);
  const w = Number(valuesById[W.id]);
  const h = Number(valuesById[H.id]);
  const headroomPct =
    HP && typeof valuesById[HP.id] === "number"
      ? valuesById[HP.id]
      : headroomDefault;

  if (![l, w, h].every(Number.isFinite)) return null;
  const liters = (l * w * h) / 1000;
  return Number((liters * (1 - headroomPct)).toFixed(2));
}

// Load all fields from a config collection
async function getAllFields(colName) {
  const snap = await db.collection(colName).orderBy("createdAt", "asc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Ensure schema collections exist by seeding defaults if empty.
// (Adding the first doc "creates" the collection.)
async function ensurePackageSchemaExists() {
  const col = db.collection(COLLECTIONS.pkgFields);
  const has = await col.limit(1).get();
  if (!has.empty) return;

  const defaults = [
    { label: "Length (cm)", type: "number", defaultValue: 40 },
    { label: "Width (cm)",  type: "number", defaultValue: 30 },
    { label: "Height (cm)", type: "number", defaultValue: 25 },
    { label: "HeadroomPct", type: "number", defaultValue: 0.15 },
    { label: "Max Kg",      type: "number", defaultValue: 20 },
  ];
  const batch = db.batch();
  defaults.forEach(f => {
    const ref = col.doc();
    batch.set(ref, { ...f, createdAt: TS(), updatedAt: TS() });
  });
  await batch.commit();
}

async function ensureContainerSchemaExists() {
  const col = db.collection(COLLECTIONS.ctrFields);
  const has = await col.limit(1).get();
  if (!has.empty) return;

  const defaults = [
    { label: "Material",    type: "text",   defaultValue: "Plastic" },
    { label: "Capacity Kg", type: "number", defaultValue: 25 },
    { label: "Notes",       type: "text",   defaultValue: "" },
  ];
  const batch = db.batch();
  defaults.forEach(f => {
    const ref = col.doc();
    batch.set(ref, { ...f, createdAt: TS(), updatedAt: TS() });
  });
  await batch.commit();
}

// Ensure every doc in a collection has values for each field (fill defaults)
// Also remove values for fields that no longer exist
async function alignDocsWithFields({
  targetCol, fields, dryRun = false, batchLimit = 400
}) {
  const fieldIds = new Set(fields.map(f => f.id));

  let updatedCount = 0;
  let cursor = null;
  while (true) {
    let q = db.collection(targetCol)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(batchLimit);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => {
      const data = doc.data() || {};
      const values = data.values || {};
      let changed = false;

      // add missing + coerce type
      fields.forEach(f => {
        if (!(f.id in values)) {
          values[f.id] = f.defaultValue ?? null;
          changed = true;
        } else {
          const coerced = coerce(values[f.id], f.type);
          if (coerced !== values[f.id]) {
            values[f.id] = coerced;
            changed = true;
          }
        }
      });

      // drop removed
      Object.keys(values).forEach(fid => {
        if (!fieldIds.has(fid)) {
          delete values[fid];
          changed = true;
        }
      });

      if (changed && !dryRun) {
        batch.set(doc.ref, { values, updatedAt: TS() }, { merge: true });
        updatedCount++;
      }
    });

    if (!dryRun) await batch.commit();
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < batchLimit) break;
  }
  return { updated: updatedCount };
}

// Propagate a single field add/remove/change to all docs in a collection
async function propagateFieldToDocs({
  targetCol, op, field, newType, setMissingDefaultOnly = true, batchLimit = 400
}) {
  let processed = 0;
  let cursor = null;
  while (true) {
    let q = db.collection(targetCol)
      .orderBy(FieldPath.documentId())
      .limit(batchLimit);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => {
      const data = doc.data() || {};
      const values = data.values || {};
      let changed = false;

      if (op === "add") {
        if (!(field.id in values) || !setMissingDefaultOnly) {
          values[field.id] = field.defaultValue ?? null;
          changed = true;
        }
      }
      if (op === "remove") {
        if (field.id in values) {
          delete values[field.id];
          changed = true;
        }
      }
      if (op === "type") {
        const current = values[field.id];
        const coerced = coerce(current, newType);
        if (coerced !== current) {
          values[field.id] = coerced;
          changed = true;
        }
      }
      if (changed) {
        batch.set(doc.ref, { values, updatedAt: TS() }, { merge: true });
        processed++;
      }
    });

    await batch.commit();
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < batchLimit) break;
  }
  return { processed };
}

// ---------- PACKAGE SCHEMA ----------
async function getPackageSchema(_req, res) {
  try {
    await ensurePackageSchemaExists(); // auto-create (seed) if empty
    const fields = await getAllFields(COLLECTIONS.pkgFields);
    res.json(fields);
  } catch (err) {
    console.error("getPackageSchema Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function addPackageField(req, res) {
  try {
    await ensurePackageSchemaExists();
    const { label, type = "text", defaultValue = null } = req.body || {};
    if (!label) return res.status(400).json({ error: "label required" });
    if (!["text", "number"].includes(type)) {
      return res.status(400).json({ error: "type must be 'text' or 'number'" });
    }

    const existing = await getAllFields(COLLECTIONS.pkgFields);
    if (existing.some(f => f.label.toLowerCase() === String(label).toLowerCase())) {
      return res.status(409).json({ error: "A field with this label already exists" });
    }

    const ref = db.collection(COLLECTIONS.pkgFields).doc();
    const field = {
      label: String(label),
      type,
      defaultValue: coerce(defaultValue, type),
      createdAt: TS(),
      updatedAt: TS(),
    };
    await ref.set(field);

    const stat = await propagateFieldToDocs({
      targetCol: COLLECTIONS.packages,
      op: "add",
      field: { id: ref.id, ...field },
      setMissingDefaultOnly: true
    });

    res.json({ ok: true, id: ref.id, field, propagated: stat.processed });
  } catch (err) {
    console.error("addPackageField Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function updatePackageField(req, res) {
  try {
    await ensurePackageSchemaExists();
    const { fieldId } = req.params;
    const { label, type, defaultValue, propagateDefault = false } = req.body || {};
    const docRef = db.collection(COLLECTIONS.pkgFields).doc(fieldId);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: "field not found" });

    const current = snap.data();
    const update = { updatedAt: TS() };
    let propagateTypeChange = false;

    if (typeof label === "string" && label.trim()) {
      const all = await getAllFields(COLLECTIONS.pkgFields);
      if (all.some(f => f.id !== fieldId && f.label.toLowerCase() === label.toLowerCase())) {
        return res.status(409).json({ error: "Another field already has this label" });
      }
      update.label = label.trim();
    }

    if (type && ["text", "number"].includes(type) && type !== current.type) {
      update.type = type;
      propagateTypeChange = true;
      update.defaultValue = coerce(
        defaultValue !== undefined ? defaultValue : current.defaultValue,
        type
      );
    } else if (defaultValue !== undefined) {
      update.defaultValue = coerce(defaultValue, current.type);
    }

    await docRef.set(update, { merge: true });

    let propagated = { processed: 0 };
    if (propagateTypeChange) {
      propagated = await propagateFieldToDocs({
        targetCol: COLLECTIONS.packages,
        op: "type",
        field: { id: fieldId },
        newType: update.type
      });
    } else if (propagateDefault && update.defaultValue !== undefined) {
      propagated = await propagateFieldToDocs({
        targetCol: COLLECTIONS.packages,
        op: "add",
        field: { id: fieldId, defaultValue: update.defaultValue },
        setMissingDefaultOnly: true
      });
    }

    res.json({ ok: true, updated: update, propagated: propagated.processed });
  } catch (err) {
    console.error("updatePackageField Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function deletePackageField(req, res) {
  try {
    const { fieldId } = req.params;
    await db.collection(COLLECTIONS.pkgFields).doc(fieldId).delete();

    const stat = await propagateFieldToDocs({
      targetCol: COLLECTIONS.packages,
      op: "remove",
      field: { id: fieldId }
    });
    res.json({ ok: true, removedFrom: stat.processed });
  } catch (err) {
    console.error("deletePackageField Error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ---------- PACKAGES ----------
async function listTmPackages(req, res) {
  try {
    await ensurePackageSchemaExists();
    const fields = await getAllFields(COLLECTIONS.pkgFields);
    console.log("[TM] listTmPackages() with", fields.length, "fields");
    const align = toSafeBool(req.query.align);
    if (align) {
      await alignDocsWithFields({
        targetCol: COLLECTIONS.packages,
        fields,
        dryRun: false
      });
    }

    const snap = await db.collection(COLLECTIONS.packages).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("[TM] listTmPackages() got", data.length, "packages");
    const withDerived = data.map(p => {
      const usableLiters = computeUsableLitersFromValues(p.values || {}, fields);
      return usableLiters == null ? p : { ...p, derived: { ...(p.derived || {}), usableLiters } };
    });

    res.json(withDerived);
  } catch (err) {
    console.error("listTmPackages Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function createTmPackage(req, res) {
  try {
    await ensurePackageSchemaExists();
    const { name, values = {} } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "name required" });

    const fields = await getAllFields(COLLECTIONS.pkgFields);
    const mapValues = {};
    fields.forEach(f => (mapValues[f.id] = coerce(values[f.id] ?? f.defaultValue ?? null, f.type)));

    const ref = db.collection(COLLECTIONS.packages).doc();

    const doc = {
      name: String(name).trim(),
      values: mapValues,
      createdAt: TS(),
      updatedAt: TS(),
    };

    const usableLiters = computeUsableLitersFromValues(doc.values, fields);
    if (usableLiters != null) {
      doc.derived = { usableLiters };
    }

    await ref.set(doc);
    res.json({ ok: true, id: ref.id, ...doc });
  } catch (err) {
    console.error("createTmPackage Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function upsertTmPackageById(req, res) {
  try {
    await ensurePackageSchemaExists();
    const { id } = req.params;
    const { name, values = {} } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing :id" });

    const fields = await getAllFields(COLLECTIONS.pkgFields);
    const ref = db.collection(COLLECTIONS.packages).doc(id);
    const snap = await ref.get();

    const existing = snap.exists ? (snap.data().values || {}) : {};
    const merged = { ...existing };
    fields.forEach(f => {
      if (Object.prototype.hasOwnProperty.call(values, f.id)) {
        merged[f.id] = coerce(values[f.id], f.type);
      } else if (!(f.id in merged)) {
        merged[f.id] = f.defaultValue ?? null;
      }
    });

    const update = {
      values: merged,
      updatedAt: TS(),
    };
    if (typeof name === "string" && name.trim()) update.name = name.trim();

    const usableLiters = computeUsableLitersFromValues(merged, fields);
    if (usableLiters != null) {
      update.derived = { usableLiters };
    }

    await ref.set(
      snap.exists
        ? update
        : { createdAt: TS(), ...update },
      { merge: true }
    );

    res.json({ ok: true, id, updated: update });
  } catch (err) {
    console.error("upsertTmPackageById Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteTmPackage(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "missing :id" });
    await db.collection(COLLECTIONS.packages).doc(id).delete();
    res.json({ ok: true, deleted: id });
  } catch (err) {
    console.error("deleteTmPackage Error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ---------- CONTAINER SCHEMA ----------
async function getContainerSchema(_req, res) {
  try {
    await ensureContainerSchemaExists(); // auto-create if empty
    const fields = await getAllFields(COLLECTIONS.ctrFields);
    res.json(fields);
  } catch (err) {
    console.error("getContainerSchema Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function addContainerField(req, res) {
  try {
    await ensureContainerSchemaExists();
    const { label, type = "text", defaultValue = null } = req.body || {};
    if (!label) return res.status(400).json({ error: "label required" });
    if (!["text", "number"].includes(type)) {
      return res.status(400).json({ error: "type must be 'text' or 'number'" });
    }

    const existing = await getAllFields(COLLECTIONS.ctrFields);
    if (existing.some(f => f.label.toLowerCase() === String(label).toLowerCase())) {
      return res.status(409).json({ error: "A field with this label already exists" });
    }

    const ref = db.collection(COLLECTIONS.ctrFields).doc();
    const field = {
      label: String(label),
      type,
      defaultValue: coerce(defaultValue, type),
      createdAt: TS(),
      updatedAt: TS(),
    };
    await ref.set(field);

    const stat = await propagateFieldToDocs({
      targetCol: COLLECTIONS.containers,
      op: "add",
      field: { id: ref.id, ...field },
      setMissingDefaultOnly: true
    });

    res.json({ ok: true, id: ref.id, field, propagated: stat.processed });
  } catch (err) {
    console.error("addContainerField Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function updateContainerField(req, res) {
  try {
    await ensureContainerSchemaExists();
    const { fieldId } = req.params;
    const { label, type, defaultValue, propagateDefault = false } = req.body || {};
    const docRef = db.collection(COLLECTIONS.ctrFields).doc(fieldId);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: "field not found" });

    const current = snap.data();
    const update = { updatedAt: TS() };
    let propagateTypeChange = false;

    if (typeof label === "string" && label.trim()) {
      const all = await getAllFields(COLLECTIONS.ctrFields);
      if (all.some(f => f.id !== fieldId && f.label.toLowerCase() === label.toLowerCase())) {
        return res.status(409).json({ error: "Another field already has this label" });
      }
      update.label = label.trim();
    }

    if (type && ["text", "number"].includes(type) && type !== current.type) {
      update.type = type;
      propagateTypeChange = true;
      update.defaultValue = coerce(
        defaultValue !== undefined ? defaultValue : current.defaultValue,
        type
      );
    } else if (defaultValue !== undefined) {
      update.defaultValue = coerce(defaultValue, current.type);
    }

    await docRef.set(update, { merge: true });

    let propagated = { processed: 0 };
    if (propagateTypeChange) {
      propagated = await propagateFieldToDocs({
        targetCol: COLLECTIONS.containers,
        op: "type",
        field: { id: fieldId },
        newType: update.type
      });
    } else if (propagateDefault && update.defaultValue !== undefined) {
      propagated = await propagateFieldToDocs({
        targetCol: COLLECTIONS.containers,
        op: "add",
        field: { id: fieldId, defaultValue: update.defaultValue },
        setMissingDefaultOnly: true
      });
    }

    res.json({ ok: true, updated: update, propagated: propagated.processed });
  } catch (err) {
    console.error("updateContainerField Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteContainerField(req, res) {
  try {
    const { fieldId } = req.params;
    await db.collection(COLLECTIONS.ctrFields).doc(fieldId).delete();

    const stat = await propagateFieldToDocs({
      targetCol: COLLECTIONS.containers,
      op: "remove",
      field: { id: fieldId }
    });
    res.json({ ok: true, removedFrom: stat.processed });
  } catch (err) {
    console.error("deleteContainerField Error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ---------- CONTAINERS ----------
async function listContainers(req, res) {
  try {
    await ensureContainerSchemaExists();
    const fields = await getAllFields(COLLECTIONS.ctrFields);

    const align = toSafeBool(req.query.align);
    if (align) {
      await alignDocsWithFields({
        targetCol: COLLECTIONS.containers,
        fields,
        dryRun: false
      });
    }

    const snap = await db.collection(COLLECTIONS.containers).orderBy("name", "asc").get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(data);
  } catch (err) {
    console.error("listContainers Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function createContainer(req, res) {
  try {
    await ensureContainerSchemaExists();
    const { name, values = {} } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "name required" });

    const fields = await getAllFields(COLLECTIONS.ctrFields);
    const mapValues = {};
    fields.forEach(f => (mapValues[f.id] = coerce(values[f.id] ?? f.defaultValue ?? null, f.type)));

    const ref = db.collection(COLLECTIONS.containers).doc();

    const doc = {
      name: String(name).trim(),
      values: mapValues,
      createdAt: TS(),
      updatedAt: TS(),
    };
    await ref.set(doc);
    res.json({ ok: true, id: ref.id, ...doc });
  } catch (err) {
    console.error("createContainer Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function upsertContainerById(req, res) {
  try {
    const { id } = req.params;
    const { name, values = {} } = req.body || {};
    if (!id) return res.status(400).json({ error: "missing :id" });

    await ensureContainerSchemaExists();
    const fields = await getAllFields(COLLECTIONS.ctrFields);
    const ref = db.collection(COLLECTIONS.containers).doc(id);
    const snap = await ref.get();

    const existing = snap.exists ? (snap.data().values || {}) : {};
    const merged = { ...existing };
    fields.forEach(f => {
      if (Object.prototype.hasOwnProperty.call(values, f.id)) {
        merged[f.id] = coerce(values[f.id], f.type);
      } else if (!(f.id in merged)) {
        merged[f.id] = f.defaultValue ?? null;
      }
    });

    const update = {
      values: merged,
      updatedAt: TS(),
    };
    if (typeof name === "string" && name.trim()) update.name = name.trim();

    await ref.set(
      snap.exists
        ? update
        : { createdAt: TS(), ...update },
      { merge: true }
    );

    res.json({ ok: true, id, updated: update });
  } catch (err) {
    console.error("upsertContainerById Error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteContainer(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "missing :id" });

    await db.collection(COLLECTIONS.containers).doc(id).delete();
    res.json({ ok: true, deleted: id });
  } catch (err) {
    console.error("deleteContainer Error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ---------- SEEDERS (optional manual route) ----------
async function seedTmDefaults(_req, res) {
  try {
    // Seed schema collections if empty
    await ensurePackageSchemaExists();
    await ensureContainerSchemaExists();

    // Align existing docs
    const fieldsNow  = await getAllFields(COLLECTIONS.pkgFields);
    const cFieldsNow = await getAllFields(COLLECTIONS.ctrFields);

    await alignDocsWithFields({ targetCol: COLLECTIONS.packages,  fields: fieldsNow });
    await alignDocsWithFields({ targetCol: COLLECTIONS.containers, fields: cFieldsNow });

    // Create three default packages if none
    const havePkgs = await db.collection(COLLECTIONS.packages).limit(1).get();
    if (havePkgs.empty) {
      const defNames = ["Small", "Medium", "Large"];
      const sizes = [
        { len: 30, wid: 20, hei: 20, max: 12 },
        { len: 40, wid: 30, hei: 25, max: 20 },
        { len: 50, wid: 40, hei: 35, max: 28 },
      ];
      const mapByLabel = new Map(fieldsNow.map(f => [f.label, f]));
      for (let i = 0; i < defNames.length; i++) {
        const name = defNames[i];
        const s = sizes[i];
        const values = {};
        values[mapByLabel.get("Length (cm)").id]  = s.len;
        values[mapByLabel.get("Width (cm)").id]   = s.wid;
        values[mapByLabel.get("Height (cm)").id]  = s.hei;
        values[mapByLabel.get("HeadroomPct").id]  = 0.15;
        values[mapByLabel.get("Max Kg").id]       = s.max;

        const usableLiters = computeUsableLitersFromValues(values, fieldsNow);

        await db.collection(COLLECTIONS.packages).doc().set({
          name, values, createdAt: TS(), updatedAt: TS(),
          ...(usableLiters != null ? { derived: { usableLiters } } : {}),
        });
      }
    }

    // Create one default container if none
    const haveCtrs = await db.collection(COLLECTIONS.containers).limit(1).get();
    if (haveCtrs.empty) {
      const cMap = new Map(cFieldsNow.map(f => [f.label, f]));
      await db.collection(COLLECTIONS.containers).doc().set({
        name: "Plastic Crate",
        values: {
          [cMap.get("Material").id]: "Plastic",
          [cMap.get("Capacity Kg").id]: 25,
          [cMap.get("Notes").id]: "",
        },
        createdAt: TS(),
        updatedAt: TS()
      });
    }

    res.json({ ok: true, seeded: true });
  } catch (err) {
    console.error("seedTmDefaults Error:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  // package schema
  getPackageSchema,
  addPackageField,
  updatePackageField,
  deletePackageField,

  // packages
  listTmPackages,
  createTmPackage,
  upsertTmPackageById,
  deleteTmPackage,

  // container schema
  getContainerSchema,
  addContainerField,
  updateContainerField,
  deleteContainerField,

  // containers
  listContainers,
  createContainer,
  upsertContainerById,
  deleteContainer,

  // seed (manual)
  seedTmDefaults,
};
