import { getCurrentUserToken } from "../js/firebase-init.js";

// Global variables (will be loaded from API)
let approvedShipments = [];
let shipmentRequests = [];

// =================================================================
// 🔌 API INTEGRATION FUNCTIONS
// =================================================================

async function fetchApprovedShipments() {
  const token = await getCurrentUserToken();
  const response = await fetch(
    "http://localhost:4000/api/farmer/getApprovedShipments",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

async function fetchShipmentRequests() {
  const token = await getCurrentUserToken();
  const response = await fetch(
    "http://localhost:4000/api/farmer/getShipmentRequests",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

async function loadShipmentsData() {
  try {
    showLoadingIndicator("Loading shipments data...");

    approvedShipments = await fetchApprovedShipments();
    shipmentRequests = await fetchShipmentRequests();

    hideLoadingIndicator();
    return true;
  } catch (error) {
    console.warn("Failed to load from API, using fallback data:", error);
    hideLoadingIndicator();
  }
  return false;
}

// Approve shipment request via API
async function approveRequestViaAPI(requestId) {
  try {
    console.log("request id :" + requestId);
    const token = await getCurrentUserToken();

    const response = await fetch(
      `http://localhost:4000/api/farmer/approveShipmentRequest/${requestId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to Approve Shipment Request");
  } catch (error) {
    console.error("Failed to approve request via API:", error);
    throw error;
  }
}

// =================================================================
// 🎨 UI HELPER FUNCTIONS
// =================================================================

function showLoadingIndicator(message = "Loading...") {
  let loader = document.getElementById("loadingIndicator");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loadingIndicator";
    loader.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 1000;
                  text-align: center;">
        <div>${message}</div>
        <div style="margin-top: 10px;">⏳</div>
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    loader.querySelector("div div").textContent = message;
  }
  loader.style.display = "block";
}

function hideLoadingIndicator() {
  const loader = document.getElementById("loadingIndicator");
  if (loader) {
    loader.style.display = "none";
  }
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const colors = {
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",
  };

  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 1001;
    padding: 12px 20px; border-radius: 4px; color: white;
    background: ${colors[type] || colors.info};
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    max-width: 300px; word-wrap: break-word;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 4000);
}

// ===== Utility: Format Date‐Time =====
function formatDateTimeLocal(dtLocal) {
  const d = new Date(dtLocal);
  if (isNaN(d)) return dtLocal;
  return d.toLocaleString();
}
function formatDateOnly(isoString) {
  const d = new Date(isoString);
  return isNaN(d)
    ? isoString
    : `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`;
}

// ===== Populate Approved Shipments =====
function populateApprovedTable() {
  const tbody = document.querySelector("#tblApprovedDash tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  approvedShipments.sort(
    (a, b) => new Date(a.pickupTime) - new Date(b.pickupTime)
  );
  approvedShipments.forEach((sh) => {
    if (sh.overallStatus == "at-farm") {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${sh.itemDisplayName}</td>
      <td>${sh.forecastedQuantityKg}</td>
      <td>${
        formatDateOnly(sh.scheduledPickupDate) +
        "  " +
        sh.scheduledPickupTimeSlot
      }</td>
      <td>${sh.pickupAddress}</td>
      <td><button class="small btn-primary" onclick="createReport('${
        sh.id
      }')">Create Report</button></td>
    `;
      tbody.appendChild(tr);
    } else if (sh.overallStatus == "ready-for-pickup") {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${sh.itemDisplayName}</td>
      <td>${sh.forecastedQuantityKg}</td>
      <td>${
        formatDateOnly(sh.scheduledPickupDate) +
        "  " +
        sh.scheduledPickupTimeSlot
      }</td>
      <td>${sh.pickupAddress}</td>
      <td><button class="small btn-secondary" onclick="viewReport('${
        sh.id
      }')">View Report</button></td>
    `;
      tbody.appendChild(tr);
    }
  });
}

// ===== Populate Shipment Requests =====
function populateRequestsTable() {
  const tbody = document.querySelector("#tblRequestsDash tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  shipmentRequests.forEach((req) => {
    if (req.status === "forecasted") {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${req.itemDisplayName}</td>
      <td>${"Expected:" + req.forecastedQuantityKg}</td>
      <td>${
        formatDateOnly(req.scheduledPickupDate) +
        "  " +
        req.scheduledPickupTimeSlot
      }</td>
<button class="small btn-no-success" >Waiting Finalization</button>
    `;
      tbody.appendChild(tr);
    } else {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${req.itemDisplayName}</td>
      <td>${req.forecastedQuantityKg}</td>
      <td>${
        formatDateOnly(req.scheduledPickupDate) +
        "  " +
        req.scheduledPickupTimeSlot
      }</td>
      <td><button class="small btn-success" onclick="approveDash('${
        req.id
      }')">Approve</button></td>
    `;
      tbody.appendChild(tr);
    }
  });
}

async function approveDash(requestId) {
  try {
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = "Approving...";
    button.disabled = true;

    // Try to approve via API
    try {
      await approveRequestViaAPI(requestId);
      showToast("Request approved successfully!", "success");
    } catch (apiError) {
      console.warn("API failed, updating locally:", apiError);
    }

    // Restore button
    button.textContent = originalText;
    button.disabled = false;
  } catch (error) {
    console.error("Failed to approve request:", error);
    showToast("Failed to approve request. Please try again.", "error");
  }
}
window.approveDash = approveDash;

// ===== 7) Redirect to Report =====
function createReport(shipmentId) {
  window.location.href = `f-shipmentReport.html?shipmentId=${shipmentId}`;
}
window.createReport = createReport;

function viewReport(shipmentId) {
  window.location.href = `f-shipmentReportView.html?shipmentId=${shipmentId}`;
}
window.viewReport = viewReport;

// ===== Initial Render =====
window.addEventListener("load", async () => {
  // Load data from API
  await loadShipmentsData();

  // Populate tables
  populateApprovedTable();
  populateRequestsTable();
});
