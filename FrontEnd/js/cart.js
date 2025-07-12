import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";
const API_BASE = "http://localhost:4000";

// ==== AUTH & LOGOUT ====
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please log in to view your cart.");
    window.location.href = "login.html";
  }
});


// ==== LOAD CART ====
document.addEventListener("DOMContentLoaded", loadCartItems);

async function loadCartItems() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartContainer = document.getElementById("cart-items");
  const totalPriceEl = document.getElementById("total-price");

  cartContainer.innerHTML = "";
  let total = 0;

  for (let index = 0; index < cart.length; index++) {
    const item = cart[index];
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <div style="display: flex; align-items: center;">
        <img src="${item.itemImageUrl || 'https://via.placeholder.com/80?text=No+Image'}"
             alt="${item.itemName}" style="width: 80px; height: 80px; object-fit: cover; margin-right: 15px; border-radius: 8px;">
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 4px;">
            ${item.itemName} from ${item.sourceFarmName} by ${item.sourceFarmerName}
          </div>
          <div class="cart-details-line">
            quantity: <button class="dec-btn">-</button> 
            <span class="qty">${item.quantity}</span>kg 
            <button class="inc-btn">+</button>
            price: $${item.price.toFixed(2)}/kg
            subtotal: $${subtotal.toFixed(2)}
            <button class="remove-btn" style="margin-left: auto;">Remove</button>
          </div>
        </div>
      </div>
    `;

    const decBtn = itemDiv.querySelector(".dec-btn");
    const incBtn = itemDiv.querySelector(".inc-btn");
    const removeBtn = itemDiv.querySelector(".remove-btn");

    decBtn.onclick = async () => {
      if (item.quantity > 0.5) {
        await restoreStock(item, 0.5);
        item.quantity = parseFloat((item.quantity - 0.5).toFixed(1));
        localStorage.setItem("cart", JSON.stringify(cart));
        loadCartItems();
      } else {
        alert("Use remove to delete this item.");
      }
    };

    incBtn.onclick = async () => {
      const reserved = await reserveStock(item, 0.5);
      if (reserved) {
        item.quantity = parseFloat((item.quantity + 0.5).toFixed(1));
        localStorage.setItem("cart", JSON.stringify(cart));
        loadCartItems();
      } else {
        alert("Not enough stock to increase quantity.");
      }
    };

    removeBtn.onclick = async () => {
      await restoreStock(item, item.quantity);
      cart.splice(index, 1);
      localStorage.setItem("cart", JSON.stringify(cart));
      if (cart.length === 0) {
        localStorage.removeItem("selectedShift");
        localStorage.removeItem("selectedAddress");
      }
      loadCartItems();
    };

    cartContainer.appendChild(itemDiv);
  }

  totalPriceEl.textContent = total.toFixed(2);

  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("cart-summary").style.display = "none";
  } else {
    document.getElementById("cart-summary").style.display = "block";
  }
}

// ==== RESERVE & RESTORE CALLS ====
async function reserveStock(item, qty) {
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/api/market/reserve-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        stockId: localStorage.getItem("selectedShift"),
        itemId: item.itemId,
        sourceFarmerId: item.sourceFarmerId,
        quantity: qty
      })
    });
    return res.ok;
  } catch (err) {
    console.error("Reserve error:", err);
    return false;
  }
}

async function restoreStock(item, qty) {
  try {
    const token = await auth.currentUser.getIdToken();
    await fetch(`${API_BASE}/api/market/restore-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        stockId: localStorage.getItem("selectedShift"),
        itemId: item.itemId,
        sourceFarmerId: item.sourceFarmerId,
        quantity: qty
      })
    });
  } catch (err) {
    console.error("Restore error:", err);
  }
}

// ==== CHECKOUT ====
window.checkout = function () {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const shift = localStorage.getItem("selectedShift");
  const address = localStorage.getItem("selectedAddress");

  if (!cart.length || !shift || !address) {
    alert("Your cart or delivery info is incomplete.");
    return;
  }

  console.log("Ready to checkout:", { cart, shift, address });

  window.location.href = "checkout.html";
};
