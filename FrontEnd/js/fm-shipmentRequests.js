document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  const container = document.getElementById("shipment-section");
  document.getElementById(
    "header"
  ).textContent = `Shipment Requests for ${shift}`;

  try {
    const res = await fetch(
      `http://localhost:4000/api/farmerManager/shipmentRequests/${shift}`
    );
    const requests = await res.json();

    if (!requests || requests.length === 0) {
      container.innerHTML = "<p>No shipment requests found for this shift.</p>";
      return;
    }

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
              <th>Commited Orders</th>
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
    // console.log(req.committedOrders);
    const tr = document.createElement("tr");
    const inputId = `final-${itemId}-${req.farmerId}`;

    tr.innerHTML = `
      <td>${req.farmerName}</td>
      <td>${req.pickupAddress || "UNKNOWN"}</td>
      <td>${req.forecastedQuantityKg} kg</td>
      <td>${req.committedOrders} kg</td>
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
    const res = await fetch(
      `http://localhost:4000/api/farmerManager/shipmentRequestQuantitiesConfirmed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
