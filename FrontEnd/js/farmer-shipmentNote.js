import { getCurrentUserToken } from "../js/firebase-init.js";

// Utility: get URL param
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

const shipmentId = getQueryParam("shipmentId");

// Load shipment data
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const token = await getCurrentUserToken();
    const res = await fetch(
      `http://localhost:4000/api/farmer/getApprovedShipmentsByID/${shipmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error("Failed to fetch shipment report");

    const shipment = await res.json();

    populateShipmentDetails(shipment);
    populateContainers(shipment.fullReport?.farmerReports || []);
    populateHistory(shipment.fullReport?.history || []);
  } catch (error) {
    console.error("Error loading shipment view:", error);
    alert("Error loading shipment report. Try again.");
  }
});

console.log("shipment", shipment);
// ✏️ Fill farmer info
function populateShipmentDetails(shipmentData) {
  document.querySelector(".farmer-info").innerHTML = `
    <p><strong>Delivery Note #:</strong> ${shipmentData.orderId}</p>
    <p><strong>Farmer:</strong> ${shipmentData.farmerName}</p>
    <p><strong>Address:</strong> ${shipmentData.farmerAddress}</p>
    <p><strong>Phone:</strong> ${shipmentData.farmerPhone}</p>
  `;
}

// 📦 Render product table from real data
function renderProducts(products, containers) {
  const body = document.getElementById("product-body");
  body.innerHTML = ""; // clear previous rows

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

    const tr = document.createElement("tr");
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

// 🔘 Popup controls
window.showContainers = function(item, quality, index) {
  document.getElementById(`popup-${index}`).style.display = "block";
};

window.closePopup = function(index) {
  document.getElementById(`popup-${index}`).style.display = "none";
};
