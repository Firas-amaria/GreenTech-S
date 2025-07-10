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

function populateShipmentDetails(shipment) {
  document.getElementById("spanShipmentId").textContent = shipmentId;
  document.getElementById("spanItem").textContent =
    shipment.itemDisplayName || "—";
  document.getElementById("spanAmount").textContent = `${
    shipment.finalConfirmedQuantityKg || 0
  } kg`;
  document.getElementById("spanPickupTime").textContent =
    shipment.scheduledPickupTimeSlot || "—";
  document.getElementById("spanStatus").textContent =
    shipment.overallStatus || "—";

  const latestReport = shipment.fullReport?.farmerReports?.slice(-1)[0];
  if (latestReport?.submittedAt?._seconds) {
    const date = new Date(latestReport.submittedAt._seconds * 1000);

    document.getElementById("spanSubmittedAt").textContent =
      date.toLocaleString();
  }
}

function populateContainers(farmerReports) {
  const containerList = document.getElementById("containerList");
  containerList.innerHTML = "";

  if (farmerReports.length === 0) {
    containerList.innerHTML = "<p>No container data found.</p>";
    return;
  }

  const lastReport = farmerReports[farmerReports.length - 1];
  const containers = lastReport.containers;

  containers.forEach((container) => {
    const div = document.createElement("div");
    div.classList.add("container-block");

    div.innerHTML = `
      <h3>Container Code: ${container.code}</h3>
      <p><strong>Weight:</strong> ${container.weightKg} kg</p>
      <p><strong>Grade:</strong> ${container.grade} </p>

      <p><strong>Harvested Time:</strong> ${new Date(
        container.harvestedTime
      ).toLocaleString()}</p>
      <details>
        <summary>Quality Parameters</summary>
        <ul>
          ${Object.entries(container)
            .filter(([k]) => !["code", "weightKg", "harvestedTime"].includes(k))
            .map(([key, val]) => `<li><strong>${key}:</strong> ${val}</li>`)
            .join("")}
        </ul>
      </details>
    `;
    containerList.appendChild(div);
  });
}

function populateHistory(history = []) {
  const ul = document.getElementById("historyList");
  ul.innerHTML = "";

  if (history.length === 0) {
    ul.innerHTML = "<li>No history available.</li>";
    return;
  }

  history
    .sort((a, b) => b.timestamp?._seconds - a.timestamp?._seconds)
    .forEach((entry) => {
      const li = document.createElement("li");
      const timeStr = entry.timestamp?._seconds
        ? new Date(entry.timestamp._seconds * 1000).toLocaleString()
        : "—";

      li.textContent = `[${timeStr}] ${entry.user}: ${entry.action}`;
      ul.appendChild(li);
    });
}
