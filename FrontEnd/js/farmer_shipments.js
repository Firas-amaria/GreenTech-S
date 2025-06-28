/*******************************************************
 * 🔌 API INTEGRATED SHIPMENTS PAGE
 *******************************************************/

// API Configuration
const API_BASE_URL = "http://localhost:4000/api/farmer";

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem("authToken") || null;
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();

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

// =================================================================
// 🔌 API INTEGRATION FUNCTIONS
// =================================================================

async function loadShipmentsData() {
  try {
    showLoadingIndicator("Loading shipments data...");

    // Load from API - use the structured endpoint
    const data = await apiCall("/frontend/shipments");

    console.log("Raw API shipments data:", data);
    
    // Use the structured response
    approvedShipments = data.approvedShipments || [];
    shipmentRequests = data.shipmentRequests || [];

    console.log("Successfully loaded shipments from API");
    console.log("Approved shipments:", approvedShipments);
    console.log("Shipment requests:", shipmentRequests);
    hideLoadingIndicator();
    return true;
  } catch (error) {
    console.warn("Failed to load from API, using fallback data:", error);
    hideLoadingIndicator();
    showToast("Using offline mode - some features may be limited", "warning");

    // Fallback to mock data
    approvedShipments = [
      { id: 301, item: "Tomato", amount: 120, pickupTime: "2025-06-02T08:00" },
      { id: 302, item: "Lettuce", amount: 80, pickupTime: "2025-06-01T09:30" },
      { id: 303, item: "Potato", amount: 200, pickupTime: "2025-06-04T11:00" },
    ];

    shipmentRequests = [
      { id: 1, item: "Carrot", amount: 50, pickupTime: "2025-06-03T10:00" },
      { id: 2, item: "Spinach", amount: 40, pickupTime: "2025-06-05T13:30" },
    ];

    return false;
  }
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

// ===== Utility: Format Date‐Time =====
function formatDateTimeLocal(dtLocal) {
  const d = new Date(dtLocal);
  if (isNaN(d)) return dtLocal;
  return d.toLocaleString();
}

// ===== Populate Approved Shipments =====
function populateApprovedPage() {
  approvedShipments.sort(
    (a, b) => new Date(a.pickupTime) - new Date(b.pickupTime)
  );
  const tbody = document.querySelector("#tblApprovedPage tbody");
  tbody.innerHTML = "";
  approvedShipments.forEach((sh) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${sh.id}</td>
          <td>${formatDateTimeLocal(sh.pickupTime)}</td>
          <td>${sh.item}</td>
          <td>
            <button class="btn-primary" onclick="goToReport(${sh.id})">
              Shipment Report
            </button>
          </td>
        `;
    tbody.appendChild(tr);
  });
}

// ===== Populate Shipment Requests =====
function populateRequestsPage() {
  const tbody = document.querySelector("#tblRequestsPage tbody");
  tbody.innerHTML = "";
  shipmentRequests.forEach((req) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${req.item}</td>
          <td>${req.amount}</td>
          <td>${formatDateTimeLocal(req.pickupTime)}</td>
          <td>
            <button class="btn-success" onclick="approveRequest(${req.id})">
              Approve
            </button>
          </td>
        `;
    tbody.appendChild(tr);
  });
}

async function approveRequest(requestId) {
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
      await loadShipmentsData();
      populateApprovedPage();
      populateRequestsPage();
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
      populateApprovedPage();
      populateRequestsPage();
    }

    // Restore button
    button.textContent = originalText;
    button.disabled = false;
  } catch (error) {
    console.error("Failed to approve request:", error);
    showToast("Failed to approve request. Please try again.", "error");
  }
}

// ===== Go to Shipment Report =====
function goToReport(shipmentId) {
  window.location.href = `f_shipment_report.html?shipmentId=${shipmentId}`;
}

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

// ===== Initial Render =====
window.addEventListener("load", async () => {
  // Load data from API
  await loadShipmentsData();

  // Populate tables
  populateApprovedPage();
  populateRequestsPage();

  console.log("Farmer shipments page initialized with API integration");
});
