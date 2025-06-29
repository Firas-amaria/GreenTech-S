// farmerManagerDashboard.js

console.log("Farmer Manager Dashboard script loaded.");

// Load dashboard data on page load
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});

function loadDashboard() {
  // ================================
  // 1. FETCH DATA FROM BACKEND
  // ================================
  // Replace these with your real API calls
  // Example:
  // fetch('/api/farmerManager/dashboard')
  //   .then(res => res.json())
  //   .then(data => renderDashboard(data));

  // For now, using mock data
  const data = {
    shipmentRequests: [
      { shift: 'Morning', items: 'Lettuce: 100kg', status: 'Accepted by 2 farmers' },
      { shift: 'Afternoon', items: 'Tomatoes: 80kg', status: 'Pending farmer responses' },
    ],
    upcomingShifts: [
      { shift: 'Evening', expected: 'Cucumbers: 50kg' },
      { shift: 'Tomorrow Morning', expected: 'Carrots: 120kg' },
    ],
    ordersPlaced: [
      { item: 'Lettuce', qty: '200kg', farmers: 'Farmer A, Farmer B' },
      { item: 'Tomatoes', qty: '150kg', farmers: 'Not assigned yet' },
    ]
  };

  // ================================
  // 2. RENDER THE DATA
  // ================================
  renderShipmentRequests(data.shipmentRequests);
  renderUpcomingShifts(data.upcomingShifts);
  renderOrdersPlaced(data.ordersPlaced);
}

function renderShipmentRequests(requests) {
  const tableBody = document.getElementById("shipment-requests");
  tableBody.innerHTML = ""; // clear old
  requests.forEach(req => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.shift}</td>
      <td>${req.items}</td>
      <td>${req.status}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderUpcomingShifts(shifts) {
  const tableBody = document.getElementById("upcoming-shifts");
  tableBody.innerHTML = ""; // clear old
  shifts.forEach(shift => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${shift.shift}</td>
      <td>${shift.expected}</td>
      <td><button onclick="createRequest('${shift.shift}')">Create Request</button></td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderOrdersPlaced(orders) {
  const tableBody = document.getElementById("orders-placed");
  tableBody.innerHTML = ""; // clear old
  orders.forEach(order => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.item}</td>
      <td>${order.qty}</td>
      <td>${order.farmers}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function createRequest(shift) {
  alert(`Open creation form for ${shift}`);
  // Here you can redirect or open a modal
  // Example:
  // window.location.href = `/farmerManager-createRequest.html?shift=${encodeURIComponent(shift)}`
}
