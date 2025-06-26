// cart.js
document.addEventListener("DOMContentLoaded", () => {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartContainer = document.getElementById("cart-items");
  const totalPriceEl = document.getElementById("total-price");

  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("cart-summary").style.display = "none";
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const itemDiv = document.createElement("div");
    itemDiv.className = "item-card";
    itemDiv.style.flexDirection = "row";
    itemDiv.style.justifyContent = "space-between";

    itemDiv.innerHTML = `
      <div style="text-align: left;">
        <h4>${item.name}</h4>
        <p>Price: $${item.price.toFixed(2)}/kg</p>
        <p>Quantity: ${item.quantity} kg</p>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
      </div>
      <button onclick="removeItem(${index})" class="remove-btn">Remove</button>
    `;

    cartContainer.appendChild(itemDiv);
  });

  totalPriceEl.textContent = total.toFixed(2);
});

function loadCartItems() {
  // ===== BACKEND API CALL (Commented Example) =====
  /*
  fetch('/api/cart', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}` // if needed
    }
  })
  .then(res => res.json())
  .then(cart => {
    renderCart(cart);
  });
  */

  // ==== MOCK LOCAL STORAGE ====
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  renderCart(cart);
}


window.removeItem = function (index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));

  // Remove saved shift/address if cart is now empty
  if (cart.length === 0) {
    localStorage.removeItem("selectedShift");
    localStorage.removeItem("selectedAddress");
  }

  location.reload(); // refresh cart view
};

window.checkout = function () {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const shift = localStorage.getItem("selectedShift");
  const address = localStorage.getItem("selectedAddress");

  if (!cart.length || !shift || !address) {
    alert("Your cart is missing items or delivery info.");
    return;
  }

  // Simulate backend submission
  console.log("Order placed:", {
    items: cart,
    deliveryShift: shift,
    deliveryAddress: address,
    timestamp: new Date().toISOString()
  });

  // Clear cart and delivery info
  localStorage.removeItem("cart");
  localStorage.removeItem("selectedShift");
  localStorage.removeItem("selectedAddress");

  // Show confirmation
  document.body.innerHTML = `
    <main class="section" style="text-align: center;">
      <h2>Thank you for your order! 🧺</h2>
      <p>Your order for the <strong>${shift}</strong> shift will be delivered to:</p>
      <p><strong>${address}</strong></p>
      <p style="margin-top: 20px;">You can view your orders in the <a href="myOrders.html">My Orders</a> page.</p>
      <a href="market.html" class="add-to-cart-btn" style="display: inline-block; margin-top: 30px;">Back to Market</a>
    </main>
  `;
};

