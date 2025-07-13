import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

const API_BASE = "http://localhost:4000";
const container = document.getElementById("orders-container");
let allOrders = [];



onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }
  const token = await user.getIdToken();
  await loadOrders(token);
});

async function loadOrders(token) {
  try {
    const res = await fetch(`${API_BASE}/api/customer/customer-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load orders");
    const orders = await res.json();
    allOrders = orders;
    renderOrders(orders);
  } catch (err) {
    console.error("Error loading orders:", err);
    container.innerHTML = `<p>Could not load orders.</p>`;
  }
}

function renderOrders(orders) {
  container.innerHTML = "";
  if (!orders.length) {
    container.innerHTML = "<p>No orders made yet...</p>";
    return;
  }

  orders.sort((a, b) => {
    const ad = new Date(a.deliveryDate?.seconds * 1000 || a.deliveryDate).getTime();
    const bd = new Date(b.deliveryDate?.seconds * 1000 || b.deliveryDate).getTime();
    return bd - ad;
  });

orders.forEach(order => {
  const deliveryDate = new Date(order.deliveryDate);
  const yy = String(deliveryDate.getFullYear()).slice(2);
  const mm = String(deliveryDate.getMonth() + 1).padStart(2, '0');
  const dd = String(deliveryDate.getDate()).padStart(2, '0');
  const shift = order.deliveryShift;

  let deliveryTime = "";
  switch (shift) {
    case "morning": deliveryTime = "6:00-7:00"; break;
    case "afternoon": deliveryTime = "12:00-13:00"; break;
    case "evening": deliveryTime = "18:00-19:00"; break;
    case "night": deliveryTime = "23:00-00:00"; break;
  }
console.log(order.id);
  const div = document.createElement("div");
  div.className = "order-item";
  div.innerHTML = `
    <div class="order-line">
      <span><strong>Delivery:</strong> ${dd}/${mm}/${yy} ${shift} (${deliveryTime})</span>
      <span><strong>Status:</strong> ${order.status} <span class="order-emoji"></span></span>
      <button onclick="window.location.href='delivery-note.html?orderId=${order.id}'">Delivery Note</button>
    </div>
  `;

  const emojiSpan = div.querySelector(".order-emoji");
  switch(order.status) {
    case "farm": emojiSpan.textContent = "👨‍🌾"; break;
    case "in transit": emojiSpan.textContent = "🚚"; break;
    case "delivering": emojiSpan.textContent = "🧑🛵"; break;
    case "delivered": emojiSpan.textContent = "🏠"; break;
  }

  container.appendChild(div);
});

}
// FILTER HANDLERS
document.getElementById("time-filter").addEventListener("change", (e) => {
  const val = e.target.value;
  if (val === "custom") {
    document.getElementById("start-date").style.display = "inline-block";
    document.getElementById("end-date").style.display = "inline-block";
    document.getElementById("filter-button").style.display = "inline-block";
  } else {
    document.getElementById("start-date").style.display = "none";
    document.getElementById("end-date").style.display = "none";
    document.getElementById("filter-button").style.display = "none";
    filterOrders(val);
  }
});
document.getElementById("filter-button").addEventListener("click", () => {
  const start = new Date(document.getElementById("start-date").value);
  const end = new Date(document.getElementById("end-date").value);
  filterOrders("custom", start, end);
});

function filterOrders(type, start, end) {
  let filtered = allOrders;
  const now = new Date();
  
  if (type === "week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    filtered = allOrders.filter(o => new Date(o.deliveryDate) >= startOfWeek);
  } else if (type === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filtered = allOrders.filter(o => new Date(o.deliveryDate) >= startOfMonth);
  } else if (type === "custom") {
    filtered = allOrders.filter(o => {
      const d = new Date(o.deliveryDate);
      return d >= start && d <= end;
    });
  }

  renderOrders(filtered);
}

