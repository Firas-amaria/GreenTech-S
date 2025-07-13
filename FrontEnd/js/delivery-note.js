import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

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

    renderNote(data);
  } catch (err) {
    console.error(err);
    alert("Could not load order details.");
  }
}

function renderNote(order) {
  // Example: put into HTML
  document.getElementById("order-id").textContent = order.orderId;
  document.getElementById("order-status").textContent = order.status;
  document.getElementById("order-total").textContent = `${order.totalPrice}₪`;

  // You can also loop through items
  const itemsDiv = document.getElementById("order-items");
  order.items.forEach(item => {
    const p = document.createElement("p");
    p.textContent = `${item.name} - ${item.quantity} ${item.unit}`;
    itemsDiv.appendChild(p);
  });
}




const deliveryData = [
  {
    farmerName: "Levy Cohen",
    products: [
      { name: "Apple", barcode: "123456789012", weight: 2.5, price: 15, harvestDate: "2024-06-10T07:30:00Z" },
      { name: "Banana", barcode: "123456789013", weight: 1.2, price: 8, harvestDate: "2024-06-11T08:15:00Z" }
    ]
  },
  {
    farmerName: "Sarah Blum",
    products: [
      { name: "Cucumber", barcode: "123456789014", weight: 3.1, price: 12, harvestDate: "2024-06-09T06:50:00Z" },
      { name: "Tomato", barcode: "123456789015", weight: 2.0, price: 10, harvestDate: "2024-06-10T09:00:00Z" }
    ]
  }
];

function renderDeliveryNote(data) {
  const container = document.getElementById("farmers-container");
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

  data.forEach(group => {
    group.products.forEach(p => {
      totalKg += p.weight;
      totalPrice += p.price;

      const productLabel = `${p.name} by ${group.farmerName}`;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${productLabel}</td>
        <td><div id="qr-${p.barcode}"></div></td>
        <td>${p.weight.toFixed(2)}</td>
        <td>${p.price.toFixed(2)}</td>
      `;
      table.appendChild(row);

      const qrBtn = document.createElement("img");
      qrBtn.className = "qr-code";
      qrBtn.src = "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(productLabel) + "&size=60x60";
      qrBtn.onclick = () => openPopup(productLabel, p);

      setTimeout(() => {
        const qrDiv = document.getElementById("qr-" + p.barcode);
        if (qrDiv) qrDiv.appendChild(qrBtn);
      }, 0);
    });
  });

  container.appendChild(table);
  document.getElementById("total-kg").textContent = totalKg.toFixed(2);
  document.getElementById("total-price").textContent = totalPrice.toFixed(2);

  const noteUrl = "https://yourdomain.com/delivery-note/000294";
  const mainQR = document.createElement("img");
  mainQR.className = "qr-code";
  mainQR.src = "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(noteUrl) + "&size=120x120";
  mainQR.title = "Scan to view this delivery note";
  document.getElementById("main-qr").appendChild(mainQR);
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
      <p><strong>Barcode:</strong> ${product.barcode}</p>
      <p><strong>Weight:</strong> ${product.weight.toFixed(2)} kg</p>
      <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
      <p><strong>Harvested:</strong> ${harvestStr}</p>
    </div>
  `;

  document.body.appendChild(popup);
}

renderDeliveryNote(deliveryData);
