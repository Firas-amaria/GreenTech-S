import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";
// STATUS CHANGE API ----  `${API_BASE}/api/customer/:orderId/mark-delivered`



const API_BASE = "http://localhost:4000";

// Get orderId from URL
const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");
if (!orderId) {
  alert("No order ID found in URL!");
  // optionally redirect back
  window.location.href = "myOrders.html";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }

  const token = await user.getIdToken();
  await loadNote(token, orderId);
});

async function loadNote(token, orderId) {
  try {
    const res = await fetch(`${API_BASE}/api/customer/order/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Failed to load order: " + res.status);
    }

    const data = await res.json();
    console.log("Order data:", data);

    renderDeliveryNote(data);
  } catch (err) {
    console.error(err);
    alert("Could not load order details.");
  }
}

/*function renderNote(order) {
  const orderIdEl = document.getElementById("order-id");
  const statusEl = document.getElementById("order-status");
  const totalEl = document.getElementById("order-total");
  const itemsDiv = document.getElementById("order-items");

  if (!orderIdEl || !statusEl || !totalEl || !itemsDiv) {
    console.error("Some HTML elements are missing!");
    return;
  }

  orderIdEl.textContent = order.orderId;
  statusEl.textContent = order.status;
  totalEl.textContent = `${order.totalPrice}₪`;

  order.items.forEach(item => {
    const p = document.createElement("p");
    p.textContent = `${item.name} - ${item.quantity} ${item.unit}`;
    itemsDiv.appendChild(p);
  });
}
*/
  




function renderDeliveryNote(data) {
  
  const userJson = localStorage.getItem("user");
const user = JSON.parse(userJson);
//let addr= JSON.parse(data.deliveryAddress);

const userName = user?.name || "N/A";
  const container = document.getElementById("farmers-container");
const infoDiv = document.getElementById("customer-info");
infoDiv.innerHTML = `<p><strong>Order #:</strong> ${data.orderId}</p>
  <p><strong>Customer Name:</strong> ${userName}</p>
    <p><strong>Address:</strong> ${data.deliveryAddress.address|| "N/A"}</p>
   <p><strong>Delivery Date:</strong> ${data.deliveryDate}</p>
  <p><strong>Delivery Shift:</strong> ${data.deliveryShift || "N/A"}</p>
  <p><strong>Order Status:</strong> ${data.status}</p>

`;


  let totalKg = 0;
  let totalPrice = 0;

  const table = document.createElement("table");
  table.className = "product-table";
  table.innerHTML = `
    <tr>
      <th>Product</th>
      <th>QR Code</th>
      <th>Weight (kg)</th>
      <th>Price ($)</th>
    </tr>
  `;


   data.items.forEach(p => {
  totalKg += p.quantity;
  totalPrice += p.price;

  const productLabel = `${p.itemName} by ${p.sourceFarmName || "UNKNOWN FARM"}`;
  const row = document.createElement("tr");

  // === Column: Product Name ===
  const tdProduct = document.createElement("td");
  tdProduct.textContent = productLabel;
  // === Column: QR Code ===
  const tdQR = document.createElement("td");
  const qrImg = document.createElement("img");
  qrImg.className = "qr-code";
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(productLabel)}&size=60x60`;
  qrImg.style.cursor = "pointer";
  qrImg.onclick = () => openPopup(productLabel, p);
  tdQR.appendChild(qrImg);

  // === Column: Quantity ===
  const tdQty = document.createElement("td");
  tdQty.textContent = p.quantity;

  // === Column: Price ===
  const tdPrice = document.createElement("td");
  tdPrice.textContent = p.price;

  // === Build and append the row ===
  row.appendChild(tdProduct);
  row.appendChild(tdQR);
  row.appendChild(tdQty);
  row.appendChild(tdPrice);
  table.appendChild(row);
});

 

  container.appendChild(table);
  document.getElementById("total-kg").textContent = totalKg;
  document.getElementById("total-price").textContent = totalPrice;

  const noteUrl = "https://yourdomain.com/delivery-note/000294";

// Create the QR code image element
const mainQR = document.createElement("img");
mainQR.className = "qr-code";
mainQR.src = "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(noteUrl) + "&size=120x120";
mainQR.title = "Scan to view this delivery note";
mainQR.style.cursor = "pointer";

// Get the container div and append the QR code
const divMainQr = document.getElementById("main-qr");
// if the status is "DELIVERED" then div color will be green and wont be clickable
if (data.status === "delivered") {
  divMainQr.style.backgroundColor = "#d4edda"; // Light green background
  mainQR.style.pointerEvents = "none"; // Disable click
}

divMainQr.appendChild(mainQR);

// Add click effect: background turns green temporarily
mainQR.onclick = async (e) => {
  e.preventDefault();

  try {
    const token = await auth.currentUser.getIdToken();

    const res = await fetch(`${API_BASE}/api/customer/${data.orderId}/mark-delivered`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Failed to mark order as delivered");
    }

    await res.json();
// refresh the page to show updated status
    window.location.reload();
  } catch (error) {
    console.error("❌ Error marking as delivered:", error);
    alert("Could not mark the order as delivered.");
  }
};
}

function openPopup(title, product) {
  let popup = document.createElement("div");
  popup.className = "popup";

  const harvestStr = product.harvestDate
    ? new Date(product.harvestDate).toLocaleString()
    : "N/A";

  popup.innerHTML = `
    <div class="popup-content">
      <span class="close-btn" onclick="this.parentElement.parentElement.remove()">×</span>
      <h3>${title}</h3>
      <p><center><img src="${product.itemImageUrl}" alt="${title} QR Code" style="max-width: 70%; height: auto;" /></center></p>
      <p><strong>Weight:</strong> ${product.quantity} kg</p>
      <p><strong>Price:</strong> $${product.price}</p>
      <p><strong>Harvested:</strong> ${harvestStr}</p>
    </div>
  `;

  document.body.appendChild(popup);
}
window.openPopup = openPopup;
//on clicking the back button, redirect to myOrders.html if the user enter form myOrders.html else redirect to market.html
document.getElementById("backbutton").addEventListener("click", () => {
  const referrer = document.referrer;
  if (referrer.includes("myOrders.html")) {
    window.location.href = "myOrders.html";
  } else {
    window.location.href = "market.html";
  }
});


//renderDeliveryNote(deliveryData);
