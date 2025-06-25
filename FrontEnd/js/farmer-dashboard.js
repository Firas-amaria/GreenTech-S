// ==========================================
// farmer-dashboard.js — Fixed Dashboard Logic
// ==========================================

// ===== 1) Sample Data =====
const approvedShipments = [
  { id: 301, item: "Tomato", amount: 120, pickupTime: "2025-06-02T08:00" },
  { id: 302, item: "Lettuce", amount: 80, pickupTime: "2025-06-01T09:30" },
  { id: 303, item: "Potato", amount: 200, pickupTime: "2025-06-04T11:00" },
];

const shipmentRequests = [
  { id: 1, item: "Carrot", amount: 50, pickupTime: "2025-06-03T10:00" },
  { id: 2, item: "Spinach", amount: 40, pickupTime: "2025-06-05T13:30" },
];

const parsedLands = [
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

const itemList = [
  { itemName: "Tomato", variety: "Cherry", itemId: "001" },
  { itemName: "Lettuce", variety: "Iceberg", itemId: "002" },
  { itemName: "Potato", variety: "White", itemId: "003" },
  { itemName: "Carrot", variety: "Nantes", itemId: "004" },
  { itemName: "Spinach", variety: "Savoy", itemId: "005" },
];

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
      <td><button class="small btn-primary" onclick="goToReport(${
        sh.id
      })">Shipment Report</button></td>
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
      <td><button class="small btn-success" onclick="approveDash(${
        req.id
      })">Approve</button></td>
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
    const tr = document.createElement("tr");
    const crop = land.Crops;
    tr.innerHTML = `
      <td>${land.name}</td>
      <td>${getItemDisplayName(crop.itemId)}</td>
      <td>${crop.plantedAmount}</td>
      <td>${formatDateOnly(crop.plantedOn)}</td>
      <td>${crop.status}</td>
      <td>${formatDateOnly(crop.updatedOn)}</td>
      <td>${crop.percentage !== null ? crop.percentage + "%" : "N/A"}</td>
      <td><img src="${crop.imageUrl}" alt="${getItemDisplayName(
      crop.itemId
    )}" width="50" height="50"/></td>

    `;
    tbody.appendChild(tr);
  });
}

// ===== 6) Approve Request Handler =====
function approveDash(requestId) {
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
  alert(`Request #${requestId} approved as Shipment #${newShipmentId}.`);
}

// ===== 7) Redirect to Report =====
function goToReport(shipmentId) {
  window.location.href = `shipment-report.html?shipmentId=${shipmentId}`;
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
window.addEventListener("load", () => {
  populateApprovedTable();
  populateRequestsTable();
  populateCropsTable();
});
