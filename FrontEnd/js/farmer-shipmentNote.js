import { getCurrentUserToken } from "../js/firebase-init.js";

// Utility: get URL param
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

const shipmentId = getQueryParam("shipmentId");

// 🔘 Popup controls (same as before)
window.showContainers = function(item, quality, index) {
  document.getElementById(`popup-${index}`).style.display = "block";
};
window.closePopup = function(index) {
  document.getElementById(`popup-${index}`).style.display = "none";
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🚀 Loading shipment details...");
    const token = await getCurrentUserToken();

    const res = await fetch(
      `http://localhost:4000/api/farmer/getApprovedShipmentsByID/${shipmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error("Failed to fetch shipment report");

    const shipment = await res.json();
    console.log("✅ Shipment loaded:", shipment);

    renderProducts(shipment);
  } catch (error) {
    console.error("Error loading shipment view:", error);
    alert("Error loading shipment report. Try again.");
  }
});
// Example shipment data you provided
const shipment = {
  logisticCenterId: "LC-1",
  farmerManagerId: "J2sKTGHje2R2XsXeS9Qmrnwq3vE3",
  farmerManagerName: "fmanager test",
  farmerId: "WBNUqNcVqpXelBIGhjboNFWk3z62",
  farmerName: "farmer FF",
  finalConfirmedQuantityKg: 30,
  itemDisplayName: "Banana Cavendish",
  itemId: "FRT-002",
  pickupAddress: "13",
  scheduledPickupDate: "2025-07-10T00:00:00Z",
  scheduledPickupTimeSlot: "thursday-afternoon",
  overallStatus: "ready-for-pickup",
  shipmentRequestId: "LC-1_SReq_2025_07_10_afternoon_WBNUqNcVqpXelBIGhjboNFWk3z62_FRT-002"
};

function renderShipmentNote() {
  // Fill shipment / farmer info
  document.querySelector(".farmer-info").innerHTML = `
    <p><strong>Farmer:</strong> ${shipment.farmerName}</p>
    <p><strong>Managed By:</strong> ${shipment.farmerManagerName}</p>
    <p><strong>Pickup Address:</strong> ${shipment.pickupAddress}</p>
    <p><strong>Scheduled:</strong> ${shipment.scheduledPickupDate.split('T')[0]} (${shipment.scheduledPickupTimeSlot})</p>
    <p><strong>Status:</strong> ${shipment.overallStatus}</p>
  `;

  // Create table row for the product
  const body = document.getElementById("product-body");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${shipment.itemDisplayName}</td>
    <td>-</td> <!-- container list placeholder -->
    <td>-</td> <!-- quality -->
    <td>-</td> <!-- price per kg -->
    <td>${shipment.finalConfirmedQuantityKg.toFixed(2)}</td>
    <td>-</td> <!-- total price -->
    <td>-</td> <!-- total volume -->
  `;
  body.appendChild(tr);

  // Totals
  document.getElementById("total-kg").textContent = shipment.finalConfirmedQuantityKg.toFixed(2);
  document.getElementById("total-vol").textContent = "-";
  document.getElementById("total-price").textContent = "-";
}

// auto-run on load
window.onload = renderShipmentNote;

function renderProducts(shipment) {
  // Extract your data
  const farmerInfo = {
    orderId: shipment.orderId,
    name: shipment.farmerName,
    address: shipment.farmerAddress,
    phone: shipment.farmerPhone
  };

  const products = shipment.products || [];
  const containers = shipment.containers || [];

  // Fill farmer info
  document.querySelector(".farmer-info").innerHTML = `
    <p><strong>Delivery Note #:</strong> ${farmerInfo.orderId}</p>
    <p><strong>Farmer:</strong> ${farmerInfo.name}</p>
    <p><strong>Address:</strong> ${farmerInfo.address}</p>
    <p><strong>Phone:</strong> ${farmerInfo.phone}</p>
  `;

  const body = document.getElementById("product-body");
  body.innerHTML = ""; // clear any existing rows
  let totalWeight = 0;
  let totalVolumeAll = 0;
  let totalPrice = 0;

  products.forEach((p, index) => {
    const name = p.item.name;
    const quality = p.item.quality;
    const total = p.pricePerKg * p.weightKg;
    
    totalWeight += p.weightKg;
    totalPrice += total;

    const relatedContainers = containers.filter(c => c.item === name && c.quality === quality);
    const totalVolume = relatedContainers.reduce((sum, c) => sum + c.volumeKg, 0);
    totalVolumeAll += totalVolume;
    const containerIds = relatedContainers.map(c => `<li>${c.id} - ${c.volumeKg} kg</li>`).join("");

    const tr = document.createElement("tr");
    const containerButton = `<button onclick="showContainers('${name}', '${quality}', ${index})">List</button>`;
    const popup = `
      <div id="popup-${index}" class="popup-container" style="display:none;">
        <div class="popup-content">
          <span class="close-btn" onclick="closePopup(${index})">&times;</span>
          <h3>${name} (${quality}) - Containers</h3>
          <ul>${containerIds}</ul>
        </div>
      </div>
    `;

    tr.innerHTML = `
      <td>${name}</td>
      <td>${containerButton}${popup}</td>
      <td>${quality}</td>
      <td>${p.pricePerKg.toFixed(2)}</td>
      <td>${p.weightKg.toFixed(2)}</td>
      <td>${total.toFixed(2)}</td>
      <td>${totalVolume.toFixed(2)} kg</td>
    `;
    body.appendChild(tr);
  });

  document.getElementById("total-kg").textContent = totalWeight.toFixed(2);
  document.getElementById("total-vol").textContent = totalVolumeAll.toFixed(2);
  document.getElementById("total-price").textContent = totalPrice.toFixed(2);
}
