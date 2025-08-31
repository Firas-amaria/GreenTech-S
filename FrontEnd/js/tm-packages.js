// Transportation Manager • Packages & Containers
// Uses ONLY the fields your backend returns on cards; schema is used in the editor modal.
// Initial load = real DB (no align). Manual "Sync defaults (align)" available.

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
  pkgSchema:        ()            => `${API_BASE}/package-schema`,
  addPkgField:      ()            => `${API_BASE}/package-schema/fields`,
  listPackages:     (align=false) => `${API_BASE}/packages${align ? "?align=true":""}`,
  createPackage:    ()            => `${API_BASE}/packages`,
  upsertPackage:    (id)          => `${API_BASE}/packages/${encodeURIComponent(id)}`,
  deletePackage:    (id)          => `${API_BASE}/packages/${encodeURIComponent(id)}`,

  ctrSchema:        ()            => `${API_BASE}/container-schema`,
  addCtrField:      ()            => `${API_BASE}/container-schema/fields`,
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
  console.log(`%c[TM][FETCH ➜] ${method} ${url}`, "color:#0a84ff", { body });
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = data?.error || `${res.status} ${res.statusText}`;
    console.error(`[TM][FETCH ✖] ${method} ${url} ->`, res.status, msg, data);
    throw new Error(msg);
  }
  console.log(`%c[TM][FETCH ✓] ${method} ${url} -> ${res.status}`, "color:#34c759", data);
  return data;
}

// ===== State =====
let packageSchema = []; // used only in modal
let packages = [];      // raw from backend
let containerSchema = [];
let containers = [];

// ===== Helpers =====
const q  = (sel, root=document) => root.querySelector(sel);
const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d=0) => (Number.isFinite(+n) ? Number(n).toFixed(d) : "—");
const asDate = (ts) => {
  // Firestore Timestamp-like: { _seconds, _nanoseconds }
  if (ts && typeof ts._seconds === "number") {
    const ms = ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1e6);
    return new Date(ms).toLocaleString();
  }
  return "—";
};
const nominalLitersFromInner = (innerDimsCm) => {
  if (!innerDimsCm) return null;
  const { l, w, h } = innerDimsCm;
  if (![l,w,h].every(Number.isFinite)) return null;
  return (l * w * h) / 1000; // cm^3 -> L
};

// ===== Init =====
async function init() {
  console.log("[TM] init() starting…");
  await loadAll(false); // REAL DB ONLY on initial load
  console.log("[TM] loaded; rendering…");
  renderPackages();
  renderContainers();
  wireGlobalListeners();
  window.TM = { reload: async () => { await loadAll(false); renderPackages(); renderContainers(); } };
}

// ===== Load =====
async function loadAll(align=false) {
  console.log("[TM] loadAll(align=%s)…", align);
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

  console.log("[TM] Packages:", packages.length, packages);
  console.log("[TM] Containers:", containers.length, containers);
}

// ===== Render: Packages (only real DB fields on cards) =====
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
    const {
      id, key, innerDimsCm, headroomPct, usableLiters,
      derived, maxWeightKg, tareWeightKg, maxSkusPerBox,
      mixingAllowed, vented, createdAt, updatedAt
    } = pkg;

    // Prefer top-level usableLiters, else derived.usableLiters
    const usable = Number.isFinite(usableLiters) ? usableLiters :
                   (Number.isFinite(derived?.usableLiters) ? derived.usableLiters : null);

    const nominal = nominalLitersFromInner(innerDimsCm);
    const dims = innerDimsCm
      ? `${innerDimsCm.l}×${innerDimsCm.w}×${innerDimsCm.h} cm`
      : "—";

    const subTitle = [
      key && `Key: ${escapeHtml(key)}`,
      typeof mixingAllowed === "boolean" ? (mixingAllowed ? "Mixing: Yes" : "Mixing: No") : null,
      typeof vented === "boolean" ? (vented ? "Vented" : "Not vented") : null,
      Number.isFinite(maxSkusPerBox) ? `Max SKUs: ${maxSkusPerBox}` : null,
    ].filter(Boolean).join(" • ") || "&nbsp;";

    const card = document.createElement("div");
    card.className = "pkg-card";
    card.innerHTML = `
      <div class="pkg-card__title">${escapeHtml(id ?? key ?? "Untitled")}</div>
      <div class="pkg-card__kv">
        <span class="pkg-card__kv-item"><strong>Inner dims:</strong> ${escapeHtml(dims)}</span>
        <span class="pkg-card__kv-item"><strong>Headroom %:</strong> ${Number.isFinite(headroomPct) ? fmt(headroomPct*100, 0) : "—"}</span>
        <span class="pkg-card__kv-item"><strong>Usable (L):</strong> ${usable != null ? fmt(usable, 2) : "—"}</span>
        <span class="pkg-card__kv-item"><strong>Nominal (L, calc):</strong> ${nominal != null ? fmt(nominal, 2) : "—"}</span>
        <span class="pkg-card__kv-item"><strong>Max Weight (kg):</strong> ${Number.isFinite(maxWeightKg) ? fmt(maxWeightKg, 2) : "—"}</span>
        <span class="pkg-card__kv-item"><strong>Tare (kg):</strong> ${Number.isFinite(tareWeightKg) ? fmt(tareWeightKg, 2) : "—"}</span>
      </div>
      <div class="pkg-card__kv">
        <span class="pkg-card__kv-item">${subTitle}</span>
      </div>
      <div class="pkg-card__kv">
        <span class="pkg-card__kv-item"><strong>Created:</strong> ${escapeHtml(asDate(createdAt))}</span>
        <span class="pkg-card__kv-item"><strong>Updated:</strong> ${escapeHtml(asDate(updatedAt))}</span>
      </div>
      <div class="pkg-card__actions">
        <button class="btn" data-edit-package="${escapeHtml(id)}">Edit</button>
        <button class="btn danger" data-delete-package="${escapeHtml(id)}">Delete</button>
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

// ===== Render: Containers (kept simple, real fields only) =====
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
    const title = ctr.name ?? ctr.id ?? "Container";
    // Show first two schema fields if present for quick glance
    const vals = ctr.values || {};
    const summary = containerSchema.slice(0, 2).map(f => `${f.label}: ${escapeHtml(vals[f.id] ?? "—")}`).join(" • ");

    const card = document.createElement("div");
    card.className = "pkg-card";
    card.innerHTML = `
      <div class="pkg-card__title">${escapeHtml(title)}</div>
      <div class="pkg-card__kv">
        <span class="pkg-card__kv-item">${summary || "&nbsp;"}</span>
      </div>
      <div class="pkg-card__actions">
        <button class="btn" data-edit-container="${escapeHtml(ctr.id)}">Edit</button>
        <button class="btn danger" data-delete-container="${escapeHtml(ctr.id)}">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });

  const add = document.createElement("div");
  add.className = "pkg-card pkg-card--add";
  add.innerHTML = `
    <div class="pkg-card__title">+ Add Container</div>
    <div class="pkg-card__kv"><span>Create a new container with schema defaults</span></div>
  `;
  add.addEventListener("click", () => openContainerModalForCreate());
  grid.appendChild(add);
}

// ===== Modals — Packages (schema-driven editor) =====
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

  // Name: prefer explicit name, else id/key
  draftName = pkg.name ?? pkg.id ?? pkg.key ?? "";

  // Start from defaults, overlay doc.values (schema-driven fields)
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

// ===== Modals — Containers =====
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

// ===== Schema: inline add =====
async function addPackageFieldInline() {
  const labelEl   = q("#new-field-label");
  const typeEl    = q("#new-field-type");
  const defaultEl = q("#new-field-default");
  const label = (labelEl?.value || "").trim();
  const type  = typeEl?.value === "number" ? "number" : "text";
  const defRaw = defaultEl?.value ?? "";
  if (!label) { alert("Please enter a field label."); return; }
  const body = {
    label,
    type,
    defaultValue: type === "number" ? (defRaw === "" ? null : Number(defRaw)) : defRaw,
  };
  await apiFetch(ENDPOINTS.addPkgField(), { method: "POST", body });
  await loadAll(true); // align to apply defaults everywhere
  renderPackageModal();
  renderPackages();
}

async function addContainerFieldInline() {
  const labelEl   = q("#ctr-new-field-label");
  const typeEl    = q("#ctr-new-field-type");
  const defaultEl = q("#ctr-new-field-default");
  const label = (labelEl?.value || "").trim();
  const type  = typeEl?.value === "number" ? "number" : "text";
  const defRaw = defaultEl?.value ?? "";
  if (!label) { alert("Please enter a field label."); return; }
  const body = {
    label,
    type,
    defaultValue: type === "number" ? (defRaw === "" ? null : Number(defRaw)) : defRaw,
  };
  await apiFetch(ENDPOINTS.addCtrField(), { method: "POST", body });
  await loadAll(true);
  renderContainerModal();
  renderContainers();
}

// ===== Modal helpers & listeners =====
function showModal(sel) { q(sel)?.setAttribute("aria-hidden", "false"); }
function hideModal(sel) { q(sel)?.setAttribute("aria-hidden", "true"); }

function wireGlobalListeners() {
  // Toolbar
  q("#btn-refresh")?.addEventListener("click", async () => {
    await loadAll(false);
    renderPackages();
    renderContainers();
  });
  q("#btn-sync")?.addEventListener("click", async () => {
    q("#btn-sync").disabled = true;
    try {
      await loadAll(true); // align=true on demand
      renderPackages();
      renderContainers();
    } finally {
      q("#btn-sync").disabled = false;
    }
  });

  // Header "Add New"
  q("#btn-new-package")?.addEventListener("click", () => openPackageModalForCreate());
  q("#btn-new-container")?.addEventListener("click", () => openContainerModalForCreate());

  // Card actions (delegate)
  document.body.addEventListener("click", (e) => {
    const editPkg = e.target.closest("[data-edit-package]");
    if (editPkg) { openPackageModalForEdit(editPkg.getAttribute("data-edit-package")); return; }
    const delPkg = e.target.closest("[data-delete-package]");
    if (delPkg) { editingPackageId = delPkg.getAttribute("data-delete-package"); deleteCurrentPackage(); return; }

    const editCtr = e.target.closest("[data-edit-container]");
    if (editCtr) { openContainerModalForEdit(editCtr.getAttribute("data-edit-container")); return; }
    const delCtr = e.target.closest("[data-delete-container]");
    if (delCtr) { editingContainerId = delCtr.getAttribute("data-delete-container"); deleteCurrentContainer(); return; }

    if (e.target.hasAttribute("data-close-modal")) {
      hideModal("#package-modal");
      hideModal("#container-modal");
    }
  });

  // Modal buttons — packages
  q("#btn-save-package")?.addEventListener("click", savePackageFromModal);
  q("#btn-delete-package")?.addEventListener("click", deleteCurrentPackage);
  q("#btn-add-field")?.addEventListener("click", addPackageFieldInline);

  // Modal buttons — containers
  q("#btn-save-container")?.addEventListener("click", saveContainerFromModal);
  q("#btn-delete-container")?.addEventListener("click", deleteCurrentContainer);
  q("#ctr-btn-add-field")?.addEventListener("click", addContainerFieldInline);
}
