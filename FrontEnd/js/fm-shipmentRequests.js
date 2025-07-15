import { getCurrentUserToken } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  const displayDate = params.get("date"); // e.g. "13/07/2025"

  // ✅ compute date in yyyy_mm_dd for backend
  const [day, month, year] = displayDate.split("/");
  const backendDate = `${year}_${month}_${day}`;

  const container = document.getElementById("shipment-section");
  document.getElementById(
    "header"
  ).textContent = `Orders Requests for ${displayDate} - ${shift}`;

  try {
    const token = await getCurrentUserToken();

    // ✅ call the backend using ?date=yyyy_mm_dd&shift=morning
    const res = await fetch(
      `http://localhost:4000/api/farmerManager/shipmentRequests?date=${backendDate}&shift=${shift}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const requests = await res.json();

    if (!requests || requests.length === 0) {
      container.innerHTML = "<p>No shipment requests found for this shift.</p>";
      return;
    }

    // ✅ Group by itemId
    const grouped = {};
    requests.forEach((req) => {
      if (!grouped[req.itemId]) grouped[req.itemId] = [];
      grouped[req.itemId].push(req);
    });

    for (const itemId in grouped) {
      const section = document.createElement("div");
      section.className = "item-section";
      const itemName = grouped[itemId][0].itemDisplayName || itemId;
      section.innerHTML = `<h2>${itemName}</h2>
        <table>
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Pickup Address</th>
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
  } catch (err) {
    console.error("❌ Error loading shipment requests:", err);
    container.innerHTML = "<p>Error loading shipment requests.</p>";
  }
});

function renderShipmentTable(requests, itemId, shift) {
  const tbody = document.getElementById(`tbody-${itemId}`);
  tbody.innerHTML = "";

  requests.forEach((req) => {
    const tr = document.createElement("tr");
    const inputId = `final-${itemId}-${req.farmerId}`;

    tr.innerHTML = `
      <td>${req.farmerName}</td>
      <td>${req.pickupAddress || "UNKNOWN"}</td>
      <td>${req.forecastedQuantityKg} kg</td>
      <td>${req.committedOrders || 0} kg</td>
      <td><input type="number" min="0" value="${
        req.committedOrders
      }" id="${inputId}"></td>
      <td><button>Finalize</button></td>
    `;

    const btn = tr.querySelector("button");
    btn.addEventListener("click", () => {
      finalizeShipmentRequest(req, inputId, btn);
    });

    tbody.appendChild(tr);
  });
}

async function finalizeShipmentRequest(req, inputId, btnEl) {
  const finalAmount = parseFloat(document.getElementById(inputId).value) || 0;

  try {
    const token = await getCurrentUserToken();

    const res = await fetch(
      `http://localhost:4000/api/farmerManager/shipmentRequestQuantitiesConfirmed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipmentRequestId: req.id,
          finalConfirmedQuantityKg: finalAmount,
        }),
      }
    );

    const data = await res.json();

    btnEl.style.background = "#2ecc71";
    btnEl.style.color = "white";
    btnEl.textContent = "Finalized";
  } catch (err) {
    console.error("❌ Error finalizing:", err);
    alert("Failed to finalize request.");
  }
}
