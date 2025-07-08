import { auth, onAuthStateChanged } from "./firebase-init.js";

const API_BASE = "http://localhost:4000";

let user = null;
let selectedAddress = "";
let deliveryShift = "";
let marketItems = [];
let selectedCategory = "";
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let shiftLocked = false;

// ==== 1. AUTH CHECK + INITIAL DATA ====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to access the market.");
    window.location.href = "login.html";
  } else {
    const token = await user.getIdToken(); // directly from the user
    await loadCustomerAddress(token);
    await loadAvailableShifts(token);
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

  if (cart.length > 0 && shiftLocked) {
    alert("You cannot change the shift while cart has items.");
    document.getElementById("shift-select").value = deliveryShift;
    return;
  }

  deliveryShift = stockId;
  shiftLocked = true;

  const token = await auth.currentUser.getIdToken();
  //console.log("DEBUG: Token for fetching stock items:", token);
  marketItems = await loadStockItems(token, stockId);

  document.getElementById("category-selection").style.display = "block";
  document.getElementById("search-section").style.display = "block";

  renderMarketPreview(false);
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
    <img src="https://via.placeholder.com/100?text=${encodeURIComponent(item.itemDisplayName)}" />
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
    const qty = parseInt(input.value);
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
    if (item.currentAvailableQuantityKg > input.value) {
      input.value = parseInt(input.value) + 1;
      validateQuantity();
    } else {
      alert(`Cannot add more than ${item.currentAvailableQuantityKg} kg to cart.`);
      inc.disabled = true;
    }
  };

  dec.onclick = () => {
    inc.disabled = false;
    if (parseInt(input.value) > 1) {
      input.value = parseInt(input.value) - 1;
      validateQuantity();
    }
  };

  addToCart.onclick = () => {
    const qty = parseInt(input.value);
    if (qty > item.currentAvailableQuantityKg) {
      alert("Not enough stock available.");
      return;
    }
    item.currentAvailableQuantityKg -= qty;

    const cartItem = {
      itemId: item.itemId,
      itemName: item.itemDisplayName,
      price: item.pricePerUnit,
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

    setTimeout(() => {
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const index = cart.findIndex(i => i.itemId === cartItem.itemId);
      if (index !== -1) {
        const returnedQty = cart[index].quantity;
        const stockItem = marketItems.find(i => i.itemId === cartItem.itemId);
        if (stockItem) stockItem.currentAvailableQuantityKg += returnedQty;
        cart.splice(index, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        renderMarketPreview();
      }
    }, 180000);
  };

  validateQuantity();
  container.appendChild(card);
}




// ==== 7. CART LOGIC (Only Save, No Display Yet) ====
function saveToCart(item, qty) {
  const cartItem = {
    itemId: item.itemId,
    itemName: item.itemDisplayName,
    price: item.pricePerUnit,
    quantity: qty,
    timestamp: Date.now()
  };

  // ===== BACKEND API CALL (Commented Example) =====
  /*
  fetch('/api/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include auth token if required
    },
    body: JSON.stringify({
      itemId: cartItem.itemId,
      quantity: cartItem.quantity
    })
  }).then(res => res.json()).then(data => {
    // Handle response
  });
  */

  // ==== MOCK LOCAL STORAGE ====
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(i => i.itemId === cartItem.itemId);
  if (existing) {
    existing.quantity += qty;
    existing.timestamp = cartItem.timestamp;
  } else {
    cart.push(cartItem);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  setTimeout(() => restoreFromCart(cartItem.itemId), 180000);
}


