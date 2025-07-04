import { farmerInventory, demandStatistics } from "./mockDataFM.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  const container = document.getElementById("stock-section");
  document.getElementById("header").textContent = `Create Stock for ${shift}`;

  const stats = demandStatistics[shift]?.items || [];
  if (stats.length === 0) {
    container.innerHTML = "<p>No demand data for this shift.</p>";
    return;
  }

  stats.forEach(item => {
    const typicalDemand = item.averageDemandQuantityKg;
    const itemFarmers = Object.values(farmerInventory).filter(inv =>
      inv.itemId === item.itemId && inv.status === "ready_for_harvest"
    );

    itemFarmers.forEach(farmer => {
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
              <th>Farm Lands</th>
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

  const finalBtn = document.createElement("button");
  finalBtn.textContent = "Create Stock & Shipment Requests";
  finalBtn.style.marginTop = "20px";
  finalBtn.onclick = finalizeStock;
  container.appendChild(finalBtn);
});

function renderFarmersForItem(farmers, item, tbodyId, typicalDemand) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";

  farmers.forEach(farmer => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${farmer.farmerId}</td>
      <td>${farmer.sourceLandIds.join(", ")}</td>
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
      createFarmerStock(item.itemId, item.itemDisplayName, farmer.farmerId, farmer.sourceLandIds[0], btn);
    });
    tr.lastElementChild.appendChild(btn);

    const input = tr.querySelector("input");
    input.addEventListener("input", () => updateTotals(item.itemId, typicalDemand));
  });
}

function updateTotals(itemId, typicalDemand) {
  let total = 0;
  const inputs = document.querySelectorAll(`input[data-item="${itemId}"]`);
  inputs.forEach(input => {
    let val = parseFloat(input.value) || 0;
    const max = parseFloat(input.dataset.max) || 0;
    if (val > max) {
      val = max;
      input.value = max;
    }
    total += val;
  });
  const remaining = Math.max(0, typicalDemand - total).toFixed(1);
  document.getElementById(`summary-${itemId}`).textContent =
    `Total ordered so far: ${total.toFixed(1)} kg | Remaining to fill demand: ${remaining} kg`;
}

function createFarmerStock(itemId, itemDisplayName, farmerId, landId, btnEl) {
  const inputId = `input-${itemId}-${farmerId}`;
  const inputEl = document.getElementById(inputId);
  let orderQty = parseFloat(inputEl.value) || 0;

  const maxEl = document.getElementById(`max-${itemId}-${farmerId}`);
  let maxAvailable = parseFloat(maxEl.textContent) || 0;

  if (orderQty > maxAvailable) {
    orderQty = maxAvailable;
    inputEl.value = maxAvailable;
  }

  if (orderQty <= 0) {
    alert("Please enter a valid kg amount.");
    return;
  }

  maxAvailable -= orderQty;
  maxEl.textContent = `${maxAvailable.toFixed(1)} kg`;
  inputEl.dataset.max = maxAvailable.toFixed(1);

  storeToLocal(itemId, itemDisplayName, farmerId, landId, orderQty);

  btnEl.classList.add("added");
  btnEl.textContent = "Added";
}

function storeToLocal(itemId, itemDisplayName, farmerId, landId, qty) {
  const now = new Date();
  const shift = new URLSearchParams(window.location.search).get("shift");

  const stockKey = `LC-1_AS_${shift}_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}`;
  let stock = JSON.parse(localStorage.getItem(stockKey)) || {
    logisticCenterId: "LC-1",
    availableDate: now.toISOString().split("T")[0] + "T00:00:00Z",
    availableShift: shift,
    generatedAt: now.toISOString(),
    lastUpdatedAt: now.toISOString(),
    createdByManagerId: "FM_UID_abc",
    items: []
  };

  stock.items.push({
    itemId,
    itemDisplayName,
    itemPictureUrl: "https://example.com/images/default.jpg",
    sourceFarmerId: farmerId,
    sourceFarmerName: farmerId,
    sourceFarmName: "UNKNOWN FARM",
    currentAvailableQuantityKg: qty,
    pricePerUnitKg: 3.0*1.2, // assuming 20% margin
    status: "active",
    originalCommittedQuantityKg: qty,
    sourceLandId: landId
  });
  localStorage.setItem(stockKey, JSON.stringify(stock));

  // create shipmentRequest
  const sreqId = `SReq_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}_${shift}_${farmerId}_${itemId}`;
  const shipmentReq = {
    
    logisticCenterId: "LC-1",
    farmerManagerId: "FM_UID_abc",
    farmerId,
    createdAt: now.toISOString(),
    scheduledPickupDate: stock.availableDate,
    scheduledPickupTimeSlot: shift,
    status: "forecasted",
    itemId,
    itemDisplayName,
    forecastedQuantityKg: qty,
    finalConfirmedQuantityKg: null,
    expectedContainerCount: Math.ceil(qty / 50),/// 
    exactAmountConfirmedAt: null,
    farmerLastNotifiedAt: null,
    lastUpdatedAt: now.toISOString(),
    updatedBy: "FM_UID_abc",
    correspondingShipmentId: null
  };
  localStorage.setItem(sreqId, JSON.stringify(shipmentReq));
}

function finalizeStock() {
  const now = new Date();
  const shift = new URLSearchParams(window.location.search).get("shift");
  const key = `LC-1_AS_${shift}_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}`;
  const availableStock = JSON.parse(localStorage.getItem(key)) || { items: [] };

  let summary = "Created stock & shipment requests:\n\n";
  availableStock.items.forEach(item => {
    summary += `- ${item.itemDisplayName}: ${item.currentAvailableQuantityKg} kg from ${item.sourceFarmerId}\n`;
  });

  alert(summary + "\n\n✅ Stock and shipment requests updated successfully!");
  window.location.href = "fm-dashboard.html";
}
