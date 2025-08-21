import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged
} from "./firebase-init.js";

const API_BASE = "http://localhost:4000";
console.log("transportationManager.js loaded");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }

  const token = await user.getIdToken();
  await loadUpcomingOrdersByShift(token);
});

async function loadUpcomingOrdersByShift(token) {
  const container = document.getElementById("orders-summary");
  if (!container) {
    console.error("No element with id 'orders-summary' found.");
    return;
  }

  container.innerHTML = "<p>Loading orders summary...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/orders/getAllOrdersForShifts`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Upcoming orders summary:", data);

    if (!data.length) {
      container.innerHTML = "<p>No upcoming orders found.</p>";
      return;
    }

    container.innerHTML = ""; // clear loading message
var totalOrders = 0;

data.forEach(shiftData => {
  const [datePart, ...shiftParts] = shiftData.shift.split(" ");
  const shiftName = shiftParts.join(" ");
  const card = document.createElement("div");
  card.className = "stat-card orders";
  card.innerHTML = `
    <span class="card-icon">📝</span>
    <h3>${shiftName} (${datePart})</h3>
    <p class="stat-value">${shiftData.orders} Orders</p>
    <button onclick="location.href='tm-shift-orders.html?date=${datePart}&shift=${shiftName.toLowerCase()}'">
      View
    </button>
  `;
  totalOrders=totalOrders+shiftData.orders
  container.appendChild(card);
});
document.getElementById("total-orders").textContent = `${totalOrders}`;


  } catch (err) {
    console.error("Failed to load upcoming orders:", err);
    container.innerHTML = "<p>Error loading orders. Check console.</p>";
  }
}
