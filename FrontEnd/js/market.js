import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";
import { initMapPicker, openMapPicker } from "./mapPicker.js";

const API_BASE = "http://localhost:4000";

let selectedAddress = "";
let deliveryShift = "";
let marketItems = [];
let selectedCategory = "";
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let shiftLocked = false;


// 🔥 LOAD GOOGLE MAPS
async function loadGoogleMapsScript() {
  try {
    const res = await fetch(`${API_BASE}/api/maps/google-maps-script`);
    const data = await res.json();
    const script = document.createElement("script");
    script.src = data.scriptUrl + "&language=en&callback=initMap";
    script.async = true;
    document.head.appendChild(script);
   // console.log("✅ Google Maps script appended");
  } catch (err) {
    console.error("Failed to load Google Maps script", err);
  }
}
loadGoogleMapsScript();

// 🔥 DOM READY ENSURER
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-new-address-btn").style.display = "none";
});

// ✅ MAPS CALLBACK
window.initMap = () => {
  initMapPicker();
  document.getElementById("add-new-address-btn").style.display = "inline-block";
};

// ✅ ADD NEW ADDRESS BUTTON
document.getElementById("add-new-address-btn").addEventListener("click", () => {
  openMapPicker(async (location) => {
    console.log("📍 Chosen location:", location);

    // Store address with lat/lng in localStorage
    localStorage.setItem("selectedAddress", JSON.stringify({
      address: location.address,
      lat: location.lat,
      lng: location.lng
    }));

    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_BASE}/api/customer/save-address`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(location)
    });

    const data = await res.json();
    console.log("💾 Saved to customer collection:", data);
    showToast(data.message || `New address saved: ${location.address} successfully!`, "success");

    await loadCustomerAddress(token, location.address);
  });
});

async function loadCustomerAddress(token, forceSelectAddress = null) {
  try {
    const res = await fetch(`${API_BASE}/api/customer/saved-address`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load addresses");

    const data = await res.json();
    const addresses = data.addresses || [];
    const select = document.getElementById("address-select");
    select.innerHTML = "";

    if (addresses.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No addresses added yet";
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      selectedAddress = "";
    } else {
      addresses.forEach(addr => {
        const option = document.createElement("option");
        option.textContent = addr.address;
        option.value = addr.address;
        select.appendChild(option);
      });

      // 🔥 Read saved from localStorage
      const savedRaw = localStorage.getItem("selectedAddress");
      let saved = null;
      if (savedRaw) {
        try {
          saved = JSON.parse(savedRaw);
        } catch (err) {
          saved = null;
        }
      }

      // ✅ Try to match
      let matched = null;
      if (forceSelectAddress) {
        matched = addresses.find(a => a.address === forceSelectAddress);
      } else if (saved) {
        matched = addresses.find(a => a.address === saved.address);
      }

      if (matched) {
        selectedAddress = {
          address: matched.address,
          lat: matched.latitude,
          lng: matched.longitude
        };
        select.value = matched.address;
      } else {
        const first = addresses[0];
        selectedAddress = {
          address: first.address,
          lat: first.latitude,
          lng: first.longitude
        };
        select.value = first.address;
      }

      // Always sync localStorage
      localStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
    }

    // ✅ On change: save the selected full address with lat/lng
    select.onchange = (e) => {
      const selectedAddrObj = addresses.find(a => a.address === e.target.value);
      selectedAddress = {
        address: selectedAddrObj.address,
        lat: selectedAddrObj.latitude,
        lng: selectedAddrObj.longitude
      };
      localStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
      console.log("✅ Address updated to:", selectedAddress);
      renderMarketPreview();
    };

  } catch (err) {
    console.error("Error loading addresses:", err);
    showToast("Could not load your delivery addresses.");
  }
}




// ✅ AUTH & INIT LOAD
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
      //document.querySelector(".market-wrapper").scrollIntoView({ behavior: "smooth" });
    }
    updateCartCount();
  }
  /*
const token = await user.getIdToken();
const r = await fetch("http://localhost:4000/api/market/items", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const items = await r.json();
  console.log("ITEMS:", items);
 */


});



// ==== SHIFT LOADING & HANDLING
async function loadAvailableShifts(token) {
  try {
    const res = await fetch(`${API_BASE}/api/market/available-shifts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load shifts");
    const shifts = await res.json();
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
    showToast("Could not load available shifts.", "error");
    
  }
}

window.handleShiftSelect = async function () {
  const stockId = document.getElementById("shift-select").value;
  if (!stockId) {
    showToast("Please select a valid shift.", "warning");
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
      showToast("Cart has been cleared. Please select items for the new shift.", "info");
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
 // document.querySelector(".market-wrapper").scrollIntoView({ behavior: "smooth" });
};

// 🔥 UPDATE CART COUNT
function updateCartCount() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let totalItems = cart.length;
  document.getElementById("cart-count").textContent = totalItems;
}


// ==== LOAD STOCK ITEMS
async function loadStockItems(token, stockId) {
  try {
    const res = await fetch(`${API_BASE}/api/market/available-stock/${stockId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load stock items.");
    return await res.json();
  } catch (err) {
    console.error("Error loading stock items:", err);
    showToast("Could not load items for this shift.", "error");
    return [];
  }
}


// ==== CATEGORY + SEARCH HANDLERS
window.filterCategory = function (category) {
  selectedCategory = category;
  updateCategoryButtons();
  renderMarketPreview();
};

function updateCategoryButtons() {
  document.querySelectorAll(".category-navbar button").forEach(btn => btn.classList.remove("active"));
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
      <p>${item.sourceFarmName} by ${item.sourceFarmerName}</p>
      <p>Price: $${item.pricePerUnit.toFixed(2)}/kg</p>
      <div class="controls">
        <button class="dec">-</button>
        <input type="text" value="0.5" readonly />
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
      input.value = (parseFloat(input.value) + 0.5).toFixed(1);
      validateQuantity();
    } else {
      showToast(`Cannot add more than ${item.currentAvailableQuantityKg} kg to cart.`, "warning");
      inc.disabled = true;
    }
  };

  dec.onclick = () => {
    inc.disabled = false;
    if (parseFloat(input.value) > 0.0) {
      input.value = (parseFloat(input.value) - 0.5).toFixed(1);
      validateQuantity();
    }
  };

  addToCart.onclick = async () => {
    const qty = parseFloat(input.value);
    if (qty > item.currentAvailableQuantityKg) {
      showToast("Not enough stock available.", "error");
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
      showToast(`Failed to add to cart: ${data.error || "Unknown error"}`, "error");
      return;
    }

    // ✅ Only after confirmed reserve in backend
    item.currentAvailableQuantityKg -= qty;

    const cartItem = {
      itemId: item.itemId,
      itemName: item.itemDisplayName,
      itemImageUrl: item.itemImageUrl,
      price: item.pricePerUnit,
      shipReqId: item.shipReqId || null,
      sourceFarmName: item.sourceFarmName || "Unknown Farm",
      sourceFarmerName: item.sourceFarmerName || "Unknown Farmer",
      sourceFarmerId: item.sourceFarmerId || null,
      quantity: qty,
      timestamp: Date.now()
    };

    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find(i => i.itemId === cartItem.itemId && i.sourceFarmerId === cartItem.sourceFarmerId);
    if (existing) {
      existing.quantity += qty;
      existing.timestamp = cartItem.timestamp;
    } else {
      cart.push(cartItem);
    }
    localStorage.setItem("cart", JSON.stringify(cart));

    updateCartCount();
    renderMarketPreview();
    showToast(`${item.itemDisplayName} added to cart (${qty} kg)`, "success");

    setTimeout(async () => {
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const index = cart.findIndex(i => i.itemId === cartItem.itemId && i.sourceFarmerId === cartItem.sourceFarmerId);
      if (index !== -1) {
        const returnedQty = cart[index].quantity;
        const stockItem = marketItems.find(i => i.itemId === cartItem.itemId && i.sourceFarmerId === cartItem.sourceFarmerId);
        if (stockItem) stockItem.currentAvailableQuantityKg += returnedQty;

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
        updateCartCount();
        renderMarketPreview();
      }
    }, 600000); // 10 min to restore
  };

  validateQuantity();
  container.appendChild(card);
}




// ==== 8. CHANGE DELIVERY HANDLER ====
// 🔥 CHANGE DELIVERY HANDLER
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
      showToast("Cart cleared. You can now select a new delivery.", "info");
    } else {
      showToast("Keep your existing cart to finish checkout first.", "warning");
    }
  } else {
    shiftLocked = false;
    deliveryShift = "";
    document.getElementById("shift-select").value = "";
    document.getElementById("category-selection").style.display = "none";
    document.getElementById("search-section").style.display = "none";
    document.getElementById("market-container").innerHTML = "<p>Please select a new delivery shift and address.</p>";
    showToast("You can now choose a different delivery shift.", "info");
  }
};

// message to show toast notifications
// 🔥 TOAST NOTIFICATIONS
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const colors = {
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",
  };

  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 1001;
    padding: 12px 20px; border-radius: 4px; color: white;
    background: ${colors[type] || colors.info};
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    max-width: 300px; word-wrap: break-word;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 4000);
}