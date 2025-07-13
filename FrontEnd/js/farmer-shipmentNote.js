const farmerInfo = {
  orderId: "001283",
  name: "Levy Cohen",
  address: "77 Green Valley Rd, Galilee",
  phone: "+972-52-1234567"
};

const containers = [
  { id: "C-001", item: "Apple", quality: "A", volumeKg: 5 },
  { id: "C-002", item: "Apple", quality: "A", volumeKg: 5 },
  { id: "C-003", item: "Apple", quality: "B", volumeKg: 3 },
  { id: "C-004", item: "Banana", quality: "B", volumeKg: 4 },
  { id: "C-005", item: "Banana", quality: "B", volumeKg: 4 },
  { id: "C-006", item: "Cucumber", quality: "A", volumeKg: 12 }
];

const products = [
  {
    item: { name: "Apple", quality: "A" },
    barcode: "123456789012",
    pricePerKg: 3,
    weightKg: 10
  },
  {
    item: { name: "Apple", quality: "B" },
    barcode: "123456789012",
    pricePerKg: 2.5,
    weightKg: 7
  },
  {
    item: { name: "Banana", quality: "B" },
    barcode: "123456789013",
    pricePerKg: 2.5,
    weightKg: 8
  },
  {
    item: { name: "Cucumber", quality: "A" },
    barcode: "123456789014",
    pricePerKg: 1.8,
    weightKg: 12
  }
];

function renderProducts() {
  // Fill farmer info
  document.querySelector(".farmer-info").innerHTML = `
    <p><strong>Delivery Note #:</strong> ${farmerInfo.orderId}</p>
    <p><strong>Farmer:</strong> ${farmerInfo.name}</p>
    <p><strong>Address:</strong> ${farmerInfo.address}</p>
    <p><strong>Phone:</strong> ${farmerInfo.phone}</p>
  `;

  const body = document.getElementById("product-body");
  let totalWeight = 0;
  let totalVolumeAll = 0; // Not used but can be added if needed
  let totalPrice = 0;

  products.forEach((p, index) => {
    const name = p.item.name;
    const quality = p.item.quality;
    const total = p.pricePerKg * p.weightKg;
    
    totalWeight += p.weightKg;
    totalPrice += total;

    const relatedContainers = containers.filter(c => c.item === name && c.quality === quality);
    const totalVolume = relatedContainers.reduce((sum, c) => sum + c.volumeKg, 0);
    totalVolumeAll += totalVolume; 
    const containerIds = relatedContainers.map(c => `<li>${c.id} - ${c.volumeKg} kg</li>`).join("");

    const tr = document.createElement("tr");
    const containerButton = `<button onclick="showContainers('${name}', '${quality}', ${index})">List</button>`;
    const popup = `
      <div id="popup-${index}" class="popup-container" style="display:none;">
        <div class="popup-content">
          <span class="close-btn" onclick="closePopup(${index})">&times;</span>
          <h3>${name} (${quality}) - Containers</h3>
          <ul>${containerIds}</ul>
        </div>
      </div>
    `;

    tr.innerHTML = `
      <td>${name}</td>
      <td>${containerButton}${popup}</td>
      <td>${quality}</td>
      <td>${p.pricePerKg.toFixed(2)}</td>
      <td>${p.weightKg.toFixed(2)}</td>
      <td>${total.toFixed(2)}</td>
      <td>${totalVolume.toFixed(2)} kg</td>
    `;
    body.appendChild(tr);
  });

  document.getElementById("total-kg").textContent = totalWeight.toFixed(2);
  document.getElementById("total-vol").textContent = totalVolumeAll.toFixed(2)
  document.getElementById("total-price").textContent = totalPrice.toFixed(2);
}

function showContainers(item, quality, index) {
  document.getElementById(`popup-${index}`).style.display = "block";
}

function closePopup(index) {
  document.getElementById(`popup-${index}`).style.display = "none";
}

window.onload = renderProducts;
