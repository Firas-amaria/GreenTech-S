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

    // Build summary
    summaryContainer.innerHTML = "";
    for (const itemName in data.summary) {
      const item = data.summary[itemName];

      const itemDiv = document.createElement("div");
      itemDiv.classList.add("summary-item");

      const header = document.createElement("div");
      header.classList.add("summary-header");
      header.innerHTML = `
        <span><strong>${itemName}</strong>: ${item.totalKg} kg</span>
        <span class="arrow">&#9660;</span>
      `;
      itemDiv.appendChild(header);

      const sourcesDiv = document.createElement("div");
      sourcesDiv.classList.add("sources-list");
      sourcesDiv.style.display = "none";

      for (const farm in item.sources) {
        const farmDiv = document.createElement("div");
        farmDiv.innerHTML = `&bull; ${farm}: ${item.sources[farm]} kg`;
        sourcesDiv.appendChild(farmDiv);
      }
      itemDiv.appendChild(sourcesDiv);

      header.addEventListener("click", () => {
        const isOpen = sourcesDiv.style.display === "block";
        sourcesDiv.style.display = isOpen ? "none" : "block";
        header.querySelector(".arrow").innerHTML = isOpen ? "&#9660;" : "&#9650;";
      });

      summaryContainer.appendChild(itemDiv);
    }

    // Build orders
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
