
import { getCurrentUserToken } from "./firebase-init.js";

// 🔹 Utility to get query param
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

const shipmentId = getQueryParam("shipmentId");

if (!shipmentId) {
  alert("❌ Missing shipmentId in URL.");
  throw new Error("Missing shipmentId");
}

// 🔘 Popup controls
window.showContainers = function (index) {
  document.getElementById(`popup-${index}`).style.display = "block";
};
window.closePopup = function (index) {
  document.getElementById(`popup-${index}`).style.display = "none";
};

// 🔄 Load data
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🔍 Loading shipment for ID:", shipmentId);
    const token = await getCurrentUserToken();

    const res = await fetch(
      `http://localhost:4000/api/farmer/getApprovedShipmentsByID/${shipmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error(`❌ Failed to fetch: ${res.status}`);

    const shipment = await res.json();
    console.log("✅ Shipment loaded:", shipment);

    renderShipmentHeader(shipment);
  } catch (err) {
    console.error("❌ Error loading shipment:", err);
    alert("Error loading shipment report. Try again.");
  }
});

function renderShipmentHeader(shipment) {
  document.querySelector(".farmer-info").innerHTML = `
    <p><strong>Farmer:</strong> ${shipment.farmerName}</p>
    <p><strong>Managed By:</strong> ${shipment.farmerManagerName}</p>
    <p><strong>Pickup Address:</strong> ${shipment.pickupAddress}</p>
    <p><strong>Scheduled:</strong> ${shipment.scheduledPickupDate?.split("T")[0]} (${shipment.scheduledPickupTimeSlot})</p>
    <p><strong>Status:</strong> ${shipment.overallStatus}</p>
  `;

  document.getElementById("total-kg").textContent =
    shipment.finalConfirmedQuantityKg?.toFixed(2) || "0.00";
  document.getElementById("total-vol").textContent = "-";
  document.getElementById("total-price").textContent = "-";

  if (!shipment.products && shipment.fullReport?.farmerReports?.length) {
    const table = document.getElementById("product-table");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="6" style="text-align: center;">${shipment.itemDisplayName}</td>
    `;
    table.appendChild(row);

    const containerArr = shipment.fullReport.farmerReports[0].containers || [];
    for (let i = 0; i < containerArr.length; i++) {
      const qrImg = document.createElement("img");
      qrImg.className = "qr-code";
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(containerArr[i])}&size=60x60`;
      const containerRow = document.createElement("tr");
      const tdContainer = document.createElement("td");


      tdContainer.appendChild(qrImg);
      tdContainer.style.textAlign = "center";

      containerRow.appendChild(tdContainer);
const tdQuality = document.createElement("td");
      tdQuality.textContent = containerArr[i].grade || "-";
      containerRow.appendChild(tdQuality);
      const tdPrice = document.createElement("td");
      tdPrice.textContent = "--";
      containerRow.appendChild(tdPrice);
      const weightKg = document.createElement("td");
      weightKg.textContent = containerArr[i].weightKg?.toFixed(2) || "0.00";
      containerRow.appendChild(weightKg);

      const tdTotalPrice = document.createElement("td");
      const TotalPrice = containerArr[i].totalPrice || 0;
      tdTotalPrice.textContent = TotalPrice.toFixed(2) || "0.00";
      containerRow.appendChild(tdTotalPrice);
      

      const tdVol = document.createElement("td");
      tdVol.textContent = "-";
      containerRow.appendChild(tdVol);
      


      table.appendChild(containerRow);
    }
  }
}
