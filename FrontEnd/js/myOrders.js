import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

const API_BASE = "http://localhost:4000";
const container = document.getElementById("orders-container");

document.getElementById("logout-link").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }
  document.getElementById("logout-link").onclick = async () => {
    await signOut(auth);
    window.location.href = "login.html";
  };
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
    renderOrders(orders);
  } catch (err) {
    console.error("Error loading orders:", err);
    container.innerHTML = `<p>Could not load orders.</p>`;
  }
}

function renderOrders(orders) {
  if (!orders.length) {
    container.innerHTML = "<p>No orders made yet...</p>";
    return;
  }

  orders.sort((a, b) => {
    const ad = a.deliveryDate?.seconds || a.deliveryDate?._seconds || new Date(a.deliveryDate).getTime()/1000;
    const bd = b.deliveryDate?.seconds || b.deliveryDate?._seconds || new Date(b.deliveryDate).getTime()/1000;
    return bd - ad; // latest first
  });

  orders.forEach(order => {
    let deliveryDate = new Date();
    if (order.deliveryDate?.seconds) {
      deliveryDate = new Date(order.deliveryDate.seconds * 1000);
    } else if (order.deliveryDate?._seconds) {
      deliveryDate = new Date(order.deliveryDate._seconds * 1000);
    } else if (typeof order.deliveryDate === "string" || typeof order.deliveryDate === "number") {
      deliveryDate = new Date(order.deliveryDate);
    }

    const yyyy = deliveryDate.getFullYear();
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

    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <div class="order-line">
        <span><strong>Delivery:</strong> ${dd}/${mm}/${yyyy} ${shift} (${deliveryTime})</span>
        <span><strong>Status:</strong> ${order.status}</span>
        <button onclick="window.location.href='delivery-note.html?orderId=${order.id}'">Delivery Note</button>
      </div>
    `;
    container.appendChild(div);
  });
}
