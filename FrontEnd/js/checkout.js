window.addEventListener("DOMContentLoaded", () => {
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
  cart.forEach((item) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    const subtotal = item.price * item.quantity;
    total += subtotal;
    div.innerHTML = `
      <strong>${item.itemName}</strong><br>
      Quantity: ${item.quantity} kg<br>
      Price: $${item.price.toFixed(2)}/kg<br>
      Subtotal: $${subtotal.toFixed(2)}
    `;
    container.appendChild(div);
  });

  totalEl.textContent = `Total: $${total.toFixed(2)}`;
  addressEl.innerHTML = `
    <p><strong>Delivery Address:</strong> ${address}</p>
    <p><strong>Delivery Shift:</strong> ${shift}</p>
  `;
});

function goBack() {
  window.location.href = "cart.html";
}

function submitOrder() {
  // Save submission flag and redirect
  localStorage.setItem("orderSubmitted", "true");
  window.location.href = "delivery-note.html";
}