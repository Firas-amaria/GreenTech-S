import { farmerInventory } from "./mockDataFM.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  const container = document.getElementById("shipment-section");
  document.getElementById("header").textContent = `Shipment Requests for ${shift}`;

  const requests = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const parts = key.split("_");
    if (key.startsWith("SReq_") && parts[4] === shift) {
      requests.push(JSON.parse(localStorage.getItem(key)));
    }
  }

  if (requests.length === 0) {
    container.innerHTML = "<p>No shipment requests created yet for this shift.</p>";
    return;
  }

  const grouped = {};
  requests.forEach(req => {
    if (!grouped[req.itemId]) grouped[req.itemId] = [];
    grouped[req.itemId].push(req);
  });

  for (const itemId in grouped) {
    const section = document.createElement("div");
    section.className = "item-section";
    const itemName = grouped[itemId][0].itemDisplayName;
    section.innerHTML = `<h2>${itemName}</h2>
      <table>
        <thead>
          <tr>
            <th>Farmer</th>
            <th>Farm Land</th>
            <th>Forecasted</th>
            <th>Committed Orders</th>
            <th>Final Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="tbody-${itemId}"></tbody>
      </table>`;
    container.appendChild(section);

    renderShipmentTable(grouped[itemId], itemId, shift);
  }
});

function renderShipmentTable(requests, itemId, shift) {
  const tbody = document.getElementById(`tbody-${itemId}`);
  tbody.innerHTML = "";

  requests.forEach(req => {
    const stockKey = `LC-1_AS_${shift}_${new Date(req.createdAt).getFullYear()}_${new Date(req.createdAt).getMonth()+1}_${new Date(req.createdAt).getDate()}`;
    const stock = JSON.parse(localStorage.getItem(stockKey)) || { items: [] };
    const committed = stock.items
      .filter(item => item.itemId === req.itemId && item.sourceFarmerId === req.farmerId)
      .reduce((sum, item) => sum + (item.originalCommittedQuantityKg - item.currentAvailableQuantityKg), 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.farmerId}</td>
      <td>${req.sourceLandId || "UNKNOWN"}</td>
      <td>${req.forecastedQuantityKg} kg</td>
      <td>${committed} kg</td>
      <td><input type="number" min="0" value="${committed}" id="final-${itemId}-${req.farmerId}"></td>
      <td><button>Finalize Req</button></td>
    `;

    const btn = tr.querySelector("button");
    btn.addEventListener("click", () => {
      finalizeReq(req, itemId, shift, `final-${itemId}-${req.farmerId}`, btn);
    });

    tbody.appendChild(tr);
  });
}

function finalizeReq(req, itemId, shift, inputId, btnEl) {
  const finalAmount = parseFloat(document.getElementById(inputId).value) || 0;
  const now = new Date();

  const sreqId = `SReq_${new Date(req.createdAt).getFullYear()}_${new Date(req.createdAt).getMonth()+1}_${new Date(req.createdAt).getDate()}_${shift}_${req.farmerId}_${req.itemId}`;

  req.finalConfirmedQuantityKg = finalAmount;
  req.status = "finalized";
  req.exactAmountConfirmedAt = now.toISOString();
  localStorage.setItem(sreqId, JSON.stringify(req));

  const farmerKey = Object.keys(farmerInventory).find(key =>
    farmerInventory[key].farmerId === req.farmerId && farmerInventory[key].itemId === req.itemId
  );
  if (farmerKey) {
    const farmer = farmerInventory[farmerKey];
    farmer.maxOrder = (parseFloat(farmer.maxOrder) + req.forecastedQuantityKg - finalAmount).toFixed(1);
  }

  const shipmentId = `LC-1_SH_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}_${shift}_${req.farmerId}_${req.itemId}`;
  const shipment = {
    id: shipmentId,
    logisticCenterId: "LC-1",
    farmerId: req.farmerId,
    driverId: null,
    origin: null,
    destination: null,
    createdAt: now.toISOString(),
    pickupTime: null,
    overallStatus: null,
    problemFlag: false,
    shipmentRequestId: sreqId,
    shipmentBarcode: null,
    containerBarcodes: [],
    stages: [],
    fullReport: null
  };
  localStorage.setItem(shipmentId, JSON.stringify(shipment));

  req.correspondingShipmentId = shipmentId;
  localStorage.setItem(sreqId, JSON.stringify(req));

  btnEl.style.background = "#e74c3c";
  btnEl.style.color = "white";
  btnEl.textContent = "Finalized";
}
