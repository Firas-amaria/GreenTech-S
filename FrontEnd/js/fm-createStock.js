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
              <th>Agreement %</th>
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
      renderFarmersForItem(itemFarmers, item.itemId, tbodyId, typicalDemand);
    }

    container.appendChild(section);
  });
});

function renderFarmersForItem(farmers, itemId, tbodyId, typicalDemand) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";

  farmers.forEach(farmer => {
    const agreement = farmer.agreementPercentage || 0.8; // fallback if missing
    const maxAgreement = (farmer.currentAvailableForProcurementKg * agreement).toFixed(1);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${farmer.farmerId}</td>
      <td>${farmer.sourceLandIds.join(", ")}</td>
      <td>${farmer.currentAvailableForProcurementKg.toFixed(1)} kg</td>
      <td>${(agreement * 100).toFixed(0)}%</td>
      <td>${maxAgreement} kg</td>
      <td>
        <input type="number" min="0" placeholder="kg" 
          data-item="${itemId}" 
          data-max="${maxAgreement}"
          id="input-${itemId}-${farmer.farmerId}">
      </td>
      <td><button onclick="createStock('${itemId}', '${farmer.farmerId}')">Create Stock</button></td>
    `;
    tbody.appendChild(tr);

    // add live tracking
    const input = tr.querySelector("input");
    input.addEventListener("input", () => updateTotals(itemId, typicalDemand));
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

function createStock(itemId, farmerId) {
  const inputId = `input-${itemId}-${farmerId}`;
  const kg = document.getElementById(inputId).value;
  if (!kg || kg <= 0) {
    alert("Enter a valid kg amount.");
    return;
  }
  alert(`Creating stock: ${kg} kg of ${itemId} from ${farmerId}`);
}
