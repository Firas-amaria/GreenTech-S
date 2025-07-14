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
    const deliveryAddress = orderData.deliveryAddress || "-";
    const totalWeight = orderData.totalOrderWeightKg || "-";
    const totalValue = orderData.totalOrderValue || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${shortOrderId}</td>
      <td>${deliveryAddress}</td>
      <td>${totalWeight}</td>
      <td>${totalValue}</td>
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
