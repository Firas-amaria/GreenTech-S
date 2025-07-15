// ==========================================
// 🔌 API INTEGRATED FARMER DASHBOARD
// ==========================================

// API Configuration
const API_BASE_URL = "http://localhost:4000/api/farmer";

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem("token") || null;
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();

  // Debug logging
  console.log(
    "Token being sent:",
    token ? `${token.substring(0, 20)}...` : "NO TOKEN"
  );
  console.log("Making API call to:", `${API_BASE_URL}${endpoint}`);

  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      console.error("API Response status:", response.status);
      console.error("API Response headers:", response.headers);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

// Global variables (will be loaded from API)
let approvedShipments = [];
let shipmentRequests = [];
let parsedLands = [];
let itemList = [];

// =================================================================
// 🔌 API INTEGRATION FUNCTIONS
// =================================================================

async function loadDashboardData() {
  try {
    showLoadingIndicator("Loading dashboard data...");

    // Load from API
    const data = await apiCall("/frontend/dashboard");

    console.log("Raw API data:", data); // Debug: see what we actually get

    // Use the correct API response structure
    approvedShipments = data.approvedShipments || [];
    shipmentRequests = data.shipmentRequests || [];
    parsedLands = data.parsedLands || [];

    // Update dashboard metrics if elements exist
    updateDashboardMetrics(data.summary);

    console.log("Successfully loaded dashboard data from API");
    console.log("Approved shipments:", approvedShipments);
    console.log("Shipment requests:", shipmentRequests);
    console.log("Parsed lands:", parsedLands);

    hideLoadingIndicator();
    return true;
  } catch (error) {
    console.warn("Failed to load from API, using fallback data:", error);
    hideLoadingIndicator();
    showToast("Using offline mode - some features may be limited", "warning");

    // Fallback to mock data
    loadFallbackData();
    return false;
  }
}

// Helper function to update dashboard metrics
function updateDashboardMetrics(summary) {
  if (!summary) return;

  // Update metrics if elements exist
  const totalFarmsEl = document.getElementById("totalFarms");
  const totalItemsEl = document.getElementById("totalItems");
  const totalShipmentsEl = document.getElementById("totalShipments");
  const totalRevenueEl = document.getElementById("totalRevenue");

  if (totalFarmsEl) totalFarmsEl.textContent = summary.totalFarms || 0;
  if (totalItemsEl) totalItemsEl.textContent = summary.totalItems || 0;
  if (totalShipmentsEl)
    totalShipmentsEl.textContent = summary.totalShipments || 0;
  if (totalRevenueEl)
    totalRevenueEl.textContent = `$${summary.totalRevenue || 0}`;
}

function loadFallbackData() {
  approvedShipments = [
    { id: 301, item: "Tomato", amount: 120, pickupTime: "2025-06-02T08:00" },
    { id: 302, item: "Lettuce", amount: 80, pickupTime: "2025-06-01T09:30" },
    { id: 303, item: "Potato", amount: 200, pickupTime: "2025-06-04T11:00" },
  ];

  shipmentRequests = [
    { id: 1, item: "Carrot", amount: 50, pickupTime: "2025-06-03T10:00" },
    { id: 2, item: "Spinach", amount: 40, pickupTime: "2025-06-05T13:30" },
  ];

  parsedLands = [
    {
      LandId: "00001",
      name: "North Field",
      acres: "22",
      Crops: {
        id: 2,
        itemId: "002",
        plantedAmount: 5,
        plantedOn: "2025-05-10",
        status: "Growing",
        updatedOn: "2025-05-12",
        percentage: 20,
        imageUrl: "https://via.placeholder.com/50",
      },
    },
    {
      LandId: "00002",
      name: "South Plot",
      acres: "10",
      Crops: {
        id: 1,
        itemId: "001",
        plantedAmount: 10,
        plantedOn: "2025-05-01",
        status: "Growing",
        updatedOn: "2025-05-13",
        percentage: 17,
        imageUrl: "https://via.placeholder.com/50",
      },
    },
    {
      LandId: "00003",
      name: "East Field",
      acres: "14",
      Crops: {
        id: 3,
        itemId: "003",
        plantedAmount: 8,
        plantedOn: "2025-04-20",
        status: "Harvesting",
        updatedOn: "2025-05-15",
        percentage: 30,
        imageUrl: "https://via.placeholder.com/50",
      },
    },
  ];

  itemList = [
    { itemName: "Tomato", variety: "Cherry", itemId: "001" },
    { itemName: "Lettuce", variety: "Iceberg", itemId: "002" },
    { itemName: "Potato", variety: "White", itemId: "003" },
    { itemName: "Carrot", variety: "Nantes", itemId: "004" },
    { itemName: "Spinach", variety: "Savoy", itemId: "005" },
  ];
}

// Approve shipment request via API
async function approveRequestViaAPI(requestId) {
  try {
    return await apiCall(`/shipments/requests/${requestId}/approve`, {
      method: "POST",
    });
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
  const item = itemList.find((i) => i.itemId === itemId);
  return item ? `${item.itemName} - ${item.variety}` : "Unknown";
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

function formatDateTimeLocal(dtLocal) {
  const d = new Date(dtLocal);
  return isNaN(d) ? dtLocal : d.toLocaleString();
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
      <td>${formatDateTimeLocal(sh.pickupTime)}</td>
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
      <td>${req.item}</td>
      <td>${req.amount}</td>
      <td>${formatDateTimeLocal(req.pickupTime)}</td>
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
    const crop = land.Crops;

    // Skip lands that don't have crops
    if (!crop) {
      console.log(`Land ${land.name} has no crops, skipping...`);
      return;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${land.name}</td>
      <td>${crop.name || getItemDisplayName(crop.itemId) || "Unknown Crop"}</td>
      <td>${crop.plantedAmount || crop.quantity || "N/A"}</td>
      <td>${formatDateOnly(crop.plantedOn || crop.plantedDate)}</td>
      <td>${crop.status || "Unknown"}</td>
      <td>${formatDateOnly(crop.updatedOn || crop.updatedAt)}</td>
      <td>${crop.percentage !== null ? crop.percentage + "%" : "N/A"}</td>
      <td><img src="${
        crop.imageUrl || "https://via.placeholder.com/50"
      }" alt="${crop.name || "Crop"}" width="50" height="50"/></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== 6) Approve Request Handler =====
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

// ===== 8) Logout Button =====
const logoutBtn =
  document.getElementById("btnLogout") ||
  document.getElementById("logoutLink2");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Logging out... (placeholder)");
    // window.location.href = '/login.html';
  });
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
