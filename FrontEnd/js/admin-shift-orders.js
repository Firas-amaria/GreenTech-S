
  const itemList = {
  "Apple Fuji": "🍎",
  "Banana Cavendish": "🍌",
  "Orange Navel": "🍊",
  "Grapes Red Globe": "🍇",
  "Strawberry Albion": "🍓",
  "Tomato Cherry": "🍅",
  "Lettuce Romaine": "🥬",
  "Cucumber Persian": "🥒",
  "Carrot Nantes": "🥕",
  "Spinach Baby": "🌿"
};

import { auth, onAuthStateChanged } from "./firebase-init.js";



const API_BASE = "http://localhost:4000";

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
  loadOrdersAndSummary(user, shift, date);

  // Toggle tabs
  document.getElementById("summary-tab").addEventListener("click", () => {
    document.getElementById("summary-tab").classList.add("sub-active");
    document.getElementById("orders-tab").classList.remove("sub-active");
    document.getElementById("order-summary-section").style.display = "block";
    document.getElementById("orders-section").style.display = "none";
  });
  document.getElementById("orders-tab").addEventListener("click", () => {
    document.getElementById("orders-tab").classList.add("sub-active");
    document.getElementById("summary-tab").classList.remove("sub-active");
    document.getElementById("order-summary-section").style.display = "none";
    document.getElementById("orders-section").style.display = "block";
  });
});

async function loadOrdersAndSummary(user, shift, date) {
  const tbody = document.querySelector("#orders-table tbody");
  const summaryContainer = document.getElementById("summary-container");
  tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/admin/orders-with-summary-for-shift?shift=${shift}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Build farmer summary from item summary
    const farmerSummaryMap = {};
    for (const itemName in data.summary) {
      const item = data.summary[itemName];
      for (const farmKey in item.sources) {
        const [farmerId, farmName] = farmKey.split("|");
        const farmerKey = `${farmerId}|${farmName}`;

        if (!farmerSummaryMap[farmerKey]) {
          farmerSummaryMap[farmerKey] = { totalKg: 0, items: {} };
        }
        farmerSummaryMap[farmerKey].totalKg += item.sources[farmKey];
        if (!farmerSummaryMap[farmerKey].items[itemName]) {
          farmerSummaryMap[farmerKey].items[itemName] = 0;
        }
        farmerSummaryMap[farmerKey].items[itemName] += item.sources[farmKey];
      }
    }

    // Default render by item
    renderSummaryByItem(data.summary, summaryContainer);
buildPieChart(data.summary);
    // Handle switching sort mode
    document.getElementById("summary-sort").addEventListener("change", (e) => {
      summaryContainer.innerHTML = "";
      if (e.target.value === "farmer") {
        renderSummaryByFarmer(farmerSummaryMap, summaryContainer);
      } else {
        renderSummaryByItem(data.summary, summaryContainer);
      }
    });

    // Build orders table like before
    if (data.orders.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4'>No orders for this shift.</td></tr>";
    } else {
      tbody.innerHTML = "";
      data.orders.forEach(order => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${order.orderNumber}</td>
          <td>${order.status}</td>
          <td>${order.totalOrderWeightKg}</td>
          <td>${order.totalOrderValue}</td>
        `;

        const itemsTr = document.createElement("tr");
        const itemsTd = document.createElement("td");
        itemsTd.colSpan = 4;
        itemsTd.style.display = "none";
        itemsTr.appendChild(itemsTd);

        if (order.items && order.items.length > 0) {
          const itemsList = order.items.map(it =>
            `<div>&bull; ${it.itemName}: ${it.quantity} kg from ${it.sourceFarmName}</div>`
          ).join("");
          itemsTd.innerHTML = itemsList;
        }

        tr.addEventListener("click", () => {
          const isVisible = itemsTd.style.display === "table-cell";
          itemsTd.style.display = isVisible ? "none" : "table-cell";
        });

        tbody.appendChild(tr);
        tbody.appendChild(itemsTr);
      });
    }

  } catch (err) {
    console.error("Error loading orders+summary:", err);
    tbody.innerHTML = "<tr><td colspan='4'>Error loading orders. Check console.</td></tr>";
  }
}


function renderSummaryByItem(summary, container) {
  for (const itemName in summary) {
    const item = summary[itemName];
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("summary-item");

    const header = document.createElement("div");
    header.classList.add("summary-header");
    header.innerHTML = `<span><strong>${itemName}</strong>: ${item.totalKg} kg</span><span class="arrow">&#9660;</span>`;
    itemDiv.appendChild(header);

    const sourcesDiv = document.createElement("div");
    sourcesDiv.classList.add("sources-list");
    sourcesDiv.style.display = "none";

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Farmer ID</th><th>Farm Name</th><th>Total Committed</th></tr></thead>
      <tbody></tbody>`;
    const tbodySources = table.querySelector("tbody");

    for (const farmKey in item.sources) {
      const [farmerId, farmName] = farmKey.split("|");
      const qty = item.sources[farmKey];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${farmerId.slice(0,6)}...</td><td>${farmName}</td><td>${qty} kg</td>`;
      tbodySources.appendChild(tr);
    }

    sourcesDiv.appendChild(table);
    itemDiv.appendChild(sourcesDiv);

    header.addEventListener("click", () => {
      const isOpen = sourcesDiv.style.display === "block";
      sourcesDiv.style.display = isOpen ? "none" : "block";
      header.querySelector(".arrow").innerHTML = isOpen ? "&#9660;" : "&#9650;";
    });

    container.appendChild(itemDiv);

    //call here the function for chart
  }
}

function buildPieChart(summary) {
  const pieData = [];
  let totalAllItems = 0;

  for (const itemName in summary) {
    const item = summary[itemName];
    totalAllItems += item.totalKg;
  }

  for (const itemName in summary) {
    const item = summary[itemName];
    const percent = ((item.totalKg / totalAllItems) * 100).toFixed(1);
    pieData.push({
      name: itemName,
      icon: itemList[itemName] || "",
      totalKg: item.totalKg,
      percent: percent
    });
  }

  const labels = pieData.map(item => `${item.icon} ${item.name}`);
  const data = pieData.map(item => item.totalKg);

  const ctx = document.getElementById('itemPieChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#f39c12','#27ae60','#2980b9','#8e44ad','#e74c3c',
          '#16a085','#d35400','#2c3e50','#c0392b','#7f8c8d'
        ],
        hoverOffset: 20
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let i = context.dataIndex;
              return `${labels[i]}: ${pieData[i].totalKg} kg (${pieData[i].percent}%)`;
            }
          }
        }
      }
    }
  });
}


function renderSummaryByFarmer(farmerSummary, container) {
  for (const farmerKey in farmerSummary) {
    const [farmerId, farmName] = farmerKey.split("|");
    const farmer = farmerSummary[farmerKey];

    const itemDiv = document.createElement("div");
    itemDiv.classList.add("summary-item");

    const header = document.createElement("div");
    header.classList.add("summary-header");
    header.innerHTML = `<span><strong>${farmName}</strong> (${farmerId.slice(0,6)}...): ${farmer.totalKg} kg, ${Object.keys(farmer.items).length} items</span><span class="arrow">&#9660;</span>`;
    itemDiv.appendChild(header);

    const itemsDiv = document.createElement("div");
    itemsDiv.classList.add("sources-list");
    itemsDiv.style.display = "none";

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Item</th><th>Total Ordered</th></tr></thead>
      <tbody></tbody>`;
    const tbodyItems = table.querySelector("tbody");

    for (const itemName in farmer.items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${itemName}</td><td>${farmer.items[itemName]} kg</td>`;
      tbodyItems.appendChild(tr);
    }

    itemsDiv.appendChild(table);
    itemDiv.appendChild(itemsDiv);

    header.addEventListener("click", () => {
      const isOpen = itemsDiv.style.display === "block";
      itemsDiv.style.display = isOpen ? "none" : "block";
      header.querySelector(".arrow").innerHTML = isOpen ? "&#9660;" : "&#9650;";
    });

    container.appendChild(itemDiv);
  }
}
