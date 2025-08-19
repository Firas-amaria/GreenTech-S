import { auth, onAuthStateChanged } from "./firebase-init.js";

const API_BASE = "http://localhost:4000";
let orders = []; // global for toggling modes

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  const date = params.get("date");

  if (!shift || !date) {
    alert("Missing shift or date in URL");
    return;
  }

  document.getElementById("shift-info").innerText = `${shift} shift on ${date}`;
  await loadOrders(user, shift, date);

  // Listen for summarize dropdown
  document.getElementById("summary-sort").addEventListener("change", (e) => {
    if (e.target.value === "location") {
      renderSummaryByLocation(orders);
    } else {
      renderOrdersAsRows(orders);
    }
  });
});

async function loadOrders(user, shift, date) {
  const tbody = document.querySelector("#orders-table tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
  console.log("Loading orders for shift:", shift, "on date:", date);
//for the testing 
if (shift === "morning (test)") {
  console.log("Shift is exactly 'morning (test)'");
  shift="morning";
}
  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/orders/getOrdersForShift?shift=${shift}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Orders for shift:", data);

    orders = data;
    renderOrdersAsRows(orders);

  } catch (err) {
    console.error("Error loading orders:", err);
    tbody.innerHTML = "<tr><td colspan='5'>Error loading orders. Check console.</td></tr>";
  }
}


/*
function renderOrdersAsRows(data) {
  const tbody = document.querySelector("#orders-table tbody");
  if (!data.length) {
    tbody.innerHTML = "<tr><td colspan='5'>No orders for this shift.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach(order => {
    const orderId = order.id;
    const orderData = order.data;

    const shortOrderId = orderId.split("_").pop();
    const deliveryAddress = orderData.deliveryAddress.address || "-";
    const totalWeight = orderData.totalOrderWeightKg || "-";
    const totalValue = orderData.totalOrderValue || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${shortOrderId}</td>
      <td>${deliveryAddress}</td>
      <td>${totalWeight} kg</td>
      <td class="arrow-toggle">&#9660;</td>
    `;

    const itemsTr = document.createElement("tr");
    const itemsTd = document.createElement("td");
    itemsTd.colSpan = 5;
    itemsTd.style.display = "none";

    if (orderData.items && orderData.items.length > 0) {
      const itemsList = orderData.items.map(it =>
        `<div>&bull; ${it.itemName}: ${it.quantity} kg from ${it.sourceFarmName}</div>`
      ).join("");
      itemsTd.innerHTML = itemsList;
    } else {
      itemsTd.innerHTML = "<div>No items listed.</div>";
    }

    itemsTr.appendChild(itemsTd);

    tr.querySelector(".arrow-toggle").addEventListener("click", () => {
      const isVisible = itemsTd.style.display === "table-cell";
      itemsTd.style.display = isVisible ? "none" : "table-cell";
      tr.querySelector(".arrow-toggle").innerHTML = isVisible ? "&#9660;" : "&#9650;";
      tr.querySelector(".arrow-toggle").classList.toggle("open", !isVisible);
    });

    tbody.appendChild(tr);
    tbody.appendChild(itemsTr);
  });
}
*/
function renderSummaryByLocation(data) {
  const tbody = document.querySelector("#orders-table tbody");
  if (!data.length) {
    tbody.innerHTML = "<tr><td colspan='4'>No orders for this shift.</td></tr>";
    return;
  }

  const areaMap = {};
  data.forEach(order => {
    const address = order.data.deliveryAddress || "-";
    const area = extractArea(address);
    if (!areaMap[area]) {
      areaMap[area] = { totalKg: 0, orders: [] };
    }
    areaMap[area].totalKg += order.data.totalOrderWeightKg || 0;
    areaMap[area].orders.push({
      id: order.id.split("_").pop(),
      address,
      totalKg: order.data.totalOrderWeightKg || 0
    });
  });

  tbody.innerHTML = "";
  for (const area in areaMap) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="3">
        <strong>${area}</strong> - Orders: ${areaMap[area].orders.length}, Total: ${areaMap[area].totalKg} kg
      </td>
      <td class="arrow-toggle">&#9660;</td>
    `;

    const ordersTr = document.createElement("tr");
    const ordersTd = document.createElement("td");
    ordersTd.colSpan = 4;
    ordersTd.style.display = "none";

    const ordersTable = `
      <table style="width:100%; border-collapse: collapse; margin-top:5px;">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Address</th>
            <th>Total kg</th>
          </tr>
        </thead>
        <tbody>
          ${areaMap[area].orders.map(o => `
            <tr>
              <td>${o.id}</td>
              <td>${extractHouseNumber(o.address)}</td>
              <td>${o.totalKg}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    ordersTd.innerHTML = ordersTable;
    ordersTr.appendChild(ordersTd);

    tr.querySelector(".arrow-toggle").addEventListener("click", () => {
      const isVisible = ordersTd.style.display === "table-cell";
      ordersTd.style.display = isVisible ? "none" : "table-cell";
      tr.querySelector(".arrow-toggle").innerHTML = isVisible ? "&#9660;" : "&#9650;";
      tr.querySelector(".arrow-toggle").classList.toggle("open", !isVisible);
    });

    tbody.appendChild(tr);
    tbody.appendChild(ordersTr);
  }
}

function extractArea(address) {
  const parts = address.split(",");
  if (parts.length >= 3) return parts[1].trim();
  if (parts.length === 2) return parts[0].trim();
  return address.trim();
}

function extractHouseNumber(address) {
  const parts = address.split(",");
  return parts.length ? parts[0].trim() : address.trim();
}


/*for orders pacakages */
// ---- Box catalog ----
function buildBox({ key, l, w, h, maxWeightKg, headroomPct = 0.15 }) {
  const liters = (l * w * h) / 1000;
  return {
    key,
    innerDimsCm: { l, w, h },
    headroomPct,
    usableLiters: liters * (1 - headroomPct),
    maxWeightKg
  };
}

const BOXES = [
  buildBox({ key: "Small",  l: 20, w: 20, h: 20, maxWeightKg: 6 }),
  buildBox({ key: "Medium", l: 30, w: 30, h: 30, maxWeightKg: 12 }),
  buildBox({ key: "Large",  l: 60, w: 60, h: 60, maxWeightKg: 25 }),
];

// ---- Example item packing profiles (load these from Firestore in prod) ----
const ITEM_PACK = {
  "FRT-001": { name: "Apple Fuji",          bulkDensityKgPerL: 0.70, fragility: "normal", maxWeightPerBoxKg: 10, allowMixing: true,  minBoxType: "Small" },
  "FRT-005": { name: "Strawberry Albion",   bulkDensityKgPerL: 0.35, fragility: "fragile", maxWeightPerBoxKg: 2,  allowMixing: false, minBoxType: "Small" },
};

// ---- Helpers ----
function litersFor(itemId, kg) {
  const meta = ITEM_PACK[itemId];
  if (!meta?.bulkDensityKgPerL) throw new Error(`Missing packing meta for ${itemId}`);
  return kg / meta.bulkDensityKgPerL;
}
const fragRank = f => (f === "fragile" ? 0 : f === "normal" ? 1 : 2);

// Can we place this line item into an existing box?
function canPlace(boxType, boxContents, addLine) {
  const meta = ITEM_PACK[addLine.itemId] || {};
  const totalKg = boxContents.reduce((s,c)=>s+c.kg,0) + addLine.kg;
  const totalL  = boxContents.reduce((s,c)=>s+c.liters,0) + addLine.liters;

  if (totalKg > boxType.maxWeightKg) return false;
  if (totalL  > boxType.usableLiters) return false;

  // item-specific per-box weight cap (e.g., berries)
  const kgOfThisItem = boxContents.filter(c => c.itemId === addLine.itemId)
                                  .reduce((s,c)=>s+c.kg,0) + addLine.kg;
  if (meta.maxWeightPerBoxKg && kgOfThisItem > meta.maxWeightPerBoxKg) return false;

  // min box type (disallow placing in a smaller type)
  if (meta.minBoxType) {
    const order = ["Small","Medium","Large"];
    if (order.indexOf(boxType.key) < order.indexOf(meta.minBoxType)) return false;
  }

  // mixing rules
  if (meta.allowMixing === false) {
    if (boxContents.length && boxContents.some(c => c.itemId !== addLine.itemId)) return false;
  }

  return true;
}

// Pack ONE order object like you pasted (order.items: [{ itemId, quantity, ... }])
function packOrder(order) {
  // normalize to {itemId, kg, liters, fragility}
  const pieces = order.items.map(it => {
    const kg = it.quantity; // your quantity is already in kg
    const liters = litersFor(it.itemId, kg);
    const meta = ITEM_PACK[it.itemId] || {};
    return { itemId: it.itemId, kg, liters, fragility: meta.fragility || "normal" };
  }).sort((a,b) => {
    const f = fragRank(a.fragility) - fragRank(b.fragility);
    if (f !== 0) return f;
    return b.liters - a.liters; // larger first
  });

  const boxes = [];

  for (const p of pieces) {
    let placed = false;

    // try existing boxes first (smallest workable first)
    for (const box of boxes) {
      if (canPlace(box.type, box.contents, p)) {
        box.contents.push(p);
        placed = true;
        break;
      }
    }
    if (placed) continue;

    // open a new box; prefer smallest that fits
    for (const bt of BOXES) {
      if (canPlace(bt, [], p)) {
        boxes.push({ type: bt, contents: [p] });
        placed = true;
        break;
      }
    }

    if (!placed) throw new Error(`Cannot place ${p.itemId} with current rules/boxes`);
  }

  // return a summary
  return boxes.map((b, i) => ({
    boxNo: i + 1,
    boxType: b.type.key,
    estFillLiters: +b.contents.reduce((s,c)=>s+c.liters,0).toFixed(2),
    estWeightKg:   +b.contents.reduce((s,c)=>s+c.kg,0).toFixed(2),
    contents: b.contents.map(c => ({ itemId: c.itemId, kg: c.kg }))
  }));
}

// --- helpers ---
function formatBoxSummary(boxes) {
  // boxes: [{ boxType: "Small" | "Medium" | "Large", ... }]
  const counts = boxes.reduce((acc, b) => {
    const key = b.boxType || b.type?.key || b.key; // be tolerant
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const order = ["Small", "Medium", "Large"];
  const parts = order.filter(k => counts[k]).map(k => `${counts[k]}×${k}`);
  return parts.join(" + ") || "—";
}

function computePackingForOrder(orderData) {
  try {
    // Use your packOrder if available
    if (typeof packOrder === "function") {
      const boxes = packOrder({
        items: (orderData.items || []).map(i => ({
          itemId: i.itemId,
          quantity: i.quantity // your quantity is already in kg
        }))
      });
      return { summary: formatBoxSummary(boxes), boxes };
    }
  } catch (e) {
    console.warn("Packing failed, fallback:", e);
  }

  // Fallback: show nothing when we can’t compute (e.g., missing metadata)
  return { summary: "—", boxes: [] };
}

// --- your renderer with the new column ---
function renderOrdersAsRows(data) {
  const tbody = document.querySelector("#orders-table tbody");
  const thCount = document.querySelectorAll("#orders-table thead th").length || 5;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="${thCount}">No orders for this shift.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach(order => {
    const orderId = order.id;
    const orderData = order.data;

    const shortOrderId = orderId.split("_").pop();
    const deliveryAddress = orderData.deliveryAddress?.address || "-";
    const totalWeight = (orderData.totalOrderWeightKg ?? "-");
    const packing = computePackingForOrder(orderData); // << NEW
    const packagesText = packing.summary;              // << NEW

    // main row
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${shortOrderId}</td>
      <td>${deliveryAddress}</td>
      <td>${totalWeight} kg</td>
      <td>${packagesText}</td>      <!-- NEW COLUMN -->
      <td class="arrow-toggle" title="Show items" style="cursor:pointer">&#9660;</td>
    `;

    // details row
    const itemsTr = document.createElement("tr");
    itemsTr.style.display = "none"; // toggle the whole row (cleaner)
    const itemsTd = document.createElement("td");
    itemsTd.colSpan = thCount;

    if (orderData.items && orderData.items.length > 0) {
      const itemsList = orderData.items.map(it =>
        `<div>&bull; ${it.itemName}: ${it.quantity} kg from ${it.sourceFarmName}</div>`
      ).join("");

      // if we have a detailed pack plan, show it too (optional)
      let packDetails = "";
      if (packing.boxes?.length) {
        const perBox = packing.boxes.map(b => {
          const content = (b.contents || []).map(c => `${c.kg} kg ${c.itemId}`).join(", ");
          const weight = b.estWeightKg ?? "";
          const liters = b.estFillLiters ?? "";
          const meta = [];
        if (weight) meta.push(`${weight} kg`);
        if (liters) meta.push(`${liters} L`);
          return `<li><strong>${b.boxType}</strong>${meta.length ? ` <em>(${meta.join(", ")})</em>` : ""}${content ? ` — ${content}` : ""}</li>`;
        }).join("");
        packDetails = `
          <div class="pack-summary"><strong>Boxes:</strong> ${packagesText}</div>
          <ul class="pack-breakdown">${perBox}</ul>
        `;
      }

      itemsTd.innerHTML = `
        <div class="order-items">${itemsList}</div>
        ${packDetails}
      `;
    } else {
      itemsTd.innerHTML = "<div>No items listed.</div>";
    }

    itemsTr.appendChild(itemsTd);

    // toggle
    const arrow = tr.querySelector(".arrow-toggle");
    arrow.addEventListener("click", () => {
      const isHidden = itemsTr.style.display === "none";
      itemsTr.style.display = isHidden ? "table-row" : "none";
      arrow.innerHTML = isHidden ? "&#9650;" : "&#9660;";
      arrow.classList.toggle("open", isHidden);
    });

    tbody.appendChild(tr);
    tbody.appendChild(itemsTr);
  });
}
