import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";
const API_BASE = "http://localhost:4000";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }
  renderDashboard();
  // Always get fresh token for secure API calls
  const token = await user.getIdToken();
  loadUpcomingOrdersByShift(token);
});

async function loadUpcomingOrdersByShift(token) {
  const container = document.getElementById("committed-orders-cards");
  if (!container) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/orders/orders-for-upcoming-shifts`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = "<p>No upcoming orders found.</p>";
      return;
    }

    data.forEach((shiftData) => {
      const card = document.createElement("div");
      card.className = "stat-card orders";
      card.innerHTML = `
        <span class="card-icon">📝</span>
        <h3>${shiftData.shift} Shift (${shiftData.date})</h3>
        <p class="stat-value">${shiftData.totalOrders} Orders</p>

        <button onclick="location.href='fm-shift-orders.html?shift=${shiftData.shift}&date=${shiftData.date}'">
  View
</button>

      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load upcoming orders:", err);
    container.innerHTML = "<p>Error loading orders. Check console.</p>";
  }
}

async function renderDashboard() {
  const createContainer = document.getElementById("next-shifts");
  const reqContainer = document.getElementById("shipment-req-list");
  createContainer.innerHTML = "";
  reqContainer.innerHTML = "";

  try {
    const res = await fetch(
      "http://localhost:4000/api/farmerManager/dashboardStatus"
    );
    const { shipmentSummary, createStock } = await res.json();

    // Show up to 4 not-created shifts
    createStock.slice(0, 4).forEach(({ date, shift }) => {
      const div = document.createElement("div");
      div.className = "shift-line";
      div.innerHTML = `
      <span><strong>${date}</strong> - ${shift}</span>
      <button onclick="window.location.href='fm-createStock.html?date=${encodeURIComponent(
        date
      )}&shift=${encodeURIComponent(shift)}'">
        Create Stock
      </button>
    `;
      createContainer.appendChild(div);
    });

    // Show all created shifts with counts
    shipmentSummary.forEach(({ date, shift, count }) => {
      const div = document.createElement("div");
      div.className = "shift-line";
      div.innerHTML = `
      <span><strong>${date}</strong> - ${shift}</span>
      <span>${count} Orders requests</span>
      <button onclick="window.location.href='fm-shipmentRequests.html?date=${encodeURIComponent(
        date
      )}&shift=${encodeURIComponent(shift)}'">
        View Requests
      </button>
    `;
      reqContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load dashboard shifts", err);
    createContainer.innerHTML = "<p>Error loading shift data.</p>";
    reqContainer.innerHTML = "";
  }
}
