import { auth, onAuthStateChanged } from "./firebase-init.js";
import { mockItemList, mockStock, mockAddresses } from "./mockData.js";

let user = null;
let selectedAddress = "";
let deliveryShift = "";
let marketItems = [];
let selectedCategory = "";
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let shiftLocked = false;

// ==== 1. AUTH CHECK ====
onAuthStateChanged(auth, (currentUser) => {
  if (!currentUser) {
    alert("Please log in to access the market.");
    window.location.href = "login.html";
  } else {
    user = currentUser;
    loadSavedAddresses(); // Only load after user verified
  }
});

// ==== 2. ADDRESS HANDLING ====
function loadSavedAddresses() {
  const select = document.getElementById("address-select");
  mockAddresses.forEach((addr) => {
    const option = document.createElement("option");
    option.value = addr;
    option.textContent = addr;
    select.appendChild(option);
  });
}

window.handleAddressChange = function () {
  const select = document.getElementById("address-select");
  const value = select.value;
  const customInput = document.getElementById("custom-address");

  if (value === "custom") {
    customInput.style.display = "block";
    selectedAddress = "";
  } else {
    customInput.style.display = "none";
    selectedAddress = value;
  }
};

// ==== 3. SHIFT HANDLING ====
window.handleShiftSelect = function () {
  if (cart.length > 0 && shiftLocked) {
    alert("You cannot change the shift while cart has items. Please checkout or clear cart.");
    document.getElementById("shift-select").value = deliveryShift;
    return;
  }

  const shift = document.getElementById("shift-select").value;
  const addressInput = document.getElementById("custom-address").value;
  selectedAddress = selectedAddress || addressInput;

  if (!shift || !selectedAddress.trim()) {
    return;
  }

  deliveryShift = shift;
  shiftLocked = true;
  marketItems = mockStock[shift] || [];

  document.getElementById("category-selection").style.display = "block";
  document.getElementById("search-section").style.display = "block";

  renderMarketPreview(false); // Now show full items
};

// ==== 4. CATEGORY FILTER ====
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
function renderMarketPreview(isPreview = true) {
  const container = document.getElementById("market-container");
  container.innerHTML = "";

  const itemsToShow = isPreview
    ? mockItemList.map((item) => ({
        itemId: item.itemId,
        itemDisplayName: `${item.itemName} ${item.variety}`,
        itemPictureUrl: `https://via.placeholder.com/100?text=${item.itemName}`,
      }))
      : selectedCategory === "All"
    ? marketItems
    : marketItems.filter((item) => item.category === selectedCategory);

  if (itemsToShow.length === 0) {
    container.innerHTML = "<p>No items to display.</p>";
    return;
  }

  itemsToShow.forEach((item) => {
    renderItemCard(item, container, isPreview);
  });
}

function renderItemCard(item, container, isPreview = false) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <img src="${item.itemPictureUrl}" />
    <div>
      <h4>${item.itemDisplayName}</h4>
      ${
        isPreview
          ? `<button onclick="alert('Please choose address and shift first.')">Add to Cart</button>`
          : `
            <p>Farmer: ${item.sourceFarmerName}</p>
            <p>Price: $${item.pricePerUnit}/kg</p>
            <div class="controls">
              <button class="dec">-</button>
              <input type="text" value="1" readonly />
              <button class="inc">+</button>
            </div>
            <p class="stock-warning" style="display: none; color: red; font-size: 13px; margin: 4px 0;"></p>
            <button class="add-to-cart-btn">Add to Cart</button>
          `
      }
    </div>
  `;

  if (!isPreview) {
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
        if(item.currentAvailableQuantityKg <= 0) 
          stockWarning.textContent = "Out of stock";
      } 
      else {
        stockWarning.style.display = "none";
        addToCart.disabled = false;
      }
    }

    inc.onclick = () => {
      if(item.currentAvailableQuantityKg >input.value) {
      let val = parseInt(input.value);
      input.value = val + 1;
      validateQuantity();
  }
else {
        alert(`Cannot add more than ${item.currentAvailableQuantityKg} kg to cart.`);
        inc.disabled = true;

      }
    };

    dec.onclick = () => {
      inc.disabled = false;
      let val = parseInt(input.value);
      if (val > 1) {
        input.value = val - 1;
        validateQuantity();
      }
    };

    addToCart.onclick = () => {
  const qty = parseInt(input.value);
  if (qty > item.currentAvailableQuantityKg) {
    alert("Not enough stock available.");
    return;
  }

  // Reduce stock immediately
  item.currentAvailableQuantityKg -= qty;

  // Prepare cart item with timestamp
  const itemName = item.itemDisplayName || `${item.itemName} ${item.variety || ""}`;
  const cartItem = {
    itemId: item.itemId,
    itemName: itemName,
    price: item.pricePerUnit,
    quantity: qty,
    timestamp: Date.now()
  };

  // Add to cart (localStorage)
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(i => i.itemId === cartItem.itemId);
  if (existing) {
    existing.quantity += qty;
    existing.timestamp = cartItem.timestamp;
  } else {
    cart.push(cartItem);
  }
  localStorage.setItem("cart", JSON.stringify(cart));

  renderMarketPreview(false); // Refresh view
  alert(`${itemName} added to cart (${qty} kg)`);

  // ⏱ Set 3-min timer to return to stock
  setTimeout(() => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const index = cart.findIndex(i => i.itemId === cartItem.itemId);
    if (index !== -1) {
      const returnedQty = cart[index].quantity;

      // Return quantity to the live item
      const stockItem = marketItems.find(i => i.itemId === cartItem.itemId);
      if (stockItem) {
        stockItem.currentAvailableQuantityKg += returnedQty;
      }

      cart.splice(index, 1);
      localStorage.setItem("cart", JSON.stringify(cart));
      renderMarketPreview(false); // Re-render view
    }
  }, 180000);
};


    validateQuantity(); // Initial validation
  }

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


