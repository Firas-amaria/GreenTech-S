/*******************************************************
 * script.js
 * 
 * Dynamic front‐end “Farmer Dashboard” demo. All core
 * behaviors (sorting, approving, status transitions)
 * are fully functional without a backend. Wherever a
 * real API call is needed, you’ll find comments marked
 * `// BACKEND:` telling you exactly what to swap in later.
 ******************************************************/

// ===== 1) In‐Memory Sample Data =====
// (Eventually replace with fetch(...) from your backend)

let approvedShipments = [
  { id: 301, item: 'Tomato', amount: 120, pickupTime: '2025-06-02T08:00' },
  { id: 302, item: 'Lettuce', amount: 80, pickupTime: '2025-06-01T09:30' },
  { id: 303, item: 'Potato', amount: 200, pickupTime: '2025-06-04T11:00' }
];

let shipmentRequests = [
  { id: 1, item: 'Carrot', amount: 50, pickupTime: '2025-06-03T10:00' },
  { id: 2, item: 'Spinach', amount: 40, pickupTime: '2025-06-05T13:30' }
];

let cropsData = 
 [
      {
        id: 1,
        item: 'Tomato',
        plantedAmount: 10,
        plantedOn: '2025-05-01T07:00',
        status: 'Planting',
        lastUpdated: '2025-05-01T07:00',
         percentage: '50%'
      },
      {
        id: 2,
        item: 'Lettuce',
        plantedAmount: 5,
        plantedOn: '2025-05-10T06:00',
        status: 'Growing',
        lastUpdated: '2025-05-11T07:00',
         percentage: '90%'
      },
      {
        id: 3,
        item: 'Potato',
        plantedAmount: 8,
        plantedOn: '2025-04-20T06:30',
        status: 'Harvesting',
         percentage: '85%'
      }
    ];



// ===== Possible Crop Status Stages in Order =====
const cropStatusOptions = [
  "Planting",
  "Growing",
  "Crop Maintenance",
  "Blooming",
  "Fruit Set",
  "Ripening",
  "Harvesting",
  "Harvested",
  "Field Clearing"
];

// ===== Utility: Format a "YYYY-MM-DDTHH:MM" string to Human‐Readable =====
function formatDateTimeLocal(dtLocal) {
  const d = new Date(dtLocal);
  if (isNaN(d)) return dtLocal;
  return d.toLocaleString(); // e.g. "6/2/2025, 8:00:00 AM"
}

// ===== 2) Sidebar Navigation Logic =====
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const viewId = btn.dataset.view;
    views.forEach(v => {
      v.id === viewId ? v.classList.add('active') : v.classList.remove('active');
    });
  });
});

// ===== 3) Populate Approved Shipments Table =====
function populateApprovedTable() {
  // Sort by soonest pickupTime (ascending)
  approvedShipments.sort((a, b) => new Date(a.pickupTime) - new Date(b.pickupTime));

  const tbody = document.querySelector('#tblApproved tbody');
  tbody.innerHTML = '';

  approvedShipments.forEach(sh => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sh.id}</td>
      <td>${formatDateTimeLocal(sh.pickupTime)}</td>
      <td>${sh.item}</td>
      <td>
        <button class="small btn-primary" onclick="goToShipmentReport(${sh.id})">
          Shipment Report
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Placeholder: “Go to Shipment Report” for a given ID
function goToShipmentReport(shipmentId) {
  alert(`(Placeholder) Navigate to Shipment Report page for ID ${shipmentId}`);
  // BACKEND: Replace alert with real navigation, e.g.:
  // window.location.href = `/shipment-report.html?shipmentId=${shipmentId}`;
}

// ===== 4) Populate Shipment Requests Table =====
function populateRequestsTable() {
  const tbody = document.querySelector('#tblRequests tbody');
  tbody.innerHTML = '';

  shipmentRequests.forEach(req => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${req.item}</td>
      <td>${req.amount}</td>
      <td>${formatDateTimeLocal(req.pickupTime)}</td>
      <td>
        <button class="small btn-success" onclick="approveRequest(${req.id})">
          Approve
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Approve a request: remove from requests, add to approved, re‐render
function approveRequest(requestId) {
  const idx = shipmentRequests.findIndex(r => r.id === requestId);
  if (idx < 0) return;

  // Remove from in‐memory requests
  const req = shipmentRequests.splice(idx, 1)[0];

  // Create a new approved shipment (generate a new ID for demo)
  const newShipmentId = (approvedShipments.length
    ? Math.max(...approvedShipments.map(s => s.id)) + 1
    : 301
  );
  approvedShipments.push({
    id: newShipmentId,
    item: req.item,
    amount: req.amount,
    pickupTime: req.pickupTime
  });

  // Re‐render both tables
  populateRequestsTable();
  populateApprovedTable();

  alert(`Request #${requestId} approved as Shipment #${newShipmentId}.`);

  // BACKEND: Instead of the above in‐memory logic, do:
  // await fetch(`/api/shipments/requests/${requestId}/approve`, { method: 'POST' });
  // Then re‐fetch from backend or update local arrays accordingly.
}

// ===== 5) Populate Crops Status Table =====
function populateCropsTable() {
  const tbody = document.querySelector('#tblCrops tbody');
  tbody.innerHTML = '';

  cropsData.forEach(crop => {
    const tr = document.createElement('tr');

    // Determine current status index
    const currentIndex = cropStatusOptions.indexOf(crop.status);
    const isFinal = currentIndex === cropStatusOptions.length - 1; // "Field Clearing"

    // Build <select> if not final, else just show text
    let statusCell = '';
    if (!isFinal) {
      const nextStatus = cropStatusOptions[currentIndex + 1];
      statusCell = `
        <td class="inline-edit">
          <select data-id="${crop.id}" onchange="updateCropStatus(${crop.id}, this.value)">
            <option value="">--Choose Next--</option>
            <option value="${nextStatus}">${nextStatus}</option>
          </select>
        </td>
      `;
    } else {
      statusCell = `<td>${crop.status}</td>`;
    }

    tr.innerHTML = `
      <td>${crop.item}</td>
      <td>${crop.plantedAmount}</td>
      <td>${formatDateTimeLocal(crop.plantedOn)}</td>
      ${statusCell}
    `;
    tbody.appendChild(tr);
  });
}

// Update a crop’s status to its next stage
function updateCropStatus(cropId, chosenStatus) {
  if (!chosenStatus) return; // no selection

  const idx = cropsData.findIndex(c => c.id === cropId);
  if (idx < 0) return;

  const currentIdx = cropStatusOptions.indexOf(cropsData[idx].status);
  const nextIdx = cropStatusOptions.indexOf(chosenStatus);

  // Ensure they only pick exactly currentIndex + 1
  if (nextIdx !== currentIdx + 1) {
    alert('You can only advance to the next stage.');
    populateCropsTable();
    return;
  }

  // If next stage is "Harvested", prompt for harvested amount
  if (chosenStatus === 'Harvested') {
    const harvestAmt = prompt(
      `Enter the harvested amount (kg) for "${cropsData[idx].item}":`
    );
    const num = parseFloat(harvestAmt);
    if (isNaN(num) || num < 0) {
      alert('Invalid harvested amount. Status not updated.');
      populateCropsTable();
      return;
    }
    cropsData[idx].harvestedAmount = num;
    // BACKEND: Later, send this harvested amount to your API:
    // await fetch(`/api/crops/${cropId}/harvest`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ harvestedAmount: num })
    // });
  }

  // Update status
  cropsData[idx].status = chosenStatus;

  // BACKEND: In a full integration, send the new status to the server:
  // await fetch(`/api/crops/${cropId}/status`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ status: chosenStatus })
  // });

  populateCropsTable();
}

// ===== 6) Logout Button =====
document.getElementById('btnLogout').addEventListener('click', () => {
  alert('Logging out... (placeholder)');
  // BACKEND: Call your logout endpoint or clear tokens, then:
  // window.location.href = '/login.html';
});

// ===== 7) Initial Render =====
populateApprovedTable();
populateRequestsTable();
populateCropsTable();

// ===== 8) Future: Fetch Initial Data from Backend =====
// Once you’re ready to hook into a real API, you can replace the in‐memory arrays above
// with something like:
//
// async function fetchInitialData() {
//   // Fetch approved shipments
//   let resApproved = await fetch('/api/shipments/approved');
//   approvedShipments = await resApproved.json();
//
//   // Fetch pending requests
//   let resRequests = await fetch('/api/shipments/requests');
//   shipmentRequests = await resRequests.json();
//
//   // Fetch all crops
//   let resCrops = await fetch('/api/crops');
//   cropsData = await resCrops.json();
//
//   populateApprovedTable();
//   populateRequestsTable();
//   populateCropsTable();
// }
//
// window.onload = fetchInitialData;
