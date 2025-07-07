import { getCurrentUserToken } from "../js/firebase-init.js";

// Global variables
let approvedShipments = [];
let shipmentRequests = [];
let parsedLands = [];
let itemList = [];

//API call function
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

async function fetchFarmerLands() {
  const token = await getCurrentUserToken();
  const response = await fetch(
    "http://localhost:4000/api/farmer/getFarmerLands",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

async function fetchItemList() {
  const token = await getCurrentUserToken();
  const response = await fetch("http://localhost:4000/api/farmer/getItemList", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

async function loadDashboardData() {
  try {
    showLoadingIndicator("Loading dashboard data...");

    approvedShipments = await fetchApprovedShipments();
    shipmentRequests = await fetchShipmentRequests();
    parsedLands = await fetchFarmerLands();
    itemList = await fetchItemList();

    hideLoadingIndicator();
    return true;
  } catch (error) {
    console.warn("Failed to load from API, using fallback data:", error);
    hideLoadingIndicator();
    showToast("Using offline mode - some features may be limited", "warning");

    return false;
  }
}

// Approve shipment request via API
async function approveRequestViaAPI(requestId) {
  try {
    // return await apiCall(`/shipments/requests/${requestId}/approve`, {
    //   method: "POST",
    // });
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

function getItemDisplayName(itemId) {
  const item = itemList.find((it) => it.id === itemId);
  if (!item) {
    console.warn("No item found for ID:", itemId);
    return "Unknown Crop";
  }
  return item.name;
}

// ===== 2) Helpers =====
function formatDateOnly(isoString) {
  const d = new Date(isoString);
  return isNaN(d)
    ? isoString
    : `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`;
}

// ===== 3) Populate Approved Shipments Table =====
function populateApprovedTable() {
  const tbody = document.querySelector("#tblApprovedDash tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  approvedShipments.sort(
    (a, b) => new Date(a.pickupTime) - new Date(b.pickupTime)
  );
  approvedShipments.forEach((sh) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sh.id}</td>
      <td>${formatDateOnly(sh.pickupTime)}</td>
      <td>${sh.item}</td>
      <td><button class="small btn-primary" onclick="goToReport('${
        sh.id
      }')">Shipment Report</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== 4) Populate Shipment Requests Table =====
function populateRequestsTable() {
  const tbody = document.querySelector("#tblRequestsDash tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  shipmentRequests.forEach((req) => {
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
  });
}

// ===== 5) Populate Crops Status Table (Read-Only) =====
function populateCropsTable() {
  const tbody = document.querySelector("#tblCropsDash tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  parsedLands.forEach((land) => {
    const crop = land.crop;

    // Skip lands that don't have crops
    if (!crop) {
      console.log(`Land ${land.landName} has no crops, skipping...`);
      return;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${land.landName}</td>
      <td>${getItemDisplayName(crop.itemId)}</td>
      <td>${crop.plantedAmount}</td>
      <td>${formatDateOnly(crop.plantedDate)}</td>
      <td>${crop.status}</td>
      <td>${crop.updatedAt}</td>
      <td>${crop.statusPercentage + "%"}</td>
      <td><img src="${
        crop.imageUrl || "https://via.placeholder.com/50"
      }" alt="${
      getItemDisplayName(crop.itemId) || "Crop"
    }" width="50" height="50"/></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== 6) Approve Request Handler =====
//TODO comaback after fin f-crop and understanding more
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

      // Reload data from API
      await loadDashboardData();
      populateApprovedTable();
      populateRequestsTable();
      populateCropsTable();
    } catch (apiError) {
      console.warn("API failed, updating locally:", apiError);
      showToast("Approved locally - will sync when online", "warning");

      // Fallback to local update
      const idx = shipmentRequests.findIndex((r) => r.id === requestId);
      if (idx < 0) return;
      const req = shipmentRequests.splice(idx, 1)[0];
      const newShipmentId = approvedShipments.length
        ? Math.max(...approvedShipments.map((s) => s.id)) + 1
        : 301;
      approvedShipments.push({
        id: newShipmentId,
        item: req.item,
        amount: req.amount,
        pickupTime: req.pickupTime,
      });
      populateApprovedTable();
      populateRequestsTable();
    }

    // Restore button
    button.textContent = originalText;
    button.disabled = false;
  } catch (error) {
    console.error("Failed to approve request:", error);
    showToast("Failed to approve request. Please try again.", "error");
  }
}

// ===== 7) Redirect to Report =====
function goToReport(shipmentId) {
  window.location.href = `f_shipment_report.html?shipmentId=${shipmentId}`;
}

// ===== 9) Init =====
window.addEventListener("load", async () => {
  // Load data from API
  await loadDashboardData();

  // Populate all tables
  populateApprovedTable();
  populateRequestsTable();
  populateCropsTable();

  console.log("Farmer dashboard initialized with API integration");
});
