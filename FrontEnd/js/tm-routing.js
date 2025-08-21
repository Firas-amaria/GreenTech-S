//backup for the order summarry page

// tm-shift-orders.js
// Auth + shift orders table + "Compute Routes" UI.
// Uses your /api/maps/google-maps-script loader + route.js (map modal),
// and routesCalculations.js to produce one or more neat route cards.

import { auth, onAuthStateChanged } from "./firebase-init.js";
import { openRouteMap, closeRouteMap, initRouteMap } from "./route.js";
import {
  normalizeOrders,
  buildRoutePlans,
  buildDrivingOptions,
  SHIFT_DEPART_HHMM,
  SHIFT_END_HHMM,
} from "./routesCalculations.js";

import { activeDeliverers } from "./data/activeDeliverers.mock.js";
import { LOGISTIC_CENTERS } from "./data/logistics-centers.mock.js";
import { ITEM_PACK } from "./item-packing-meta.js"; // for your per-order packing calc

const API_BASE = "http://localhost:4000";
const LC = LOGISTIC_CENTERS["LC-1"]; // { alt: lat, lng }

const $ = (sel) => document.querySelector(sel);

const shiftInfoEl = $("#shift-info");
const ordersTbody = $("#orders-table tbody");
const sortSelect  = $("#summary-sort");
const ordersSection = $("#orders-section");

// ===== Inject Routing UI + Map modal =====
injectRoutingUI();

const btnCompute  = $("#btn-compute-routing");
const routesWrap  = $("#routes-list");
document.body.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close-modal")) closeRouteMap();
});

// ===== Maps loader via backend =====
async function loadGoogleMapsScript() {
  try {
    const res = await fetch(`${API_BASE}/api/maps/google-maps-script`);
    const data = await res.json();
    window.initMapsGlobal = function() { initRouteMap(); };
    const s = document.createElement("script");
    s.src = data.scriptUrl + "&language=en&v=weekly&loading=async&callback=initMapsGlobal";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  } catch (err) {
    console.error("Failed to load Google Maps script", err);
  }
}
loadGoogleMapsScript();

// ===== State =====
let currentUser = null;
let urlShift = null;
let urlDate  = null;
let orders = []; // API payload

// ===== Auth/init =====
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

  shiftInfoEl.textContent = `${urlShift} shift on ${urlDate}`;
  await loadOrders();

  sortSelect.addEventListener("change", (e) => {
    if (e.target.value === "location") renderSummaryByLocation(orders);
    else renderOrdersAsRows(orders);
  });

  btnCompute.addEventListener("click", onComputeRoutes);
});

// ===== API =====
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

// ===== Render orders table (keeps your package calc “as is”) =====
function renderOrdersAsRows(data) {
  if (!data.length) {
    ordersTbody.innerHTML = "<tr><td colspan='5'>No orders for this shift.</td></tr>";
    return;
  }

  ordersTbody.innerHTML = "";
  data.forEach(order => {
    const orderId   = order.id;
    const d         = order.data || order;
    const shortId   = String(orderId || "").split("_").pop();
    const addrObj   = d.deliveryAddress || d;
    const addr      = addrObj.address || "-";
    const totalKg   = d.totalOrderWeightKg ?? "-";

    const packing   = computePackingForOrder(d); // uses ITEM_PACK
    const packagesText = packing.summary;

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

    const boxList = packing.boxes?.length
      ? `<div class="pack-summary"><strong>Boxes:</strong> ${esc(packagesText)}</div>` +
        `<ul class="pack-breakdown">` +
        packing.boxes.map(b => {
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

// ===== Compute Multiple Routes =====
async function onComputeRoutes() {
  // Normalize orders with your packing meta
  const norm = normalizeOrders(orders, (data) => computePackingForOrder(data));

  // Ensure Maps is present before calling route calculations (uses DirectionsService)
  if (!(window.google && window.google.maps)) {
    return alert("Google Maps not ready yet. Please try again in a moment.");
  }

  // Build plans (may be Route A, Route B, ...)
  const origin = { lat: LC.alt, lng: LC.lng };
  const plans = await buildRoutePlans({
    dateStr: urlDate,
    origin,
    orders: norm,
    deliverers: activeDeliverers,
  });

  renderRoutePlans(plans);
}

function renderRoutePlans(plans) {
  routesWrap.innerHTML = "";

  if (!plans.length) {
    routesWrap.innerHTML = `<div class="card"><div class="card-title">No route could be built.</div></div>`;
    return;
  }

  plans.forEach((p, idx) => {
    const totalPk = p.totals.Small + p.totals.Medium + p.totals.Large;
    const fits = p.fitsMorningWindow;
    const start = SHIFT_DEPART_HHMM;
    const end   = p.endTime ? timeFmt(p.endTime) : "—";

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
        <span class="badge">ETD ${start} → ETA ${end}</span>
        <span class="badge ${fits ? "" : "danger"}">${fits ? "Within window" : "Exceeds 07:00"}</span>
      </div>

      <div class="kv" style="margin-top:6px;">
        <label class="subtle" for="deliv-${idx}">Best Deliverer</label>
        <select id="deliv-${idx}" data-route-index="${idx}"></select>
        <button class="btn" data-show-map="${idx}">Show on Map</button>
        <button class="btn primary" data-assign="${idx}">Assign</button>
      </div>

      <div class="kv" style="margin-top:8px; display:block;">
        <div class="muted" style="margin-bottom:6px;">Stops & ETAs</div>
        <ol class="stop-list" style="padding-left:18px; margin:0;">
          ${p.stops.map(s => `
            <li>
              <span><strong>${s.etaLabel}</strong> — ${esc(s.address || "")}</span>
              <small class="muted"> (leg ${Math.round(s.legTravelMin)} min + stop ${Math.round(s.stopServiceMin)} min)</small>
            </li>
          `).join("")}
        </ol>
      </div>
    `;

    // Fill deliverers dropdown
    const dd = card.querySelector(`#deliv-${idx}`);
    if (!p.delivererOptions?.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No deliverer fits";
      dd.appendChild(opt);
    } else {
      p.delivererOptions.forEach(id => {
        const d = activeDeliverers.find(x => x.id === id);
        const cap = d?.capacity?.maxPackages || { Small:0, Medium:0, Large:0 };
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${d?.name || id} — S:${cap.Small}/M:${cap.Medium}/L:${cap.Large} — ${d?.limitKg || 0}kg`;
        dd.appendChild(opt);
      });
      if (p.bestDelivererId) dd.value = p.bestDelivererId;
    }

    // Button handlers
    card.querySelector("[data-show-map]").addEventListener("click", () => {
      const waypoints = p.waypointsOrdered.map(x =>
        Number.isFinite(x.lat) && Number.isFinite(x.lng) ? { lat:x.lat, lng:x.lng } : x.address
      );
      openRouteMap({
        origin: { lat: LC.alt, lng: LC.lng },
        destination: waypoints[waypoints.length - 1] || { lat: LC.alt, lng: LC.lng },
        waypoints,
        optimizeWaypoints: false, // already optimized
        drivingOptions: buildDrivingOptions(urlDate),
        onResult: () => {}
      });
    });

    card.querySelector("[data-assign]").addEventListener("click", async () => {
      const delivId = dd.value;
      if (!delivId) return alert("No deliverer selected.");
      const orderIds = p.waypointsOrdered.map(o => o.id);

      try {
        const token = await currentUser.getIdToken();
        // TODO: Implement your real endpoint if needed
        // await fetch(`${API_BASE}/api/transportation/assign-route`, {
        //   method: "POST",
        //   headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
        //   body: JSON.stringify({
        //     date: urlDate,
        //     shift: urlShift,
        //     delivererId: delivId,
        //     orderIds,
        //     startTime: `${urlDate}T${SHIFT_DEPART_HHMM}:00`,
        //     latestEndTime: `${urlDate}T${SHIFT_END_HHMM}:00`,
        //   })
        // });
        alert(`Assigned ${delivId} to orders: ${orderIds.join(", ")}`);
      } catch (e) {
        console.error("Assign failed:", e);
        alert("Assignment failed. Check console.");
      }
    });

    routesWrap.appendChild(card);
  });
}

// ===== Your per-order packing (kept) =====
function buildBox({ key, l, w, h, maxWeightKg, headroomPct = 0.15 }) {
  const liters = (l * w * h) / 1000;
  return { key, innerDimsCm:{ l,w,h }, headroomPct, usableLiters: liters * (1 - headroomPct), maxWeightKg };
}
const BOXES = [
  buildBox({ key: "Small",  l: 20, w: 20, h: 20, maxWeightKg: 6 }),
  buildBox({ key: "Medium", l: 30, w: 30, h: 30, maxWeightKg: 12 }),
  buildBox({ key: "Large",  l: 60, w: 60, h: 60, maxWeightKg: 25 }),
];
function litersFor(itemId, kg) {
  const meta = ITEM_PACK[itemId];
  if (!meta?.bulkDensityKgPerL) throw new Error(`Missing packing meta for ${itemId}`);
  return kg / meta.bulkDensityKgPerL;
}
const fragRank = f => (f === "fragile" ? 0 : f === "normal" ? 1 : 2);
function canPlace(boxType, boxContents, addLine) {
  const meta = ITEM_PACK[addLine.itemId] || {};
  const totalKg = boxContents.reduce((s,c)=>s+c.kg,0) + addLine.kg;
  const totalL  = boxContents.reduce((s,c)=>s+c.liters,0) + addLine.liters;
  if (totalKg > boxType.maxWeightKg) return false;
  if (totalL  > boxType.usableLiters) return false;
  const kgOfThisItem = boxContents.filter(c => c.itemId === addLine.itemId)
                                  .reduce((s,c)=>s+c.kg,0) + addLine.kg;
  if (meta.maxWeightPerBoxKg && kgOfThisItem > meta.maxWeightPerBoxKg) return false;
  if (meta.minBoxType) {
    const order = ["Small","Medium","Large"];
    if (order.indexOf(boxType.key) < order.indexOf(meta.minBoxType)) return false;
  }
  if (meta.allowMixing === false) {
    if (boxContents.length && boxContents.some(c => c.itemId !== addLine.itemId)) return false;
  }
  return true;
}
function packOrder(order) {
  const pieces = (order.items || []).map(it => {
    const kg = Number(it.quantity || 0);
    const liters = litersFor(it.itemId, kg);
    const meta = ITEM_PACK[it.itemId] || {};
    return { itemId: it.itemId, kg, liters, fragility: meta.fragility || "normal" };
  }).sort((a,b) => {
    const f = fragRank(a.fragility) - fragRank(b.fragility);
    if (f !== 0) return f;
    return b.liters - a.liters;
  });

  const boxes = [];
  for (const p of pieces) {
    let placed = false;
    for (const box of boxes) {
      if (canPlace(box.type, box.contents, p)) { box.contents.push(p); placed = true; break; }
    }
    if (placed) continue;
    for (const bt of BOXES) {
      if (canPlace(bt, [], p)) { boxes.push({ type: bt, contents: [p] }); placed = true; break; }
    }
    if (!placed) throw new Error(`Cannot place ${p.itemId} with current rules/boxes`);
  }

  return boxes.map((b, i) => ({
    boxNo: i + 1,
    boxType: b.type.key,
    estFillLiters: +b.contents.reduce((s,c)=>s+c.liters,0).toFixed(2),
    estWeightKg:   +b.contents.reduce((s,c)=>s+c.kg,0).toFixed(2),
    contents: b.contents.map(c => ({ itemId: c.itemId, kg: c.kg }))
  }));
}
function formatBoxSummary(boxes) {
  const counts = boxes.reduce((acc, b) => {
    const key = b.boxType || b.type?.key || b.key;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const order = ["Small","Medium","Large"];
  const parts = order.filter(k => counts[k]).map(k => `${counts[k]}×${k}`);
  return parts.join(" + ") || "—";
}
function computePackingForOrder(orderData) {
  try {
    const boxes = packOrder({
      items: (orderData.items || []).map(i => ({ itemId: i.itemId, quantity: i.quantity }))
    });
    return { summary: formatBoxSummary(boxes), boxes };
  } catch {
    return { summary: "—", boxes: [] };
  }
}

// ===== UI Helpers =====
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

    <div id="routes-list" class="stack"></div>

    <!-- Map modal used by route.js -->
    <div class="modal" id="route-modal" style="display:none;">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-card" style="width:min(1100px,95vw);">
        <div class="modal-header">
          <h3>Optimized Route</h3>
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

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
  })[c]);
}
function extractArea(address) {
  const parts = String(address || "").split(",");
  if (parts.length >= 3) return parts[1].trim();
  if (parts.length === 2) return parts[0].trim();
  return String(address || "").trim();
}
function extractHouseNumber(address) {
  const parts = String(address || "").split(",");
  return parts.length ? parts[0].trim() : String(address || "").trim();
}
function minsToText(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m} min`;
  return `${h} hr ${m} min`;
}
function timeFmt(dt) {
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
