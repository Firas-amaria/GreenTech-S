import { stockData, orderSummaries } from "./mockDataFM.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  document.getElementById("header").textContent = `Finalize Shipment for ${shift}`;

  const shipmentSection = document.getElementById("shipment-details");
  const stock = stockData[shift] || [];
  const orders = orderSummaries[shift] || {};

  stock.forEach(item => {
    const itemOrders = orders[item.itemId] || {};
    let totalOrdered = Object.values(itemOrders).reduce((sum, qty) => sum + qty, 0);

    const section = document.createElement("div");
    section.className = "item-section";
    section.innerHTML = `<h2>${item.itemName}</h2>
    <table>
      <thead>
        <tr>
          <th>Farmer</th>
          <th>Prepared</th>
          <th>Ordered</th>
          <th>Final Amount</th>
        </tr>
      </thead>
      <tbody id="tbody-${item.itemId}"></tbody>
    </table>
    <p>Total ordered by customers: ${totalOrdered} kg | Prepared: ${item.totalPrepared} kg</p>`;
    shipmentSection.appendChild(section);

    renderShipmentTable(item, itemOrders, item.itemId);
  });

  document.getElementById("post-final").addEventListener("click", () => {
    alert("Posting final shipment data...");
    // here collect inputs & post to backend
  });
});

function renderShipmentTable(item, orders, itemId) {
  const tbody = document.getElementById(`tbody-${itemId}`);
  tbody.innerHTML = "";
  item.farmers.forEach(farmer => {
    const orderedQty = orders[farmer.farmerId] || 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${farmer.farmerId}</td>
      <td>${farmer.prepared} kg</td>
      <td>${orderedQty} kg</td>
      <td><input type="number" value="${orderedQty}" min="0" id="final-${itemId}-${farmer.farmerId}"></td>
    `;
    tbody.appendChild(tr);
  });
}
