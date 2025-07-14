import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

const API_BASE = "http://localhost:4000";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }

  await loadCheckout();
});




async function loadCheckout() {
  const container = document.getElementById("checkout-container");
  const totalEl = document.getElementById("checkout-total");
  const addressEl = document.getElementById("checkout-address");

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const shift = localStorage.getItem("selectedShift");
  const address = localStorage.getItem("selectedAddress");

  if (!cart.length || !shift || !address) {
    container.innerHTML = "<p>Missing cart data or delivery info. Redirecting...</p>";
    setTimeout(() => window.location.href = "cart.html", 1500);
    return;
  }

  let total = 0;

  // Wrap items in a neat container
  const itemsList = document.createElement("div");
  itemsList.className = "items-list";

  cart.forEach((item) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <strong>${item.itemName} from ${item.sourceFarmName} by ${item.sourceFarmerName}</strong>
      <div class="cart-details-line">
        <span>Qty: ${item.quantity} kg</span>
        <span>Price: $${item.price.toFixed(2)}/kg</span>
        <span>Subtotal: $${subtotal.toFixed(2)}</span>
      </div>
    `;
    itemsList.appendChild(div);
  });

  container.appendChild(itemsList);

  totalEl.textContent = `Total: $${total.toFixed(2)}`;
  addressEl.innerHTML = `
    <p><strong>Delivery Address:</strong> ${address}</p>
    <p><strong>Delivery:</strong> ${formatDeliveryLine(shift)}</p>
  `;
}

window.goBack = function () {
  window.location.href = "cart.html";
};


window.submitOrder = async function() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const stockId = localStorage.getItem("selectedShift");
  const address = localStorage.getItem("selectedAddress");

  const total = parseFloat(document.getElementById("checkout-total").textContent.replace("Total: $", ""));

  if (!cart.length || !stockId || !address) {
    alert("Missing order data. Please review your cart.");
    return;
  }

  // Extract delivery date & shift from stockId
  // Example: LC-1_AS_2025_07_12_morning
  const parts = stockId.split("_");
  const year = parts[2];
  const month = parts[3];
  const day = parts[4];
  const deliveryShift = parts[5];

  // Build proper ISO date for start of day
  const deliveryDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();

  // Calculate total KG
  const totalKg = cart.reduce((sum, item) => sum + item.quantity, 0);

  try {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in.");
      return;
    }
    const token = await user.getIdToken();

    const orderPayload = {
      items: cart,
      deliveryAddress: address,
      deliveryDate,
      deliveryShift,
      totalOrderValue: total,
      totalOrderWeightKg: totalKg,
      customerName: user.displayName ,
    };

   const res = await fetch("http://localhost:4000/api/market/submit-order", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(orderPayload)
});

if (!res.ok) {
  const errorText = await res.text();
  throw new Error(`Order submission failed: ${errorText}`);
}

const data = await res.json();

// ✅ Redirect to delivery-note.html with the returned orderId
if (data.orderId) {
  window.location.href = `delivery-note.html?orderId=${data.orderId}`;
} else {
  alert("Order placed, but no order ID was returned.");
}


    if (!res.ok) throw new Error("Failed to submit order.");

    alert("✅ Order submitted successfully!");
    localStorage.removeItem("cart");
    localStorage.removeItem("selectedShift");
    localStorage.removeItem("selectedAddress");
    window.location.href = `delivery-note.html?orderId=${data.orderId}`;

  } catch (err) {
    console.error("Submit order failed:", err);
    alert("Could not complete your order. Please try again.");
  }
};


function formatDeliveryLine(shiftId) {
  // Example shiftId: "LC-1_AS_2025_07_09_morning"
  const parts = shiftId.replace("LC-1_AS_", "").split("_");
  if (parts.length < 4) return "Unknown delivery";

  const [year, month, day, shiftName] = parts;

  const shifts = {
    morning: { start: "01:00", end: "07:00" },
    afternoon: { start: "07:00", end: "13:00" },
    evening: { start: "13:00", end: "19:00" },
    night: { start: "19:00", end: "01:00" }
  };

  const shiftInfo = shifts[shiftName];
  if (!shiftInfo) return "Unknown delivery";

  // Compute delivery window 1 hour before shift end
  let endHour = parseInt(shiftInfo.end.split(":")[0]);
  let endMin = shiftInfo.end.split(":")[1];

  let startHour = endHour - 1;
  if (startHour < 0) startHour += 24;

  const formatTime = (h, m) => `${h.toString().padStart(2,"0")}:${m}`;
  const windowStr = `${formatTime(startHour, endMin)}-${formatTime(endHour, endMin)}`;

  return `Delivery: ${day}/${month}/${year} ${shiftName} (${windowStr})`;
}
