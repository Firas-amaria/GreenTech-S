import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

const API_BASE = "http://localhost:4000";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }

  // Always get fresh token for secure API calls
  const token = await user.getIdToken();
  loadUpcomingOrdersByShift(token);
});

async function loadUpcomingOrdersByShift(token) {
  const container = document.getElementById("committed-orders-cards");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/orders-by-shift`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = "<p>No upcoming orders found.</p>";
      return;
    }

    data.forEach(shiftData => {
      const card = document.createElement("div");
      card.className = "stat-card orders";
      card.innerHTML = `
        <span class="card-icon">📝</span>
        <h3>${shiftData.shift} Shift (${shiftData.date})</h3>
        <p class="stat-value">${shiftData.totalOrders} Orders</p>

        <button onclick="location.href='a_shift-orders.html?shift=${shiftData.shift}&date=${shiftData.date}'">
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
