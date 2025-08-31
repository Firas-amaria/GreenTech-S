// Transportation Manager • Packages & Containers
// - Cards show only REAL DB fields: Bold name, Dimensions, Max weight
// - "View / Edit" opens a separate editor window with all fields + Save
// - Delete works via /packages/:id
// - Existing modals remain for create/edit via schema if you want them

import { auth, onAuthStateChanged } from "./firebase-init.js";

// ===== Auth token =====
let ID_TOKEN = null;
onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      alert("Please log in.");
      window.location.href = "login.html";
      return;
    }
    ID_TOKEN = await user.getIdToken(false);
    await init();
  } catch (err) {
    console.error("Auth/init error:", err);
    alert("Authentication failed. Please try again.");
  }
});

// ===== API =====
const API_BASE = "http://localhost:4000/api/tm-packages";
const ENDPOINTS = {
  // package schema & packages
  pkgSchema:        ()            => `${API_BASE}/package-schema`,
  addPkgField:      ()            => `${API_BASE}/package-schema/fields`,
  updatePkgField:   (id)          => `${API_BASE}/package-schema/fields/${encodeURIComponent(id)}`,
  deletePkgField:   (id)          => `${API_BASE}/package-schema/fields/${encodeURIComponent(id)}`,
  listPackages:     (align=false) => `${API_BASE}/packages${align ? "?align=true":""}`,
  createPackage:    ()            => `${API_BASE}/packages`,
  upsertPackage:    (id)          => `${API_BASE}/packages/${encodeURIComponent(id)}`,
  deletePackage:    (id)          => `${API_BASE}/packages/${encodeURIComponent(id)}`,

  // container schema & containers
  ctrSchema:        ()            => `${API_BASE}/container-schema`,
  addCtrField:      ()            => `${API_BASE}/container-schema/fields`,
  updateCtrField:   (id)          => `${API_BASE}/container-schema/fields/${encodeURIComponent(id)}`,
  deleteCtrField:   (id)          => `${API_BASE}/container-schema/fields/${encodeURIComponent(id)}`,
  listContainers:   (align=false) => `${API_BASE}/containers${align ? "?align=true":""}`,
  createContainer:  ()            => `${API_BASE}/containers`,
  upsertContainer:  (id)          => `${API_BASE}/containers/${encodeURIComponent(id)}`,
  deleteContainer:  (id)          => `${API_BASE}/containers/${encodeURIComponent(id)}`,
};

async function apiFetch(url, { method = "GET", body, headers = {} } = {}) {
  if (!ID_TOKEN) throw new Error("Missing auth token");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ID_TOKEN}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };
//  console.log(`%c[TM][FETCH ➜] ${method} ${url}`, "color:#0a84ff", { body });
  const res = await fetch(url, opts);
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.error || `${res.status} ${res.statusText}`;
    console.error(`[TM][FETCH ✖] ${method} ${url} ->`, res.status, msg, data);
    throw new Error(msg);
  }
//  console.log(`%c[TM][FETCH ✓] ${method} ${url} -> ${res.status}`, "color:#34c759", data);
  return data;
}

// ===== State =====
let packageSchema = []; // used by modal & editor
let packages = [];      // raw (Firest—via backend)
let containerSchema = [];
let containers = [];

// ===== Helpers =====
const q  = (sel, root=document) => root.querySelector(sel);
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d=0) => (Number.isFinite(+n) ? Number(n).toFixed(d) : "—");

// map by label from schema (for fallbacks)
const fieldByLabel = (label) => packageSchema.find(f => String(f.label).toLowerCase() === String(label).toLowerCase());
const valByLabel   = (values, label) => {
  const f = fieldByLabel(label);
  return f ? values?.[f.id] : undefined;
};

// prefer top-level maxWeightKg; fallback to schema "Max Kg"
function extractMaxWeight(pkg) {
  if (Number.isFinite(pkg?.maxWeightKg)) return pkg.maxWeightKg;
  const fromValues = valByLabel(pkg?.values, "Max Kg");
  return Number.isFinite(Number(fromValues)) ? Number(fromValues) : null;
}

// prefer innerDimsCm; else fallback to Length/Width/Height from schema values
function extractDimsString(pkg) {
  if (pkg?.innerDimsCm && [pkg.innerDimsCm.l, pkg.innerDimsCm.w, pkg.innerDimsCm.h].every(Number.isFinite)) {
    const { l, w, h } = pkg.innerDimsCm;
    return `${l}×${w}×${h} cm`;
  }
  const L = valByLabel(pkg?.values, "Length (cm)");
  const W = valByLabel(pkg?.values, "Width (cm)");
  const H = valByLabel(pkg?.values, "Height (cm)");
  if ([L, W, H].every(v => Number.isFinite(Number(v)))) return `${Number(L)}×${Number(W)}×${Number(H)} cm`;
  return "—";
}

// open editor window
function openPackageEditorWindow(id) {
  // place tm-package-editor.html next to this HTML file; adjust path if needed
  const url = `./tm-package-editor.html?id=${encodeURIComponent(id)}`;
  const win = window.open(url, "tmPackageEditor", "width=980,height=720,noopener");
  if (!win) window.location.href = url; // popup blocked
}

// ===== Init =====
async function init() {
  //console.log("[TM] init() starting…");
  await loadAll(false); // real DB only
  renderPackages();
  renderContainers();
  wireGlobalListeners();
  window.TM = { reload: async () => { await loadAll(false); renderPackages(); renderContainers(); } };
}

// ===== Load =====
async function loadAll(align=false) {
  //console.log("[TM] loadAll(align=%s)…", align);
  const [pkgSchema, pkgs, ctrSchema, ctrs] = await Promise.all([
    apiFetch(ENDPOINTS.pkgSchema()),
    apiFetch(ENDPOINTS.listPackages(align)),
    apiFetch(ENDPOINTS.ctrSchema()),
    apiFetch(ENDPOINTS.listContainers(align)),
  ]);
  packageSchema   = Array.isArray(pkgSchema) ? pkgSchema : [];
  packages        = Array.isArray(pkgs) ? pkgs : [];
  containerSchema = Array.isArray(ctrSchema) ? ctrSchema : [];
  containers      = Array.isArray(ctrs) ? ctrs : [];
  //console.log("[TM] pkgs:", packages.length, packages);
}

// ===== Render: Packages (bold name, dims, max weight, buttons) =====
function renderPackages() {
  const grid = q("#package-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!packages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__icon">📦</div>
      <div class="empty-state__title">No packages yet</div>
      <div class="empty-state__hint">Click “Add New” to create your first package.</div>
    `;
    grid.appendChild(empty);
  }

  packages.forEach(pkg => {
    const dims = extractDimsString(pkg);
    const maxW = extractMaxWeight(pkg);

    const card = document.createElement("div");
    card.className = "pkg-card";
    card.innerHTML = `
      <div class="pkg-card__title"><strong>${escapeHtml(pkg.id ?? pkg.key ?? "Untitled")}</strong></div>
      <div class="pkg-card__kv">
        <span class="pkg-card__kv-item"><strong>Dimensions:</strong> ${escapeHtml(dims)}</span>
      </div>
      <div class="pkg-card__kv">
        <span class="pkg-card__kv-item"><strong>Max weight:</strong> ${Number.isFinite(maxW) ? `${fmt(maxW,2)} kg` : "—"}</span>
      </div>
      <div class="pkg-card__actions">
        <button class="btn" data-view-edit="${escapeHtml(pkg.id)}">View / Edit</button>
        <button class="btn danger" data-delete-package="${escapeHtml(pkg.id)}">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Add card
  const add = document.createElement("div");
  add.className = "pkg-card pkg-card--add";
  add.innerHTML = `
    <div class="pkg-card__title">+ Add Package</div>
    <div class="pkg-card__kv"><span>Create a new package with schema defaults</span></div>
  `;
  add.addEventListener("click", () => openPackageModalForCreate());
  grid.appendChild(add);
}

// ===== Render: Containers (simple preview) =====
function renderContainers() {
  const grid = q("#container-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!containers.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__icon">🧰</div>
      <div class="empty-state__title">No containers yet</div>
      <div class="empty-state__hint">Click “Add New” to create your first container.</div>
    `;
    grid.appendChild(empty);
  }

  containers.forEach(ctr => {
    const vals = ctr.values || {};
    const summary = containerSchema.slice(0, 2).map(f => `${f.label}: ${vals[f.id] ?? "—"}`).join(" • ");

    const card = document.createElement("div");
    card.className = "pkg-card";
    card.innerHTML = `
      <div class="pkg-card__title">${escapeHtml(ctr.name ?? ctr.id ?? "Container")}</div>
      <div class="pkg-card__kv"><span class="pkg-card__kv-item">${escapeHtml(summary || "")}</span></div>
      <div class="pkg-card__actions">
        <button class="btn" data-edit-container="${escapeHtml(ctr.id)}">Edit</button>
        <button class="btn danger" data-delete-container="${escapeHtml(ctr.id)}">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Add card
  const add = document.createElement("div");
  add.className = "pkg-card pkg-card--add";
  add.innerHTML = `
    <div class="pkg-card__title">+ Add Container</div>
    <div class="pkg-card__kv"><span>Create a new container with schema defaults</span></div>
  `;
  add.addEventListener("click", () => openContainerModalForCreate());
  grid.appendChild(add);
}

// ===== Package modal (quick create/edit via schema; optional) =====
let editingPackageId = null;
let draftValues = {};
let draftName = "";

function openPackageModalForCreate() {
  editingPackageId = null;
  draftName = "New Package";
  draftValues = Object.fromEntries(packageSchema.map(f => [f.id, f.defaultValue ?? null]));
  renderPackageModal();
  showModal("#package-modal");
}

function openPackageModalForEdit(id) {
  const pkg = packages.find(p => p.id === id);
  if (!pkg) return;
  editingPackageId = id;
  draftName = pkg.name ?? pkg.id ?? pkg.key ?? "";
  const base = Object.fromEntries(packageSchema.map(f => [f.id, f.defaultValue ?? null]));
  draftValues = { ...base, ...(pkg.values || {}) };
  renderPackageModal();
  showModal("#package-modal");
}

function renderPackageModal() {
  const nameEl = q("#pkg-name");
  const listEl = q("#pkg-fields-list");
  if (!nameEl || !listEl) return;
  nameEl.value = draftName;
  listEl.innerHTML = "";

  packageSchema.forEach(field => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.dataset.fieldId = field.id;
    const current = draftValues[field.id];
    row.innerHTML = `
      <div class="field-row__label">${escapeHtml(field.label)}</div>
      <div class="field-row__control">
        <input class="fld-value"
               type="${field.type === 'number' ? 'number' : 'text'}"
               value="${current ?? ""}" />
      </div>
    `;
    listEl.appendChild(row);
  });

  listEl.oninput = (e) => {
    const row = e.target.closest(".field-row");
    if (!row || !e.target.classList.contains("fld-value")) return;
    const fieldId = row.dataset.fieldId;
    const field = packageSchema.find(f => f.id === fieldId);
    if (!field) return;
    draftValues[fieldId] = (field.type === "number")
      ? (e.target.value === "" ? null : Number(e.target.value))
      : e.target.value;
  };
  nameEl.oninput = (e) => { draftName = e.target.value; };
}

async function savePackageFromModal() {
  try {
    const body = { name: (draftName || "").trim() || "New Package", values: { ...draftValues } };
    if (editingPackageId) {
      await apiFetch(ENDPOINTS.upsertPackage(editingPackageId), { method: "PUT", body });
    } else {
      await apiFetch(ENDPOINTS.createPackage(), { method: "POST", body });
    }
    await loadAll(false);
    renderPackages();
    renderContainers();
    hideModal("#package-modal");
  } catch (err) {
    console.error("Save package failed:", err);
    alert(`Could not save package: ${err.message}`);
  }
}

async function deleteCurrentPackage() {
  if (!editingPackageId) { hideModal("#package-modal"); return; }
  if (!confirm("Delete this package?")) return;
  try {
    await apiFetch(ENDPOINTS.deletePackage(editingPackageId), { method: "DELETE" });
    await loadAll(false);
    renderPackages();
    renderContainers();
    hideModal("#package-modal");
  } catch (err) {
    console.error("Delete package failed:", err);
    alert(`Could not delete package: ${err.message}`);
  }
}

// ===== Container modal (kept minimal) =====
let editingContainerId = null;
let ctrDraftValues = {};
let ctrDraftName = "";

function openContainerModalForCreate() {
  editingContainerId = null;
  ctrDraftName = "New Container";
  ctrDraftValues = Object.fromEntries(containerSchema.map(f => [f.id, f.defaultValue ?? null]));
  renderContainerModal();
  showModal("#container-modal");
}
function openContainerModalForEdit(id) {
  const ctr = containers.find(c => c.id === id);
  if (!ctr) return;
  editingContainerId = id;
  ctrDraftName = ctr.name ?? ctr.id ?? "";
  const base = Object.fromEntries(containerSchema.map(f => [f.id, f.defaultValue ?? null]));
  ctrDraftValues = { ...base, ...(ctr.values || {}) };
  renderContainerModal();
  showModal("#container-modal");
}
function renderContainerModal() {
  const nameEl = q("#ctr-name");
  const listEl = q("#ctr-fields-list");
  if (!nameEl || !listEl) return;
  nameEl.value = ctrDraftName;
  listEl.innerHTML = "";
  containerSchema.forEach(field => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.dataset.fieldId = field.id;
    const current = ctrDraftValues[field.id];
    row.innerHTML = `
      <div class="field-row__label">${escapeHtml(field.label)}</div>
      <div class="field-row__control">
        <input class="fld-value"
               type="${field.type === 'number' ? 'number' : 'text'}"
               value="${current ?? ""}" />
      </div>
    `;
    listEl.appendChild(row);
  });
  listEl.oninput = (e) => {
    const row = e.target.closest(".field-row");
    if (!row || !e.target.classList.contains("fld-value")) return;
    const fieldId = row.dataset.fieldId;
    const field = containerSchema.find(f => f.id === fieldId);
    if (!field) return;
    ctrDraftValues[fieldId] = (field.type === "number")
      ? (e.target.value === "" ? null : Number(e.target.value))
      : e.target.value;
  };
  nameEl.oninput = (e) => { ctrDraftName = e.target.value; };
}
async function saveContainerFromModal() {
  try {
    const body = { name: (ctrDraftName || "").trim() || "New Container", values: { ...ctrDraftValues } };
    if (editingContainerId) {
      await apiFetch(ENDPOINTS.upsertContainer(editingContainerId), { method: "PUT", body });
    } else {
      await apiFetch(ENDPOINTS.createContainer(), { method: "POST", body });
    }
    await loadAll(false);
    renderContainers();
    renderPackages();
    hideModal("#container-modal");
  } catch (err) {
    console.error("Save container failed:", err);
    alert(`Could not save container: ${err.message}`);
  }
}
async function deleteCurrentContainer() {
  if (!editingContainerId) { hideModal("#container-modal"); return; }
  if (!confirm("Delete this container?")) return;
  try {
    await apiFetch(ENDPOINTS.deleteContainer(editingContainerId), { method: "DELETE" });
    await loadAll(false);
    renderContainers();
    renderPackages();
    hideModal("#container-modal");
  } catch (err) {
    console.error("Delete container failed:", err);
    alert(`Could not delete container: ${err.message}`);
  }
}

// ===== Modal helpers =====
function showModal(sel) { q(sel)?.setAttribute("aria-hidden", "false"); }
function hideModal(sel) { q(sel)?.setAttribute("aria-hidden", "true"); }

// ===== Global events =====
function wireGlobalListeners() {
  // toolbar
  q("#btn-refresh")?.addEventListener("click", async () => { await loadAll(false); renderPackages(); renderContainers(); });
  q("#btn-sync")?.addEventListener("click", async () => {
    const b = q("#btn-sync"); if (b) b.disabled = true;
    try { await loadAll(true); renderPackages(); renderContainers(); }
    finally { if (b) b.disabled = false; }
  });

  // header add
  q("#btn-new-package")?.addEventListener("click", () => openPackageModalForCreate());
  q("#btn-new-container")?.addEventListener("click", () => openContainerModalForCreate());

  // delegate: view/edit, delete, modal close, container actions
  document.body.addEventListener("click", (e) => {
    const viewEdit = e.target.closest("[data-view-edit]");
    if (viewEdit) { openPackageEditorWindow(viewEdit.getAttribute("data-view-edit")); return; }

    const delPkg = e.target.closest("[data-delete-package]");
    if (delPkg) {
      const id = delPkg.getAttribute("data-delete-package");
      if (confirm("Delete this package?")) {
        apiFetch(ENDPOINTS.deletePackage(id), { method: "DELETE" })
          .then(()=> loadAll(false).then(()=>{ renderPackages(); }))
          .catch(err => { console.error(err); alert(`Delete failed: ${err.message}`); });
      }
      return;
    }

    const editCtr = e.target.closest("[data-edit-container]");
    if (editCtr) { openContainerModalForEdit(editCtr.getAttribute("data-edit-container")); return; }
    const delCtr = e.target.closest("[data-delete-container]");
    if (delCtr) {
      const id = delCtr.getAttribute("data-delete-container");
      if (confirm("Delete this container?")) {
        apiFetch(ENDPOINTS.deleteContainer(id), { method: "DELETE" })
          .then(()=> loadAll(false).then(()=>{ renderContainers(); }))
          .catch(err => { console.error(err); alert(`Delete failed: ${err.message}`); });
      }
      return;
    }

    if (e.target.hasAttribute("data-close-modal")) {
      hideModal("#package-modal");
      hideModal("#container-modal");
      return;
    }
  });
}
