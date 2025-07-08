document.addEventListener("DOMContentLoaded", () => {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartContainer = document.getElementById("cart-items");
  const totalPriceEl = document.getElementById("total-price");

  const now = Date.now();
  const validCart = cart.filter(item => !item.timestamp || (now - item.timestamp) < 180000);
  if (validCart.length !== cart.length) {
    localStorage.setItem("cart", JSON.stringify(validCart));
  }

  if (validCart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("cart-summary").style.display = "none";
    return;
  }

  let total = 0;
  validCart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const itemDiv = document.createElement("div");
    itemDiv.className = "item-card";
    itemDiv.style.flexDirection = "row";
    itemDiv.style.justifyContent = "space-between";

    itemDiv.innerHTML = `
      <div style="text-align: left;">
        <h4>${item.itemName}</h4>
        <p>Price: ${item.price.toFixed(2)}/kg</p>
        <p>Quantity: ${item.quantity} kg</p>
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
      </div>
      <button onclick="removeItem(\${index})" class="remove-btn">Remove</button>
    `;

    cartContainer.appendChild(itemDiv);
  });

  totalPriceEl.textContent = total.toFixed(2);
});

function loadCartItems() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  renderCart(cart);
}

window.removeItem = function (index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));

  if (cart.length === 0) {
    localStorage.removeItem("selectedShift");
    localStorage.removeItem("selectedAddress");
  }

  location.reload();
};

window.checkout = function () {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const shift = localStorage.getItem("selectedShift");
  const address = localStorage.getItem("selectedAddress");

  const now = Date.now();
  const stillValid = cart.every(item => !item.timestamp || (now - item.timestamp) < 180000);
  if (!stillValid) {
    alert("Some items in your cart expired. Please review your cart.");
    location.reload();
    return;
  }

  if (!cart.length || !shift || !address) {
    alert("Your cart is missing items or delivery info.");
    return;
  }

  // Proceed to checkout summary page
  window.location.href = "checkout.html";
};