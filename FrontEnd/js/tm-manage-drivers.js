// tm-manage-drivers.js
// Page logic for Transportation Manager -> Manage Drivers
// Endpoints (to implement in backend):
//  Deliverers:
//    GET  /api/tm/deliverers
//    GET  /api/tm/deliverers/active
//    GET  /api/tm/deliverers/active-per-shift
//    GET  /api/tm/deliverers/:uid
//    PUT  /api/tm/deliverers/:uid
//  Industrial Drivers:
//    GET  /api/tm/industrial-drivers
//    GET  /api/tm/industrial-drivers/active
//    GET  /api/tm/industrial-drivers/active-per-shift
//    GET  /api/tm/industrial-drivers/:id
//    PUT  /api/tm/industrial-drivers/:id

import { getCurrentUserToken } from "../js/firebase-init.js";

const API_BASE = "http://localhost:4000/api/tm";
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  roleTab: "industrial",   // "industrial" | "deliverers"
  filter: "all",           // "all" | "active-now" | "active-per-shift"
  token: null,
  cache: {
    industrial: { all: null, active: null, perShift: null },
    deliverers: { all: null, active: null, perShift: null },
  },
  currentEditing: null,    // holds full driver object currently viewed/edited
};

const elements = {
  grid: $("#cards-grid"),
  empty: $("#empty-state"),
  tabs: $$(".tmmd-subnav .tab"),
  filter: $("#filter-type"),
  modal: $("#driver-modal"),
  modalClose: $("#modal-close"),
  modalCancel: $("#modal-cancel"),
  form: $("#driver-form"),
  saveBtn: $("#modal-save"),
  title: $("#modal-title"),
};

// Minimal mock so UI is visible if backend not ready
const MOCK_DELIVERER = {
  uid: "0qhBrCMQEmPud3TFNtHWN4OrWh32",
  status: "active",
  role: "deliverer",
  firstName: "excalibur",
  lastName: "prime",
  email: "arthur@gmail.com",
  phone: "+972504594782",
  driverLicenseNumber: "123",
  licenseType: "123",
  limitKg: 210,
  cargoVolumeLiters: 1771.2,
  cargoDimensionsCm: { length: 120, width: 123, height: 120 },
  gridFit: { Small: 216, Medium: 64, Large: 8 },
  recommendedMix: { Small: 1, Medium: 0, Large: 8 },
  weightCap: { Small: 35, Medium: 17, Large: 8 },
  cost: { fixed: 30, perKm: 1, perStop: 1 },
  speedKmH: 102,
  vehicle: {
    type: "123", make: "123", model: "456", year: 123,
    registrationNumber: "123", insured: true
  },
  notes: null,
};
const MOCK_INDUSTRIAL = {
  id: "IND-123",
  status: "active",
  role: "industrial-driver",
  firstName: "Indus",
  lastName: "Trucker",
  email: "indus@example.com",
  phone: "+972500000000",
  driverLicenseNumber: "IND-999",
  licenseType: "Heavy",
  limitKg: 3000,
  cargoVolumeLiters: 10000,
  cargoDimensionsCm: { length: 300, width: 240, height: 260 },
  gridFit: { Small: 0, Medium: 0, Large: 120 },
  recommendedMix: { Small: 0, Medium: 0, Large: 120 },
  weightCap: { Small: 0, Medium: 0, Large: 50 },
  cost: { fixed: 200, perKm: 4, perStop: 10 },
  speedKmH: 85,
  vehicle: {
    type: "Truck", make: "Volvo", model: "FH", year: 2022,
    registrationNumber: "77-777-77", insured: true
  },
  notes: "Industrial heavy truck.",
};

// ===== Init =====
init().catch(console.error);

async function init() {
  try {
    state.token = await getCurrentUserToken();
  } catch (e) {
    console.warn("[TM] No auth token yet; API calls may fail.", e);
  }

  // Wire events
  elements.tabs.forEach((btn) =>
    btn.addEventListener("click", () => onTabClick(btn))
  );
  elements.filter.addEventListener("change", onFilterChange);
  elements.modalClose.addEventListener("click", closeModal);
  elements.modalCancel.addEventListener("click", closeModal);
  elements.form.addEventListener("submit", onSubmitForm);

  // First load
  await reload();
}

async function reload() {
  setLoading(true);
  clearGrid();

  if (state.filter === "active-per-shift") {
    const list = await fetchActivePerShift(state.roleTab);
    renderShiftList(list);
  } else {
    const list = await fetchDriversList(state.roleTab, state.filter);
    renderDriverCards(list);
  }
  setLoading(false);
}

function onTabClick(btn) {
  elements.tabs.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.roleTab = btn.dataset.role; // "industrial" | "deliverers"
  reload();
}

function onFilterChange() {
  state.filter = elements.filter.value; // "all" | "active-now" | "active-per-shift"
  reload();
}

function setLoading(isLoading) {
  if (isLoading) {
    elements.empty.classList.remove("hidden");
    elements.empty.innerText = "Loading…";
  } else {
    elements.empty.classList.add("hidden");
  }
}

function clearGrid() {
  elements.grid.innerHTML = "";
}

// ===== API Helpers =====
async function apiGet(path) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function apiPut(path, body) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function collectionSegment(role) {
  return role === "deliverers" ? "deliverers" : "industrial-drivers";
}

// ===== Fetchers =====
async function fetchDriversList(role, filter) {
  const seg = collectionSegment(role);
  try {
    if (filter === "all") {
      const data = await apiGet(`/${seg}`);
      if (!Array.isArray(data) || data.length === 0) return [];
      return data;
    }
    if (filter === "active-now") {
      const data = await apiGet(`/${seg}/active`);
      if (!Array.isArray(data) || data.length === 0) return [];
      return data;
    }
    // default fallback
    return [];
  } catch (e) {
    console.warn(`[TM] Fetch ${role}/${filter} failed, using mock`, e);
    // Mock fallback
    if (role === "deliverers") return [MOCK_DELIVERER];
    return [MOCK_INDUSTRIAL];
  }
}

async function fetchActivePerShift(role) {
  const seg = collectionSegment(role);
  try {
    const data = await apiGet(`/${seg}/active-per-shift`);
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.warn("[TM] per-shift fetch failed, mocking.", e);
    // simple mock shifts
    const today = new Date();
    const day = today.toISOString().slice(0,10);
    return [
      { date: day, shift: "morning", active: 3, standby: 1 },
      { date: day, shift: "afternoon", active: 4, standby: 2 },
      { date: day, shift: "evening", active: 2, standby: 3 },
    ];
  }
}

async function fetchDriverDetails(role, idOrUid) {
  const seg = collectionSegment(role);
  try {
    const data = await apiGet(`/${seg}/${encodeURIComponent(idOrUid)}`);
    return data;
  } catch (e) {
    console.warn("[TM] detail fetch failed, using mock", e);
    return role === "deliverers" ? MOCK_DELIVERER : MOCK_INDUSTRIAL;
  }
}

async function saveDriver(role, idOrUid, body) {
  const seg = collectionSegment(role);
  return apiPut(`/${seg}/${encodeURIComponent(idOrUid)}`, body);
}

// ===== Rendering: Drivers =====
function renderDriverCards(list) {
  if (!list || list.length === 0) {
    const msg = state.roleTab === "industrial"
      ? "There are no industrial drivers to display."
      : (state.filter === "active-now"
          ? "There are no active deliverers available."
          : "There are no deliverers to display.");
    showEmpty(msg);
    return;
  }
  hideEmpty();

  for (const d of list) {
    const card = document.createElement("article");
    card.className = "tmmd-card";

    const fullName = `${d.firstName || ""} ${d.lastName || ""}`.trim() || "(No name)";
    const phone = d.phone || "N/A";
    const status = (d.status || "unknown").toLowerCase();
    const gridFit = d.gridFit || {};
    const s = gridFit.Small ?? 0, m = gridFit.Medium ?? 0, l = gridFit.Large ?? 0;

    card.innerHTML = `
      <div class="tmmd-card__header">
        <div class="tmmd-name">${escapeHtml(fullName)}</div>
        <div class="tmmd-stars" title="Default rating 4/5">${renderStars(4,5)}</div>
      </div>
      <div class="tmmd-card__body">
        <div class="tmmd-card__row">
          <span>Phone</span>
          <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>
        </div>
        <div class="tmmd-card__row">
          <span>Grid Fit</span>
          <span>S=${s} · M=${m} · L=${l}</span>
        </div>

      </div>
      <div class="tmmd-card__actions" style="display: flex; justify-content:space-between;">
          <button class="btn primary small">View performance</button>
      <button class="btn primary small"  data-view="${escapeHtml(d.uid || d.id)}">View</button>
      </div>
    `;

    card.querySelector("[data-view]")?.addEventListener("click", async (ev) => {
      const id = ev.currentTarget.getAttribute("data-view");
      const full = await fetchDriverDetails(state.roleTab, id);
      openModal(full);
    });

    elements.grid.appendChild(card);
  }
}


async function loadShiftsAndRender() {
  try {
    const headers = { "Content-Type": "application/json" };
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

    const seg = state.roleTab === "industrial" ? "industrial-drivers" : "deliverers";
    const url = `${API_BASE}/${seg}/active-upcoming?count=6`; // adjust count if you want

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();

    // Normalize to what renderShiftList expects
    const normalized = rows.map(r => ({
      date: r.date,                   // "YYYY-MM-DD"
      shift: r.shift,                 // "morning" | "afternoon" | "evening" | "night"
      active: r.active ?? r.activeCount ?? 0,
      standby: r.standby ?? r.standbyCount ?? 8, // default 8 if not present
    }));

    // Clear old grid and render
    elements.grid.innerHTML = "";
    renderShiftList(normalized);
  } catch (err) {
    console.error("[loadShiftsAndRender] failed:", err);
    const msg = state.roleTab === "industrial"
      ? "There are no industrial drivers active per shift."
      : "There are no deliverers active per shift.";
    showEmpty(msg);
  }
}

// ===== Rendering: Shifts =====
function renderShiftList(list) {

  if (!list || list.length === 0) {
    const msg = state.roleTab === "industrial"
      ? "There are no industrial drivers active per shift."
      : "There are no deliverers active per shift.";
    showEmpty(msg);
    return;
  }
  hideEmpty();

  for (const sh of list) {
    const card = document.createElement("article");
    card.className = "tmmd-shift";

    const dayStr = formatDate(sh.date);
    const title = `${capitalize(sh.shift)} shift`;
    console.log(sh);
    //add api call to getActiveDeliverersForShift - standby need an api call but we dont have it in db so leave it as it is
    const active = sh.active ?? 0;
    const standby = sh.standby ?? 8;
    card.innerHTML = `
      <div class="tmmd-shift__left">
        <div class="tmmd-shift__title">${escapeHtml(dayStr)}</div>
        <div class="tmmd-shift__subtitle">${escapeHtml(title)}</div>
      </div>
      <div class="tmmd-shift__stats">
        <div class="tmmd-stat">
          <div class="label">Active</div>
          <div class="value">${active}</div>
        </div>
        <div class="tmmd-stat standby">
          <div class="label">Standby</div>
          <div class="value">${standby}</div>
        </div>
        <button class="btn small" data-view-shift="${escapeHtml(sh.date)}|${escapeHtml(sh.shift)}">View</button>
      </div>
    `;

    card.querySelector("[data-view-shift]")?.addEventListener("click", (ev) => {
      const [date, shift] = ev.currentTarget.getAttribute("data-view-shift").split("|");
      // Opens a dedicated page (to be created) showing active & standby lists
      const type = state.roleTab; // "industrial" | "deliverers"
      window.location.href = `tm-shift-drivers.html?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}&type=${encodeURIComponent(type)}`;
    });

    elements.grid.appendChild(card);
  }
}



// ===== Modal / Form =====
async function openModal(driver) {
  state.currentEditing = driver;

  // Title
  elements.title.textContent =
    `Driver: ${[driver.firstName, driver.lastName].filter(Boolean).join(" ") || (driver.uid || driver.id || "")}`;

  // System-calculated capacity fields should not be editable
  if (typeof setCapacityInputsReadonly === "function") setCapacityInputsReadonly(true);

  // ===== Fill basics from deliverers doc =====
  setVal("#f-uid", driver.uid || driver.id || "");
  setVal("#f-status", driver.status || "active");
  setVal("#f-firstName", driver.firstName || "");
  setVal("#f-lastName", driver.lastName || "");
  setVal("#f-email", driver.email || "");
  setVal("#f-phone", driver.phone || "");
  setVal("#f-driverLicenseNumber", driver.driverLicenseNumber || "");
  setVal("#f-licenseType", driver.licenseType || "");

  setVal("#f-speedKmH", numOrBlank(driver.speedKmH));
  setVal("#f-limitKg", numOrBlank(driver.limitKg));
  setVal("#f-cargoVolumeLiters", numOrBlank(driver.cargoVolumeLiters));

  const dim = driver.cargoDimensionsCm || {};
  setVal("#f-cargo-length", numOrBlank(dim.length));
  setVal("#f-cargo-width",  numOrBlank(dim.width));
  setVal("#f-cargo-height", numOrBlank(dim.height));

  const gf = driver.gridFit || {};
  setVal("#f-gridFit-small",  numOrBlank(gf.Small));
  setVal("#f-gridFit-medium", numOrBlank(gf.Medium));
  setVal("#f-gridFit-large",  numOrBlank(gf.Large));

  const rm = driver.recommendedMix || {};
  setVal("#f-recommendedMix-small",  numOrBlank(rm.Small));
  setVal("#f-recommendedMix-medium", numOrBlank(rm.Medium));
  setVal("#f-recommendedMix-large",  numOrBlank(rm.Large));

  const wc = driver.weightCap || {};
  setVal("#f-weightCap-small",  numOrBlank(wc.Small));
  setVal("#f-weightCap-medium", numOrBlank(wc.Medium));
  setVal("#f-weightCap-large",  numOrBlank(wc.Large));

  const cost = driver.cost || {};
  setVal("#f-cost-fixed",   numOrBlank(cost.fixed));
  setVal("#f-cost-perKm",   numOrBlank(cost.perKm));
  setVal("#f-cost-perStop", numOrBlank(cost.perStop));

  const veh = driver.vehicle || {};
  setVal("#f-vehicle-type",               veh.type || "");
  setVal("#f-vehicle-make",               veh.make || "");
  setVal("#f-vehicle-model",              veh.model || "");
  setVal("#f-vehicle-year",               numOrBlank(veh.year));
  setVal("#f-vehicle-registrationNumber", veh.registrationNumber || "");
  const elInsured = document.querySelector("#f-vehicle-insured");
  if (elInsured) elInsured.checked = !!veh.insured;

  setVal("#f-notes", driver.notes ?? "");

  // Show modal immediately
  elements.modal.classList.remove("hidden");
  elements.modal.setAttribute("aria-hidden", "false");

  // Render initial capacity table (from deliverers doc values)
  upsertCapacityTable({
    gridFit: driver.gridFit || {},
    recommendedMix: driver.recommendedMix || {},
    weightCap: driver.weightCap || {}
  });

// ===== Hydrate capacity from delivererSchedule (authoritative + read-only) =====
try {
  const uid = driver.uid || driver.id;
  if (!uid) throw new Error("No UID on driver.");

  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const url = `${API_BASE}/deliverers/${encodeURIComponent(uid)}/capacity`;
  const res = await fetch(url, { headers });

  console.log("[capacity] GET", url, "status:", res.status);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[capacity] non-OK response body:", text);
    showCapacityWarning(`Capacity load failed (HTTP ${res.status}).`);
    throw new Error(`Capacity HTTP ${res.status}`);
  }

  const cap = await res.json();
  console.log("[capacity] payload:", cap);

  // Validate expected fields before using
  if (!cap || typeof cap !== "object") {
    showCapacityWarning("Capacity payload malformed.");
    throw new Error("Malformed capacity payload");
  }

  const capDim = cap.cargoDimensionsCm || {};
  const capGF  = cap.gridFit || {};
  const capRM  = cap.recommendedMix || {};
  const capWC  = cap.weightCap || {};

  // Update inputs (read-only)
  if (cap.limitKg != null) setVal("#f-limitKg", cap.limitKg);
  if (cap.cargoVolumeLiters != null) setVal("#f-cargoVolumeLiters", cap.cargoVolumeLiters);

  setVal("#f-cargo-length", numOrBlank(capDim.length));
  setVal("#f-cargo-width",  numOrBlank(capDim.width));
  setVal("#f-cargo-height", numOrBlank(capDim.height));

  setVal("#f-gridFit-small",  numOrBlank(capGF.Small));
  setVal("#f-gridFit-medium", numOrBlank(capGF.Medium));
  setVal("#f-gridFit-large",  numOrBlank(capGF.Large));

  setVal("#f-recommendedMix-small",  numOrBlank(capRM.Small));
  setVal("#f-recommendedMix-medium", numOrBlank(capRM.Medium));
  setVal("#f-recommendedMix-large",  numOrBlank(capRM.Large));

  setVal("#f-weightCap-small",  numOrBlank(capWC.Small));
  setVal("#f-weightCap-medium", numOrBlank(capWC.Medium));
  setVal("#f-weightCap-large",  numOrBlank(capWC.Large));

  // Re-render the capacity table with authoritative values
  upsertCapacityTable({
    gridFit: capGF,
    recommendedMix: capRM,
    weightCap: capWC
  });
  // Allow editing ONLY: email, phone, pricing
setOnlyEditable([
  "#f-email",
  "#f-phone",
  "#f-cost-fixed",
  "#f-cost-perKm",
  "#f-cost-perStop",
]);

} catch (err) {
  console.warn("[openModal] capacity fetch failed; using fallback values.", err);
}

function showCapacityWarning(message) {
  // create a small inline warning in the Capacity fieldset once
  let box = document.querySelector("#cap-warn");
  if (!box) {
    const fieldsets = Array.from(document.querySelectorAll(".tmmd-fieldset"));
    let capacityFieldset = null;
    for (const fs of fieldsets) {
      const legend = fs.querySelector("legend");
      if (legend && /capacity/i.test(legend.textContent || "")) {
        capacityFieldset = fs; break;
      }
    }
    if (capacityFieldset) {
      box = document.createElement("div");
      box.id = "cap-warn";
      box.style.marginTop = "8px";
      box.style.fontSize = ".9rem";
      box.style.color = "#b45309"; /* amber-700 */
      box.textContent = message;
      capacityFieldset.appendChild(box);
    }
  } else {
    box.textContent = message;
  }
}

  // ===== local helpers =====
  function upsertCapacityTable(data) {
    const gf = data.gridFit || {};
    const rm = data.recommendedMix || {};
    const wc = data.weightCap || {};

    // Try to find an existing table; else create it in the "Capacity" fieldset
    let table = document.querySelector("#cap-table");
    let tbody = table ? table.querySelector("tbody") : null;

    if (!table) {
      let capacityFieldset = null;
      const fieldsets = Array.from(document.querySelectorAll(".tmmd-fieldset"));
      for (const fs of fieldsets) {
        const legend = fs.querySelector("legend");
        if (legend && /capacity/i.test(legend.textContent || "")) {
          capacityFieldset = fs;
          break;
        }
      }

      if (capacityFieldset) {
        const wrap = document.createElement("div");
        wrap.className = "capacity-table-wrap";

        const h4 = document.createElement("h4");
        h4.textContent = "Capacity Overview";
        wrap.appendChild(h4);

        table = document.createElement("table");
        table.className = "capacity-table";
        table.id = "cap-table";
        table.innerHTML = `
          <thead>
            <tr>
              <th></th>
              <th>Grid Fit</th>
              <th>Recommended</th>
              <th>W Cap</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        wrap.appendChild(table);
        capacityFieldset.appendChild(wrap);

        tbody = table.querySelector("tbody");
      }
    }

    if (!tbody) return;

    const row = (label, g, r, w) => `
      <tr>
        <td>${label}</td>
        <td>${g ?? 0}</td>
        <td>${r ?? 0}</td>
        <td>${w ?? 0}</td>
      </tr>
    `;

    tbody.innerHTML = [
      row("Small",  gf.Small,  rm.Small,  wc.Small),
      row("Medium", gf.Medium, rm.Medium, wc.Medium),
      row("Large",  gf.Large,  rm.Large,  wc.Large),
    ].join("");
  }
}




function closeModal() {
  elements.modal.classList.add("hidden");
  elements.modal.setAttribute("aria-hidden", "true");
  state.currentEditing = null;
}

async function onSubmitForm(e) {
  e.preventDefault();
  if (!state.currentEditing) return;

  const body = collectFormData();
  const id = state.currentEditing.uid || state.currentEditing.id;
  try {
    await saveDriver(state.roleTab, id, body);
    closeModal();
    await reload();
  } catch (err) {
    alert("Save failed. Please try again.");
    console.error(err);
  }
}

function collectFormData() {
  const toNumber = (v) => (v === "" || v === null || v === undefined) ? null : Number(v);

  return {
    // Contact info
    email: ($("#f-email").value || "").trim(),
    phone: ($("#f-phone").value || "").trim(),

    // Pricing
    cost: {
      fixed: toNumber($("#f-cost-fixed").value),
      perKm: toNumber($("#f-cost-perKm").value),
      perStop: toNumber($("#f-cost-perStop").value),
    },
  };
}


// ===== Utilities =====
function showEmpty(msg) {
  elements.grid.innerHTML = "";
  elements.empty.classList.remove("hidden");
  elements.empty.textContent = msg;
}
function hideEmpty() {
  elements.empty.classList.add("hidden");
}
function renderStars(filled, total) {
  let s = "";
  for (let i=0;i<total;i++){
    s += (i<filled ? "★" : "☆");
  }
  return s;
}
function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function numOrBlank(n) { return (n === null || n === undefined) ? "" : n; }
function formatDate(iso) {
  // accept "YYYY-MM-DD" or ISO timestamp
  const d = iso?.length <= 10 ? new Date(iso + "T00:00:00") : new Date(iso);
  return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric", year:"numeric" });
}
function capitalize(s){ return (s||"").charAt(0).toUpperCase()+ (s||"").slice(1); }

function setCapacityInputsReadonly(isReadonly = true) {
  const ids = [
    "#f-gridFit-small", "#f-gridFit-medium", "#f-gridFit-large",
    "#f-recommendedMix-small", "#f-recommendedMix-medium", "#f-recommendedMix-large",
    "#f-weightCap-small", "#f-weightCap-medium", "#f-weightCap-large"
  ];
  ids.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      el.readOnly = isReadonly;    // prevents editing
      el.disabled = isReadonly;    // also greys it out / blocks tabbing
    }
  });
}
function setVal(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.value = value ?? "";
}

function setOnlyEditable(selectors = []) {
  // disable everything by default
  const controls = Array.from(elements.form.querySelectorAll(
    'input, select, textarea, button'
  ));
  controls.forEach(el => {
    // don't disable the Close/Save buttons
    if (el.id === "modal-cancel" || el.id === "modal-save") return;
    if (el.type === "checkbox") el.disabled = true;
    else el.readOnly = true;
    el.classList.add("is-readonly");
  });

  // re-enable allowed fields
  selectors.forEach(sel => {
    const el = elements.form.querySelector(sel);
    if (!el) return;
    if (el.type === "checkbox") el.disabled = false;
    else el.readOnly = false;
    el.classList.remove("is-readonly");
  });
}




/*
// inside renderDriverCards, after you set card.innerHTML = ...
const perfBtn = card.querySelector(".tmmd-card__actions .btn.primary.small:not([data-view])");
if (perfBtn) {
  perfBtn.addEventListener("click", async () => {
    try {
      const id = d.uid || d.id;
      const headers = { "Content-Type": "application/json" };
      if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
      const res = await fetch(`${API_BASE}/deliverers/${encodeURIComponent(id)}/performance`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const kpi = await res.json();

      // Simple display — use your existing modal for consistency
      elements.title.textContent = `Performance · ${d.firstName || ""} ${d.lastName || ""}`.trim();
      $("#driver-form").innerHTML = `
        <div class="tmmd-fieldset">
          <legend>Last ${kpi?.period?.days ?? 7} days</legend>
          <div class="form-grid">
            <label>On-time %
              <input type="text" value="${Math.round((kpi.onTimePct ?? 0) * 100)}%" readonly />
            </label>
            <label>Avg stops/route
              <input type="text" value="${kpi.avgStopsPerRoute ?? 0}" readonly />
            </label>
            <label>Avg km/route
              <input type="text" value="${kpi.avgKmPerRoute ?? 0}" readonly />
            </label>
            <label>Utilization %
              <input type="text" value="${Math.round((kpi.utilizationPct ?? 0) * 100)}%" readonly />
            </label>
            <label>Completed routes (7d)
              <input type="text" value="${kpi.completedRoutes7d ?? 0}" readonly />
            </label>
            <label>Last active shift
              <input type="text" value="${kpi.lastActiveShift ? `${kpi.lastActiveShift.date} · ${kpi.lastActiveShift.shift}` : '—'}" readonly />
            </label>
          </div>
        </div>
        <div class="tmmd-modal__actions">
          <button type="button" class="btn ghost" id="modal-cancel">Close</button>
        </div>
      `;
      elements.modal.classList.remove("hidden");
      elements.modal.setAttribute("aria-hidden", "false");
      $("#modal-cancel").addEventListener("click", () => {
        elements.modal.classList.add("hidden");
        elements.modal.setAttribute("aria-hidden", "true");
      });
    } catch (err) {
      console.error(err);
      alert("Failed to load performance.");
    }
  });
}
  */
