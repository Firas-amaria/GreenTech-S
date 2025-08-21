// tm-shift-orders.js
// Orders table + multi-route planner UI. Uses routesCalculations for maps and planning.
// Departure time now auto-bumps to NEXT DAY if the selected date is already in the past.

import { auth, onAuthStateChanged } from "./firebase-init.js";
import { ITEM_PACK } from "./data/item-packing-meta.js";
import { activeDeliverers } from "./data/activeDeliverers.mock.js";
import { LOGISTIC_CENTERS } from "./data/logistics-centers.mock.js";
import { PACKAGE_MAX_KG } from "./data/packages-std-sizes.js";

import {
  initMapsLoader,
  openRouteMap,
  closeRouteMap,
  computePackingForOrder,
  normalizeOrders,
  buildRoutePlans,
  buildDrivingOptions,
  getEffectiveDepartureInfo,
  SHIFT_DEPART_HHMM,
  SHIFT_END_HHMM
} from "./routesCalculations.js";

const API_BASE = "http://localhost:4000";
const LC = LOGISTIC_CENTERS["LC-1"]; // supports { alt (lat) , lng } or { lat, lng }
const ORIGIN = { lat: (LC.lat ?? LC.alt), lng: LC.lng };

const $ = (sel) => document.querySelector(sel);

const shiftInfoEl   = $("#shift-info");
const ordersTbody   = $("#orders-table tbody");
const sortSelect    = $("#summary-sort");
const ordersSection = $("#orders-section");

// Inject routing UI + modal
injectRoutingUI();

// State
let currentUser = null;
let urlShift = null;
let urlDate  = null;
let orders = [];

// Load Maps for this page (map helpers are inside routesCalculations.js)
initMapsLoader({ API_BASE });

// Close map on global click
document.body.addEventListener("click", (e) => {
  if (e.target?.hasAttribute?.("data-close-modal")) closeRouteMap();
});

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  urlShift = params.get("shift");
  urlDate  = params.get("date");
  if (!urlShift || !urlDate) {
    alert("Missing shift or date in URL");
    return;
  }
  if (urlShift === "morning (test)") urlShift = "morning";

  const { usedDateStr, bumped } = getEffectiveDepartureInfo(urlDate, SHIFT_DEPART_HHMM);
  const bumpedNote = bumped ? ` (using ${usedDateStr})` : "";
  shiftInfoEl.textContent = `${urlShift} shift on ${urlDate}${bumpedNote}`;

  await loadOrders();

  sortSelect.addEventListener("change", (e) => {
    if (e.target.value === "location") renderSummaryByLocation(orders);
    else renderOrdersAsRows(orders);
  });

  $("#btn-compute-routing").addEventListener("click", onComputeRoutes);
});

// Fetch orders
async function loadOrders() {
  ordersTbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
  try {
    const token = await currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/api/orders/getOrdersForShift?shift=${encodeURIComponent(urlShift)}&date=${encodeURIComponent(urlDate)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    orders = Array.isArray(data) ? data : [];
    renderOrdersAsRows(orders);
  } catch (err) {
    console.error("Error loading orders:", err);
    ordersTbody.innerHTML = "<tr><td colspan='5'>Error loading orders.</td></tr>";
  }
}

// Render orders table
function renderOrdersAsRows(data) {
  if (!data.length) {
    ordersTbody.innerHTML = "<tr><td colspan='5'>No orders for this shift.</td></tr>";
    return;
  }

  ordersTbody.innerHTML = "";
  data.forEach(order => {
    const orderId = order.id;
    const d = order.data || order;
    const shortId = String(orderId || "").split("_").pop();
    const addrObj = d.deliveryAddress || d;
    const addr = addrObj.address || "-";
    const totalKg = d.totalOrderWeightKg ?? "-";

    const pack = computePackingForOrder(d, ITEM_PACK);
    const packagesText = pack.summary;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(shortId)}</td>
      <td>${esc(addr)}</td>
      <td>${esc(totalKg)} kg</td>
      <td>${esc(packagesText)}</td>
      <td class="arrow-toggle" style="cursor:pointer" title="Show items">&#9660;</td>
    `;

    const detailsTr = document.createElement("tr");
    detailsTr.style.display = "none";
    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 5;

    const itemsList = (d.items || []).map(it =>
      `<div>&bull; ${esc(it.itemName)}: ${Number(it.quantity || 0)} kg from ${esc(it.sourceFarmName || "")}</div>`
    ).join("");

    const boxList = pack.boxes?.length
      ? `<div class="pack-summary"><strong>Boxes:</strong> ${esc(packagesText)}</div>` +
        `<ul class="pack-breakdown">` +
        pack.boxes.map(b => {
          const meta = [];
          if (b.estWeightKg) meta.push(`${b.estWeightKg} kg`);
          if (b.estFillLiters) meta.push(`${b.estFillLiters} L`);
          const content = (b.contents || []).map(c => `${c.kg} kg ${c.itemId}`).join(", ");
          return `<li><strong>${b.boxType}</strong>${meta.length ? ` <em>(${meta.join(", ")})</em>` : ""}${content ? ` — ${esc(content)}` : ""}</li>`;
        }).join("") +
        `</ul>`
      : "";

    detailsTd.innerHTML = `<div class="order-items">${itemsList || "No items listed."}</div>${boxList}`;
    detailsTr.appendChild(detailsTd);

    const arrow = tr.querySelector(".arrow-toggle");
    arrow.addEventListener("click", () => {
      const hidden = detailsTr.style.display === "none";
      detailsTr.style.display = hidden ? "table-row" : "none";
      arrow.innerHTML = hidden ? "&#9650;" : "&#9660;";
      arrow.classList.toggle("open", hidden);
    });

    ordersTbody.appendChild(tr);
    ordersTbody.appendChild(detailsTr);
  });
}

function renderSummaryByLocation(data) {
  if (!data.length) {
    ordersTbody.innerHTML = "<tr><td colspan='4'>No orders for this shift.</td></tr>";
    return;
  }
  const areaMap = {};
  data.forEach(o => {
    const d = o.data || o;
    const addr = (d.deliveryAddress || d).address || "-";
    const area = extractArea(addr);
    if (!areaMap[area]) areaMap[area] = { totalKg: 0, orders: [] };
    areaMap[area].totalKg += (d.totalOrderWeightKg || 0);
    areaMap[area].orders.push({
      id: o.id.split("_").pop(),
      address: addr,
      totalKg: d.totalOrderWeightKg || 0
    });
  });

  ordersTbody.innerHTML = "";
  for (const area in areaMap) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="3"><strong>${esc(area)}</strong> — Orders: ${areaMap[area].orders.length}, Total: ${areaMap[area].totalKg} kg</td>
      <td class="arrow-toggle" style="cursor:pointer">&#9660;</td>
    `;
    const detailsTr = document.createElement("tr");
    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 4;
    detailsTd.style.display = "none";
    detailsTd.innerHTML = `
      <table style="width:100%; border-collapse:collapse; margin-top:5px;">
        <thead><tr><th>Order ID</th><th>Address</th><th>Total kg</th></tr></thead>
        <tbody>
          ${areaMap[area].orders.map(o => `
            <tr>
              <td>${esc(o.id)}</td>
              <td>${esc(extractHouseNumber(o.address))}</td>
              <td>${Number(o.totalKg)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    `;
    detailsTr.appendChild(detailsTd);

    tr.querySelector(".arrow-toggle").addEventListener("click", () => {
      const hidden = detailsTd.style.display === "none";
      detailsTd.style.display = hidden ? "table-cell" : "none";
      tr.querySelector(".arrow-toggle").innerHTML = hidden ? "&#9650;" : "&#9660;";
      tr.querySelector(".arrow-toggle").classList.toggle("open", hidden);
    });

    ordersTbody.appendChild(tr);
    ordersTbody.appendChild(detailsTr);
  }
}

// Compute multi-route plans and render cards
async function onComputeRoutes() {
  if (!orders.length) return alert("No orders to compute.");

  // Normalize (S/M/L + weight) using your ITEM_PACK
  const norm = normalizeOrders(orders, ITEM_PACK, PACKAGE_MAX_KG);

  // Build plans (1..N). Internally uses FUTURE departure if needed.
  const plans = await buildRoutePlans({
    dateStr: urlDate,
    origin: ORIGIN,
    orders: norm,
    deliverers: activeDeliverers,
  });

  renderRoutePlans(plans);
}

function renderRoutePlans(plans) {
  const wrap = $("#routes-list");
  wrap.innerHTML = "";

  if (!plans.length) {
    wrap.innerHTML = `<div class="card"><div class="card-title">No route could be built.</div></div>`;
    return;
  }

  plans.forEach((p, idx) => {
    const totalPk = p.totals.Small + p.totals.Medium + p.totals.Large;
    const fits = p.fitsMorningWindow;

    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "12px";
    card.innerHTML = `
      <div class="card-title">${esc(p.label || `Route ${idx+1}`)}</div>
      <div class="kv">
        <span>Orders: ${p.stops.length}</span>
        <span>Packages: ${totalPk} (S:${p.totals.Small}/M:${p.totals.Medium}/L:${p.totals.Large})</span>
        <span>Travel: ${minsToText(p.travelMin)}</span>
        <span>Service: ${minsToText(p.serviceMin)}</span>
        <span>Total: <strong>${minsToText(p.totalMin)}</strong></span>
      </div>
      <div class="kv" style="margin-top:6px;">
        <span class="badge">ETD ${fmtDateTime(p.startTime)}</span>
        <span class="badge">Latest ${SHIFT_END_HHMM}</span>
        <span class="badge ${fits ? "" : "danger"}">${fits ? "Within window" : "Exceeds 07:00"}</span>
        <span class="badge">ETA ${fmtDateTime(p.endTime)}</span>
      </div>

      <div class="kv" style="margin-top:8px; display:block;">
        <div class="muted" style="margin-bottom:6px;">Stops & ETAs</div>
        <ol class="stop-list">
          ${p.stops.map(s => `
            <li>
              <strong>${s.etaLabel}</strong> — ${esc(s.address || "")}
              <small class="muted"> (drive ${Math.round(s.legTravelMin)}m + stop ${Math.round(s.stopServiceMin)}m)</small>
            </li>`).join("")}
        </ol>
      </div>

      <div class="card-actions" style="gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn" data-map="${idx}">Show on map</button>
        <div class="inline">
          <label class="subtle" for="deliv-${idx}">Deliverer</label>
          <select id="deliv-${idx}"></select>
          <button class="btn primary" data-assign="${idx}">Assign</button>
        </div>
      </div>
    `;

    // Populate deliverer dropdown (best-first)
    const sel = card.querySelector(`#deliv-${idx}`);
    if (!p.delivererOptions?.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No deliverer fits";
      sel.appendChild(opt);
    } else {
      p.delivererOptions.forEach(id => {
        const d = activeDeliverers.find(x => x.id === id);
        const cap = d?.capacity?.maxPackages || { Small:0, Medium:0, Large:0 };
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${d?.name || id} — S:${cap.Small}/M:${cap.Medium}/L:${cap.Large} — ${d?.limitKg || 0}kg`;
        sel.appendChild(opt);
      });
      if (p.bestDelivererId) sel.value = p.bestDelivererId;
    }

    // Show on map (keep the chunk order, no re-optimize)
    card.querySelector(`[data-map="${idx}"]`).addEventListener("click", () => {
      const waypoints = p.waypointsOrdered.map(x =>
        Number.isFinite(x.lat) && Number.isFinite(x.lng) ? { lat:x.lat, lng:x.lng } : x.address
      );
      openRouteMap({
        origin: ORIGIN,
        waypoints,
        optimizeWaypoints: false,
        drivingOptions: buildDrivingOptions(urlDate), // uses FUTURE date if needed
        onResult: () => {}
      });
    });

    // Assign (placeholder)
    card.querySelector(`[data-assign="${idx}"]`).addEventListener("click", async () => {
      const delivererId = sel.value;
      if (!delivererId) return alert("No deliverer selected.");

      // Placeholder: wire to your backend if/when ready
      // const token = await currentUser.getIdToken();
      // await fetch(`${API_BASE}/api/transportation/assign-route`, { ... })

      alert(`Assigned ${delivererId} to orders: ${p.waypointsOrdered.map(o => o.id.split("_").pop()).join(", ")}`);
    });

    wrap.appendChild(card);
  });
}

// Inject routing assistant section + map modal
function injectRoutingUI() {
  const section = document.createElement("section");
  section.className = "section";
  section.id = "routing-assistant";
  section.innerHTML = `
    <div class="section-header">
      <h2>Routing Assistant</h2>
      <div class="section-actions">
        <button class="btn" id="btn-compute-routing">Compute Routes</button>
      </div>
    </div>

    <div id="routes-list" class="card-grid"></div>

    <!-- Map modal -->
    <div class="modal" id="route-modal" style="display:none;">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-card" style="width:min(1100px,95vw);">
        <div class="modal-header">
          <h3>Route</h3>
          <button class="icon-btn" title="Close" data-close-modal>✕</button>
        </div>
        <div class="modal-body">
          <div id="route-map" style="width:100%; height:480px;"></div>
          <div id="route-info" class="kv" style="margin-top:10px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn" data-close-modal>Close</button>
        </div>
      </div>
    </div>
  `;
  ordersSection.insertAdjacentElement("afterend", section);
}

// Small helpers
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[c]);
}
function extractArea(address){const p=String(address||"").split(",");if(p.length>=3)return p[1].trim();if(p.length===2)return p[0].trim();return String(address||"").trim();}
function extractHouseNumber(address){const p=String(address||"").split(",");return p.length?p[0].trim():String(address||"").trim();}
function minsToText(min){const h=Math.floor(min/60);const m=Math.round(min%60);return h<=0?`${m} min`:`${h} hr ${m} min`;}
function fmtDateTime(dt){
  try{
    const d = new Date(dt);
    const time = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    const date = d.toLocaleDateString(undefined,{month:"short",day:"2-digit"});
    return `${time} (${date})`;
  }catch{ return "—"; }
}
