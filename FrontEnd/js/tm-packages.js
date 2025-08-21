// tm-package.js
// Page logic for Packages & Containers (cards + modal editing)
// All data persisted to localStorage for now.
// Replace with API calls later (placeholders added).

// ====== CONFIG (mock now, API later) ======
const LS_KEYS = {
  PACKAGE_SCHEMA: "tm_sharedFields_v1",   // array of {id,label,type,defaultValue}
  PACKAGES: "tm_packages_v1",            // array of {id,name,values:{[fieldId]: any}}
  CONTAINER_SCHEMA: "tm_containerFields_v1",
  CONTAINERS: "tm_containers_v1"
};

// const API_BASE = "http://localhost:4000";
// import { getCurrentUserToken } from "./firebase-init.js";

// ====== UTIL ======
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const coerce = (val, type) => {
  if (type === "number") {
    if (val === "" || val === null || val === undefined) return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return String(val ?? "");
};

// Simple modal helpers
const openModal = (id) => document.getElementById(id).setAttribute("aria-hidden", "false");
const closeModal = (id) => document.getElementById(id).setAttribute("aria-hidden", "true");

// ====== STATE ======
let packageSchema = [];   // fields for all packages
let packages = [];        // packages list
let containerSchema = []; // fields for all containers
let containers = [];      // containers list

let editingPackageId = null;
let editingContainerId = null;

// ====== SEED DEFAULTS (first load only) ======
function seedDefaultsIfNeeded() {
  const hasSchema = localStorage.getItem(LS_KEYS.PACKAGE_SCHEMA);
  const hasPackages = localStorage.getItem(LS_KEYS.PACKAGES);
  const hasCSchema = localStorage.getItem(LS_KEYS.CONTAINER_SCHEMA);
  const hasContainers = localStorage.getItem(LS_KEYS.CONTAINERS);

  if (!hasSchema) {
    packageSchema = [
      { id: uid(), label: "Length (cm)", type: "number", defaultValue: 40 },
      { id: uid(), label: "Width (cm)",  type: "number", defaultValue: 30 },
      { id: uid(), label: "Height (cm)", type: "number", defaultValue: 25 },
      { id: uid(), label: "Max Kg",      type: "number", defaultValue: 20 },
    ];
    localStorage.setItem(LS_KEYS.PACKAGE_SCHEMA, JSON.stringify(packageSchema));
  }

  if (!hasPackages) {
    // create three standard packages: Small, Medium, Large
    const [len, wid, hei, max] = packageSchema;
    packages = [
      {
        id: uid(),
        name: "Small",
        values: {
          [len.id]: 30, [wid.id]: 20, [hei.id]: 20, [max.id]: 12
        }
      },
      {
        id: uid(),
        name: "Medium",
        values: {
          [len.id]: 40, [wid.id]: 30, [hei.id]: 25, [max.id]: 20
        }
      },
      {
        id: uid(),
        name: "Large",
        values: {
          [len.id]: 50, [wid.id]: 40, [hei.id]: 35, [max.id]: 28
        }
      }
    ];
    localStorage.setItem(LS_KEYS.PACKAGES, JSON.stringify(packages));
  }

  if (!hasCSchema) {
    containerSchema = [
      { id: uid(), label: "Material",    type: "text",   defaultValue: "Plastic" },
      { id: uid(), label: "Capacity Kg", type: "number", defaultValue: 25 },
      { id: uid(), label: "Notes",       type: "text",   defaultValue: "" },
    ];
    localStorage.setItem(LS_KEYS.CONTAINER_SCHEMA, JSON.stringify(containerSchema));
  }

  if (!hasContainers) {
    containers = [
      {
        id: uid(),
        name: "Plastic Crate",
        values: Object.fromEntries(containerSchema.map(f => [f.id, f.defaultValue ?? null]))
      }
    ];
    localStorage.setItem(LS_KEYS.CONTAINERS, JSON.stringify(containers));
  }
}

// ====== LOAD / SAVE ======
function loadAll() {
  packageSchema = JSON.parse(localStorage.getItem(LS_KEYS.PACKAGE_SCHEMA) || "[]");
  packages = JSON.parse(localStorage.getItem(LS_KEYS.PACKAGES) || "[]");
  containerSchema = JSON.parse(localStorage.getItem(LS_KEYS.CONTAINER_SCHEMA) || "[]");
  containers = JSON.parse(localStorage.getItem(LS_KEYS.CONTAINERS) || "[]");
}

function savePackages() {
  localStorage.setItem(LS_KEYS.PACKAGES, JSON.stringify(packages));
  // Example API:
  // const token = await getCurrentUserToken();
  // await fetch(`${API_BASE}/api/tm/packages/bulk`, {
  //   method: "PUT",
  //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  //   body: JSON.stringify(packages)
  // });
}

function savePackageSchema() {
  localStorage.setItem(LS_KEYS.PACKAGE_SCHEMA, JSON.stringify(packageSchema));
  // Example API to upsert schema:
  // await fetch(`${API_BASE}/api/tm/package-schema`, { method: "PUT", body: JSON.stringify(packageSchema) })
}

function saveContainers() {
  localStorage.setItem(LS_KEYS.CONTAINERS, JSON.stringify(containers));
}

function saveContainerSchema() {
  localStorage.setItem(LS_KEYS.CONTAINER_SCHEMA, JSON.stringify(containerSchema));
}

// Keep every package aligned with schema (add missing fields, drop removed)
function alignPackagesWithSchema() {
  const schemaIds = new Set(packageSchema.map(f => f.id));
  packages.forEach(p => {
    // add missing
    packageSchema.forEach(f => {
      if (!(f.id in p.values)) p.values[f.id] = f.defaultValue ?? null;
    });
    // remove extras
    Object.keys(p.values).forEach(fid => {
      if (!schemaIds.has(fid)) delete p.values[fid];
    });
  });
}

// Align containers with their schema
function alignContainersWithSchema() {
  const schemaIds = new Set(containerSchema.map(f => f.id));
  containers.forEach(c => {
    containerSchema.forEach(f => {
      if (!(f.id in c.values)) c.values[f.id] = f.defaultValue ?? null;
    });
    Object.keys(c.values).forEach(fid => {
      if (!schemaIds.has(fid)) delete c.values[fid];
    });
  });
}

// ====== RENDER ======
function render() {
  renderPackages();
  renderContainers();
}

function renderPackages() {
  const grid = document.getElementById("package-grid");
  grid.innerHTML = "";

  packages.forEach(pkg => {
    const dims = getDimsText(pkg);
    const maxKg = getFieldValueByLabel(pkg, "Max Kg");
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-title">${escapeHtml(pkg.name)}</div>
      <div class="kv">
        <span>Dimensions: ${escapeHtml(dims)}</span>
        <span>Max Kg: ${maxKg ?? "-"}</span>
      </div>
      <div class="card-actions">
        <button class="btn" data-edit-package="${pkg.id}">Edit</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Add New card (secondary option, in addition to top button)
  const add = document.createElement("div");
  add.className = "card add-card";
  add.innerHTML = `<div><div class="card-title">+ Add Package</div><div class="kv"><span>Define dimensions & max load</span></div></div>`;
  add.addEventListener("click", onAddNewPackage);
  grid.appendChild(add);
}

function renderContainers() {
  const grid = document.getElementById("container-grid");
  grid.innerHTML = "";

  containers.forEach(ctr => {
    const capLabel = findSchemaLabel(containerSchema, "Capacity Kg") || "Capacity Kg";
    const capacity = getContainerValueByLabel(ctr, capLabel);
    const materialLabel = findSchemaLabel(containerSchema, "Material") || "Material";
    const material = getContainerValueByLabel(ctr, materialLabel);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-title">${escapeHtml(ctr.name)}</div>
      <div class="kv">
        <span>${materialLabel}: ${escapeHtml(material ?? "-")}</span>
        <span>${capLabel}: ${capacity ?? "-"}</span>
      </div>
      <div class="card-actions">
        <button class="btn" data-edit-container="${ctr.id}">Edit</button>
      </div>
    `;
    grid.appendChild(card);
  });

  const add = document.createElement("div");
  add.className = "card add-card";
  add.innerHTML = `<div><div class="card-title">+ Add Container</div><div class="kv"><span>Define properties</span></div></div>`;
  add.addEventListener("click", onAddNewContainer);
  grid.appendChild(add);
}

// Helpers to display dims from (Length/Width/Height cm)
function getDimsText(pkg) {
  const map = indexSchemaByLabel(packageSchema);
  const L = pkg.values[map.get("Length (cm)")?.id] ?? "-";
  const W = pkg.values[map.get("Width (cm)")?.id] ?? "-";
  const H = pkg.values[map.get("Height (cm)")?.id] ?? "-";
  return `${L}×${W}×${H} cm`;
}

function getFieldValueByLabel(pkg, label) {
  const field = indexSchemaByLabel(packageSchema).get(label);
  return field ? pkg.values[field.id] : null;
}
function getContainerValueByLabel(ctr, label) {
  const field = indexSchemaByLabel(containerSchema).get(label);
  return field ? ctr.values[field.id] : null;
}

function indexSchemaByLabel(schema) {
  const m = new Map();
  schema.forEach(f => m.set(f.label, f));
  return m;
}
function findSchemaLabel(schema, needle) {
  // exact match first, else try case-insensitive
  const exact = schema.find(f => f.label === needle);
  if (exact) return exact.label;
  const ci = schema.find(f => f.label.toLowerCase() === needle.toLowerCase());
  return ci?.label;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ====== EVENT HANDLERS (PACKAGES) ======
function onAddNewPackage() {
  const defaults = Object.fromEntries(packageSchema.map(f => [f.id, f.defaultValue ?? null]));
  const newPkg = { id: uid(), name: "New Package", values: defaults };
  packages.push(newPkg);
  savePackages();
  render();
  openEditPackage(newPkg.id);
}

function openEditPackage(id) {
  editingPackageId = id;
  const pkg = packages.find(p => p.id === id);
  if (!pkg) return;

  document.getElementById("pkg-name").value = pkg.name;
  renderPackageFieldsList(pkg);
  openModal("package-modal");
}

function renderPackageFieldsList(pkg) {
  const wrap = document.getElementById("pkg-fields-list");
  wrap.innerHTML = "";

  packageSchema.forEach(field => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.dataset.fieldId = field.id;

    row.innerHTML = `
      <input class="fld-label" type="text" value="${escapeHtml(field.label)}" title="Field label (global)" />
      <select class="fld-type">
        <option value="number" ${field.type === "number" ? "selected":""}>Number</option>
        <option value="text" ${field.type === "text" ? "selected":""}>Text</option>
      </select>
      <input class="fld-default" type="${field.type === "number" ? "number":"text"}" value="${escapeHtml(field.defaultValue ?? "")}" placeholder="Default (global)" />
      <input class="fld-value" type="${field.type === "number" ? "number":"text"}" value="${escapeHtml(pkg.values[field.id] ?? "")}" placeholder="Value for '${escapeHtml(pkg.name)}'" />
      <button class="btn danger fld-remove" title="Remove field (all packages)">Remove</button>
    `;
    wrap.appendChild(row);
  });

  // Delegate change handlers
  wrap.oninput = (e) => {
    const row = e.target.closest(".field-row");
    if (!row) return;
    const fieldId = row.dataset.fieldId;
    const field = packageSchema.find(f => f.id === fieldId);
    if (!field) return;

    if (e.target.classList.contains("fld-label")) {
      const newLabel = e.target.value.trim();
      if (!newLabel) return;
      // Disallow duplicate labels (global)
      if (packageSchema.some(f => f.id !== fieldId && f.label.toLowerCase() === newLabel.toLowerCase())) {
        e.target.setCustomValidity("Label already exists");
        e.target.reportValidity();
        return;
      } else {
        e.target.setCustomValidity("");
      }
      field.label = newLabel;
      savePackageSchema();
      render(); // update visible labels in cards
    }

    if (e.target.classList.contains("fld-type")) {
      field.type = e.target.value;
      // Coerce default
      const defEl = row.querySelector(".fld-default");
      defEl.type = field.type === "number" ? "number" : "text";
      field.defaultValue = coerce(defEl.value, field.type);
      // Coerce package value
      const valEl = row.querySelector(".fld-value");
      valEl.type = field.type === "number" ? "number" : "text";
      pkg.values[fieldId] = coerce(valEl.value, field.type);
      savePackageSchema();
      savePackages();
      render();
    }

    if (e.target.classList.contains("fld-default")) {
      field.defaultValue = coerce(e.target.value, field.type);
      savePackageSchema();
    }

    if (e.target.classList.contains("fld-value")) {
      pkg.values[fieldId] = coerce(e.target.value, field.type);
      savePackages();
      render();
    }
  };

  wrap.onclick = (e) => {
    if (e.target.classList.contains("fld-remove")) {
      const row = e.target.closest(".field-row");
      const fieldId = row.dataset.fieldId;
      if (!confirm("Remove this field from ALL packages?")) return;
      // Remove from schema and from every package
      packageSchema = packageSchema.filter(f => f.id !== fieldId);
      packages.forEach(p => delete p.values[fieldId]);
      savePackageSchema();
      savePackages();
      alignPackagesWithSchema();
      renderPackageFieldsList(pkg);
      render();
    }
  };
}

// Buttons in modal
document.getElementById("btn-add-field").addEventListener("click", () => {
  const label = document.getElementById("new-field-label").value.trim();
  const type = document.getElementById("new-field-type").value;
  const defRaw = document.getElementById("new-field-default").value;
  if (!label) return alert("Please provide a field label.");
  if (packageSchema.some(f => f.label.toLowerCase() === label.toLowerCase()))
    return alert("A field with this label already exists.");

  const field = { id: uid(), label, type, defaultValue: coerce(defRaw, type) };
  packageSchema.push(field);
  packages.forEach(p => { p.values[field.id] = field.defaultValue ?? null; });
  savePackageSchema();
  savePackages();
  alignPackagesWithSchema();

  // refresh current editor
  const pkg = packages.find(p => p.id === editingPackageId);
  if (pkg) renderPackageFieldsList(pkg);
  render();

  // clear inputs
  document.getElementById("new-field-label").value = "";
  document.getElementById("new-field-default").value = "";
});

document.getElementById("btn-save-package").addEventListener("click", () => {
  const pkg = packages.find(p => p.id === editingPackageId);
  if (!pkg) return;
  pkg.name = document.getElementById("pkg-name").value.trim() || pkg.name;
  savePackages();
  render();
  closeModal("package-modal");
});

document.getElementById("btn-delete-package").addEventListener("click", () => {
  const pkg = packages.find(p => p.id === editingPackageId);
  if (!pkg) return;
  if (!confirm(`Delete package "${pkg.name}"?`)) return;
  packages = packages.filter(p => p.id !== pkg.id);
  savePackages();
  render();
  closeModal("package-modal");
});

// ====== EVENT HANDLERS (CONTAINERS) ======
function onAddNewContainer() {
  const defaults = Object.fromEntries(containerSchema.map(f => [f.id, f.defaultValue ?? null]));
  const newCtr = { id: uid(), name: "New Container", values: defaults };
  containers.push(newCtr);
  saveContainers();
  render();
  openEditContainer(newCtr.id);
}

function openEditContainer(id) {
  editingContainerId = id;
  const ctr = containers.find(c => c.id === id);
  if (!ctr) return;

  document.getElementById("ctr-name").value = ctr.name;
  renderContainerFieldsList(ctr);
  openModal("container-modal");
}

function renderContainerFieldsList(ctr) {
  const wrap = document.getElementById("ctr-fields-list");
  wrap.innerHTML = "";

  containerSchema.forEach(field => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.dataset.fieldId = field.id;

    row.innerHTML = `
      <input class="ctr-fld-label" type="text" value="${escapeHtml(field.label)}" title="Field label (global)" />
      <select class="ctr-fld-type">
        <option value="number" ${field.type === "number" ? "selected":""}>Number</option>
        <option value="text" ${field.type === "text" ? "selected":""}>Text</option>
      </select>
      <input class="ctr-fld-default" type="${field.type === "number" ? "number":"text"}" value="${escapeHtml(field.defaultValue ?? "")}" placeholder="Default (global)" />
      <input class="ctr-fld-value" type="${field.type === "number" ? "number":"text"}" value="${escapeHtml(ctr.values[field.id] ?? "")}" placeholder="Value for '${escapeHtml(ctr.name)}'" />
      <button class="btn danger ctr-fld-remove" title="Remove field (all containers)">Remove</button>
    `;
    wrap.appendChild(row);
  });

  wrap.oninput = (e) => {
    const row = e.target.closest(".field-row");
    if (!row) return;
    const fieldId = row.dataset.fieldId;
    const field = containerSchema.find(f => f.id === fieldId);
    if (!field) return;

    if (e.target.classList.contains("ctr-fld-label")) {
      const newLabel = e.target.value.trim();
      if (!newLabel) return;
      if (containerSchema.some(f => f.id !== fieldId && f.label.toLowerCase() === newLabel.toLowerCase())) {
        e.target.setCustomValidity("Label already exists");
        e.target.reportValidity();
        return;
      } else {
        e.target.setCustomValidity("");
      }
      field.label = newLabel;
      saveContainerSchema();
      render();
    }

    if (e.target.classList.contains("ctr-fld-type")) {
      field.type = e.target.value;
      const defEl = row.querySelector(".ctr-fld-default");
      defEl.type = field.type === "number" ? "number" : "text";
      field.defaultValue = coerce(defEl.value, field.type);
      const valEl = row.querySelector(".ctr-fld-value");
      valEl.type = field.type === "number" ? "number" : "text";
      ctr.values[fieldId] = coerce(valEl.value, field.type);
      saveContainerSchema();
      saveContainers();
      render();
    }

    if (e.target.classList.contains("ctr-fld-default")) {
      field.defaultValue = coerce(e.target.value, field.type);
      saveContainerSchema();
    }

    if (e.target.classList.contains("ctr-fld-value")) {
      ctr.values[fieldId] = coerce(e.target.value, field.type);
      saveContainers();
      render();
    }
  };

  wrap.onclick = (e) => {
    if (e.target.classList.contains("ctr-fld-remove")) {
      const row = e.target.closest(".field-row");
      const fieldId = row.dataset.fieldId;
      if (!confirm("Remove this field from ALL containers?")) return;
      containerSchema = containerSchema.filter(f => f.id !== fieldId);
      containers.forEach(p => delete p.values[fieldId]);
      saveContainerSchema();
      saveContainers();
      alignContainersWithSchema();
      renderContainerFieldsList(ctr);
      render();
    }
  };
}

document.getElementById("ctr-btn-add-field").addEventListener("click", () => {
  const label = document.getElementById("ctr-new-field-label").value.trim();
  const type = document.getElementById("ctr-new-field-type").value;
  const defRaw = document.getElementById("ctr-new-field-default").value;
  if (!label) return alert("Please provide a field label.");
  if (containerSchema.some(f => f.label.toLowerCase() === label.toLowerCase()))
    return alert("A field with this label already exists.");

  const field = { id: uid(), label, type, defaultValue: coerce(defRaw, type) };
  containerSchema.push(field);
  containers.forEach(c => { c.values[field.id] = field.defaultValue ?? null; });
  saveContainerSchema();
  saveContainers();
  alignContainersWithSchema();

  const ctr = containers.find(c => c.id === editingContainerId);
  if (ctr) renderContainerFieldsList(ctr);
  render();

  document.getElementById("ctr-new-field-label").value = "";
  document.getElementById("ctr-new-field-default").value = "";
});

document.getElementById("btn-save-container").addEventListener("click", () => {
  const ctr = containers.find(c => c.id === editingContainerId);
  if (!ctr) return;
  ctr.name = document.getElementById("ctr-name").value.trim() || ctr.name;
  saveContainers();
  render();
  closeModal("container-modal");
});

document.getElementById("btn-delete-container").addEventListener("click", () => {
  const ctr = containers.find(c => c.id === editingContainerId);
  if (!ctr) return;
  if (!confirm(`Delete container "${ctr.name}"?`)) return;
  containers = containers.filter(c => c.id !== ctr.id);
  saveContainers();
  render();
  closeModal("container-modal");
});

// ====== GLOBAL LISTENERS ======
document.body.addEventListener("click", (e) => {
  // open editors
  const pkgBtn = e.target.closest("[data-edit-package]");
  if (pkgBtn) openEditPackage(pkgBtn.getAttribute("data-edit-package"));

  const ctrBtn = e.target.closest("[data-edit-container]");
  if (ctrBtn) openEditContainer(ctrBtn.getAttribute("data-edit-container"));

  // modal close
  if (e.target.hasAttribute("data-close-modal")) {
    const modal = e.target.closest(".modal");
    if (modal) modal.setAttribute("aria-hidden", "true");
  }
});

document.getElementById("btn-new-package").addEventListener("click", onAddNewPackage);
document.getElementById("btn-new-container").addEventListener("click", onAddNewContainer);

// ====== INIT ======
seedDefaultsIfNeeded();
loadAll();
alignPackagesWithSchema();
alignContainersWithSchema();
render();

// ====== BACKEND API EXAMPLES (commented) ======
/*
// Fetch all on page load
async function fetchAllFromAPI() {
  const token = await getCurrentUserToken();
  const [schemaRes, pkgsRes, csRes, ctrsRes] = await Promise.all([
    fetch(`${API_BASE}/api/tm/package-schema`, { headers: { Authorization: `Bearer ${token}` }}),
    fetch(`${API_BASE}/api/tm/packages`, { headers: { Authorization: `Bearer ${token}` }}),
    fetch(`${API_BASE}/api/tm/container-schema`, { headers: { Authorization: `Bearer ${token}` }}),
    fetch(`${API_BASE}/api/tm/containers`, { headers: { Authorization: `Bearer ${token}` }}),
  ]);
  packageSchema = await schemaRes.json();
  packages = await pkgsRes.json();
  containerSchema = await csRes.json();
  containers = await ctrsRes.json();
  render();
}

// Rename a field globally
async function renamePackageField(fieldId, newLabel) {
  const token = await getCurrentUserToken();
  await fetch(`${API_BASE}/api/tm/package-fields/${fieldId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ label: newLabel })
  });
}
*/
