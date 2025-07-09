import { auth, onAuthStateChanged ,signOut} from "./firebase-init.js";

const API_BASE = "http://localhost:4000";

let user = null;
let selectedAddress = "";
let deliveryShift = "";
let marketItems = [];
let selectedCategory = "";
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let shiftLocked = false;

document.getElementById("logout-link").addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    alert("You have been logged out.");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Failed to logout. Please try again.");
  }
});

// ==== 1. AUTH CHECK + INITIAL DATA ====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to access the market.");
    window.location.href = "login.html";
  } else {
    const token = await user.getIdToken();
    await loadCustomerAddress(token);
    await loadAvailableShifts(token);

    const savedShift = localStorage.getItem("selectedShift");
    const savedAddress = localStorage.getItem("selectedAddress");
    if (savedShift && savedAddress) {
      deliveryShift = savedShift;
      selectedAddress = savedAddress;
      shiftLocked = true;

      selectedCategory = "All";
      updateCategoryButtons();

      document.getElementById("shift-select").value = savedShift;

      marketItems = await loadStockItems(token, savedShift);
      document.getElementById("category-selection").style.display = "block";
      document.getElementById("search-section").style.display = "block";
      renderMarketPreview();
  document.querySelector(".market-wrapper").scrollIntoView({ behavior: "smooth" });

}

    updateCartCount();
  }
});




async function loadCustomerAddress(token) {
  try {
    const res = await fetch(`${API_BASE}/api/customer/saved-address`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load address");
    const data = await res.json();
    selectedAddress = data.address;
    document.getElementById("address-select").innerHTML = `<option>${data.address}</option>`;
  } catch (err) {
    console.error("Error loading address:", err);
    alert("Could not load your delivery address.");
  }
}


async function loadAvailableShifts(token) {
  try {
    const res = await fetch(`${API_BASE}/api/market/available-shifts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load shifts");
    const shifts = await res.json();
    console.log("Available shifts:", shifts);
    const select = document.getElementById("shift-select");
    select.innerHTML = `<option value="">-- Choose shift --</option>`;
    shifts.forEach((shift) => {
      const option = document.createElement("option");
      option.value = shift.id;
      option.textContent = shift.label;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading shifts:", err);
    alert("Could not load available shifts.");
  }
}

window.handleShiftSelect = async function () {
  console.log("handleShiftSelect fired");

  const stockId = document.getElementById("shift-select").value;
  console.log("DEBUG: Selected stockId:", stockId);

  if (!stockId || stockId === "" || stockId === "undefined") {
    alert("Please select a valid shift.");
    return;
  }

  if (shiftLocked && cart.length > 0) {
    if (!confirm("Your cart is not empty! Changing the shift will empty your cart.\n\nDo you want to discard your cart and change delivery?")) {
      document.getElementById("shift-select").value = deliveryShift;
      return;
    } else {
      cart = [];
      localStorage.removeItem("cart");
      updateCartCount();
      alert("Cart has been cleared. Please select items for the new shift.");
    }
  }

  deliveryShift = stockId;
  shiftLocked = true;

  selectedCategory = "All";
  updateCategoryButtons();

  const token = await auth.currentUser.getIdToken();
  marketItems = await loadStockItems(token, stockId);

  localStorage.setItem("selectedShift", deliveryShift);
  localStorage.setItem("selectedAddress", selectedAddress);

  document.getElementById("category-selection").style.display = "block";
  document.getElementById("search-section").style.display = "block";

  renderMarketPreview();
  document.querySelector(".market-wrapper").scrollIntoView({ behavior: "smooth" });


};


// ==== LOAD STOCK ITEMS ====
async function loadStockItems(token, stockId) {
  try {
    const res = await fetch(`${API_BASE}/api/market/available-stock/${stockId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load stock items.");
    return await res.json();
  } catch (err) {
    console.error("Error loading stock items:", err);
    alert("Could not load items for this shift.");
    return [];
  }
}


// ====  CATEGORY FILTER ====
window.filterCategory = function (category) {
  selectedCategory = category;
  updateCategoryButtons();   // 👈 calls this right after
  renderMarketPreview(false);
};

function updateCategoryButtons() {
  document.querySelectorAll(".category-navbar button").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = document.getElementById(`cat-${selectedCategory}`);
  if (activeBtn) activeBtn.classList.add("active");
}


// ==== 5. SEARCH ====
window.handleSearch = function () {
  const input = document.getElementById("search-input").value.toLowerCase();
  const resultsContainer = document.getElementById("search-results");
  resultsContainer.innerHTML = "";

  if (!input.trim()) return;

  const match = mockItemList.find((item) =>
    `${item.itemName} ${item.variety}`.toLowerCase().includes(input)
  );

  if (!match) {
    resultsContainer.innerHTML = `<p class="no-stock-message">No such item exists in the system.</p>`;
    return;
  }

  const inStock = marketItems.find((i) => i.itemId === match.itemId);

  if (!inStock) {
    resultsContainer.innerHTML = `<p class="no-stock-message">${match.itemName} is currently out of stock.</p>`;
    return;
  }

  renderItemCard(inStock, resultsContainer, false);
};


// ==== 6. MARKET DISPLAY ====
function renderMarketPreview() {
  const container = document.getElementById("market-container");
  container.innerHTML = "";

  const itemsToShow = selectedCategory === "All"
    ? marketItems
    : marketItems.filter(item => item.category === selectedCategory);

  if (itemsToShow.length === 0) {
    container.innerHTML = "<p>No items to display.</p>";
    return;
  }

  itemsToShow.forEach(item => renderItemCard(item, container));
}

function renderItemCard(item, container) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <img src="${item.itemImageUrl || 'https://via.placeholder.com/100?text=No+Image'}" />
    <div>
      <h4>${item.itemDisplayName}</h4>
      <p>Farmer: ${item.sourceFarmerName}</p>
      <p>Price: $${item.pricePerUnit}/kg</p>
      <div class="controls">
        <button class="dec">-</button>
        <input type="text" value="1" readonly />
        <button class="inc">+</button>
      </div>
      <p class="stock-warning" style="display: none; color: red; font-size: 13px; margin: 4px 0;"></p>
      <button class="add-to-cart-btn">Add to Cart</button>
    </div>
  `;

  const input = card.querySelector("input");
  const inc = card.querySelector(".inc");
  const dec = card.querySelector(".dec");
  const addToCart = card.querySelector(".add-to-cart-btn");
  const stockWarning = card.querySelector(".stock-warning");

  function validateQuantity() {
    const qty = parseFloat(input.value);
    if (qty > item.currentAvailableQuantityKg) {
      stockWarning.textContent = `Only ${item.currentAvailableQuantityKg} kg left in stock`;
      stockWarning.style.display = "block";
      addToCart.disabled = true;
      if (item.currentAvailableQuantityKg <= 0) stockWarning.textContent = "Out of stock";
    } else {
      stockWarning.style.display = "none";
      addToCart.disabled = false;
    }
  }

  inc.onclick = () => {
    if (item.currentAvailableQuantityKg > parseFloat(input.value)) {
      input.value = (parseFloat(input.value) + 1).toFixed(1);
      validateQuantity();
    } else {
      alert(`Cannot add more than ${item.currentAvailableQuantityKg} kg to cart.`);
      inc.disabled = true;
    }
  };

  dec.onclick = () => {
    inc.disabled = false;
    if (parseFloat(input.value) > 0.0) {
      input.value = (parseFloat(input.value) - 1).toFixed(1);
      validateQuantity();
    }
  };

  addToCart.onclick = async () => {
    const qty = parseFloat(input.value);
    if (qty > item.currentAvailableQuantityKg) {
      alert("Not enough stock available.");
      return;
    }

    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/api/market/reserve-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stockId: deliveryShift,
        itemId: item.itemId,
        sourceFarmerId: item.sourceFarmerId,
        quantity: qty
      })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(`Failed to add to cart: ${data.error || "Unknown error"}`);
      return;
    }

    // ✅ Only after confirmed reserve in backend
    item.currentAvailableQuantityKg -= qty;

    const cartItem = {
      itemId: item.itemId,
      itemName: item.itemDisplayName,
      price: item.pricePerUnit,
      shippingReqId: item.shippingReqId || null,
      sourceFarmName: item.sourceFarmName || "Unknown Farm",
      sourceFarmerName: item.sourceFarmerName || "Unknown Farmer",
      sourceFarmerId: item.sourceFarmerId || null,
      quantity: qty,
      timestamp: Date.now()
    };

    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find(i => i.itemId === cartItem.itemId);
    if (existing) {
      existing.quantity += qty;
      existing.timestamp = cartItem.timestamp;
    } else {
      cart.push(cartItem);
    }
    localStorage.setItem("cart", JSON.stringify(cart));

    renderMarketPreview();
    alert(`${item.itemDisplayName} added to cart (${qty} kg)`);

    setTimeout(async () => {
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const index = cart.findIndex(i => i.itemId === cartItem.itemId);
      if (index !== -1) {
        const returnedQty = cart[index].quantity;
        const stockItem = marketItems.find(i => i.itemId === cartItem.itemId);
        if (stockItem) stockItem.currentAvailableQuantityKg += returnedQty;

        // ✅ Call backend to restore
        await fetch(`${API_BASE}/api/market/restore-item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            stockId: deliveryShift,
            itemId: stockItem.itemId,
            sourceFarmerId: stockItem.sourceFarmerId,
            quantity: returnedQty
          })
        });

        cart.splice(index, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        renderMarketPreview();
      }
    }, 600000
    ); // 5 minutes to restore item stock
  };

  validateQuantity();
  container.appendChild(card);
}


function updateCartCount() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countSpan = document.getElementById("cart-count");
  if (countSpan) {
    countSpan.textContent = totalItems;
  }
}




// ==== 8. CHANGE DELIVERY HANDLER ====
window.handleChangeDelivery = function () {
  if (cart.length > 0) {
    if (confirm("You have items in your cart. Do you want to clear your cart to change delivery?")) {
      cart = [];
      localStorage.removeItem("cart");
      shiftLocked = false;
      deliveryShift = "";
      document.getElementById("shift-select").value = "";
      document.getElementById("category-selection").style.display = "none";
      document.getElementById("search-section").style.display = "none";
      document.getElementById("market-container").innerHTML = "<p>Please select a new delivery shift and address.</p>";
      alert("Cart cleared. You can now select a new delivery.");
    } else {
      alert("Keep your existing cart to finish checkout first.");
    }
  } else {
    shiftLocked = false;
    deliveryShift = "";
    document.getElementById("shift-select").value = "";
    document.getElementById("category-selection").style.display = "none";
    document.getElementById("search-section").style.display = "none";
    document.getElementById("market-container").innerHTML = "<p>Please select a new delivery shift and address.</p>";
    alert("You can now choose a different delivery shift.");
  }
};
