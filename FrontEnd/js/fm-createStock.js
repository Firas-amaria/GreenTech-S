import { auth, getCurrentUserToken } from "./firebase-init.js";

let collectedStockItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  let displayDate = params.get("date"); // e.g. "13/07/2025"

  // ✅ compute backend dates
  const [day, month, year] = displayDate.split("/");
  const backendDate = `${year}_${month}_${day}`; // for createStockItem
  const isoDate = `${year}-${month}-${day}`; // for demandStatistics

  const container = document.getElementById("stock-section");
  document.getElementById("header").textContent = `Create Stock for ${displayDate} - ${shift}`;

  let stats = [];
  let farmerInventory = [];

  try {
    const token = await getCurrentUserToken();

    // ✅ Fetch demand statistics with dash format
    const statRes = await fetch(
      `http://localhost:4000/api/farmerManager/demandStatistics?date=${encodeURIComponent(isoDate)}&shift=${encodeURIComponent(shift)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!statRes.ok)
      throw new Error(`Demand stat fetch failed: ${statRes.status}`);

    const statData = await statRes.json();
    stats = statData?.items || [];

    if (stats.length === 0) {
      container.innerHTML = "<p>No demand data for this shift.</p>";
      return;
    }

    // ✅ Fetch farmer inventory
    const invRes = await fetch(
      `http://localhost:4000/api/farmerManager/farmerInventory`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!invRes.ok)
      throw new Error(`Farmer inventory fetch failed: ${invRes.status}`);

    const invData = await invRes.json();
    farmerInventory = invData.inventory || [];

    if (!Array.isArray(farmerInventory))
      throw new Error("Expected an array in 'inventory' field.");

    // ✅ Render demand items and farmers
    stats.forEach((item) => {
      const typicalDemand = item.averageDemandQuantityKg;
      const itemFarmers = farmerInventory.filter(
        (inv) => inv.itemId === item.itemId
      );

      itemFarmers.forEach((farmer) => {
        farmer.maxOrder = parseFloat(farmer.maxOrder).toFixed(1);
      });

      const section = document.createElement("div");
      section.className = "item-section";
      section.innerHTML = `<h2>${item.itemDisplayName} (expected: ${typicalDemand} kg)</h2>`;

      if (itemFarmers.length === 0) {
        section.innerHTML += `<p>No farmers have this item ready for harvest.</p>`;
      } else {
        const tbodyId = `farmers-${item.itemId}`;
        section.innerHTML += `
          <table>
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Available</th>
                <th>Max Order</th>
                <th>Order (kg)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="${tbodyId}"></tbody>
          </table>
          <p id="summary-${item.itemId}">
            Total ordered so far: 0 kg | Remaining to fill demand: ${typicalDemand} kg
          </p>
        `;
        container.appendChild(section);
        renderFarmersForItem(itemFarmers, item, tbodyId, typicalDemand);
      }
      container.appendChild(section);
    });

    // ✅ Submit button
    const createBtn = document.createElement("button");
    createBtn.id = "submit-stock-btn";
    createBtn.textContent = "✅ Create Stock & Proceed to Dashboard";
    createBtn.style.marginTop = "30px";
    createBtn.style.padding = "10px 20px";
    createBtn.style.fontSize = "18px";
    createBtn.addEventListener("click", () => submitAllStock(backendDate, shift));
    container.appendChild(createBtn);

  } catch (error) {
    console.error("❌ Error initializing create stock:", error);
    container.innerHTML = "<p>Failed to load data for stock creation.</p>";
  }
});

function renderFarmersForItem(farmers, item, tbodyId, typicalDemand) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";

  farmers.forEach((farmer) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${farmer.farmerId}</td>
      <td>${farmer.currentAvailableForProcurementKg.toFixed(1)} kg</td>
      <td id="max-${item.itemId}-${farmer.farmerId}">${farmer.maxOrder} kg</td>
      <td>
        <input type="number" min="0" placeholder="kg"
          data-item="${item.itemId}"
          data-farmer="${farmer.farmerId}"
          data-max="${farmer.maxOrder}"
          data-typical="${typicalDemand}"
          id="input-${item.itemId}-${farmer.farmerId}">
      </td>
      <td></td>
    `;
    tbody.appendChild(tr);

    const btn = document.createElement("button");
    btn.textContent = "Add";
    btn.addEventListener("click", () => {
      const inputId = `input-${item.itemId}-${farmer.farmerId}`;
      const inputEl = document.getElementById(inputId);
      let orderQty = parseFloat(inputEl.value) || 0;
      const max = parseFloat(
        btn.closest("tr").querySelector(`#max-${item.itemId}-${farmer.farmerId}`).textContent
      );

      if (orderQty <= 0 || orderQty > max) {
        alert("Invalid order quantity.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "✔ Added";

      collectedStockItems.push({
        itemId: item.itemId,
        itemDisplayName: item.itemDisplayName,
        sourceFarmerId: farmer.farmerId,
        pickupAddress: farmer.pickupAddress,
        currentAvailableQuantityKg: orderQty,
        originalCommittedQuantityKg: orderQty,
      });

      updateTotals(item.itemId, typicalDemand);
    });

    tr.lastElementChild.appendChild(btn);
    const input = tr.querySelector("input");
    input.addEventListener("input", () =>
      updateTotals(item.itemId, typicalDemand)
    );
  });
}

function updateTotals(itemId, typicalDemand) {
  let total = 0;
  const inputs = document.querySelectorAll(`input[data-item="${itemId}"]`);
  inputs.forEach((input) => {
    let val = parseFloat(input.value) || 0;
    const max = parseFloat(input.dataset.max) || 0;
    if (val > max) {
      val = max;
      input.value = max;
    }
    total += val;
  });
  const remaining = Math.max(0, typicalDemand - total).toFixed(1);
  document.getElementById(
    `summary-${itemId}`
  ).textContent = `Total ordered so far: ${total.toFixed(
    1
  )} kg | Remaining to fill demand: ${remaining} kg`;
}

async function submitAllStock(backendDate, shift) {
  if (collectedStockItems.length === 0) {
    alert("You haven't added any stock items yet.");
    return;
  }

  const user = JSON.parse(localStorage.getItem("user"));

  const payload = {
    logisticCenterId: "LC-1",
    date: backendDate, // e.g. "2025_07_13"
    shift,
    createdByManagerId: "user_UID_abc",
    createdByName: user?.name || "unknown",
    items: collectedStockItems,
  };

  try {
    const token = await getCurrentUserToken();

    const response = await fetch(
      "http://localhost:4000/api/farmerManager/createStockItem",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server error: ${response.status} - ${text}`);
    }

    window.location.href = "fm-dashboard.html";
  } catch (err) {
    console.error("❌ Submit error:", err);
    alert("Network error while submitting stock.");
  }
}
