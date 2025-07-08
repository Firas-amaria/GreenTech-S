import { auth, onAuthStateChanged } from "../js/firebase-init.js";

const API_BASE = "http://localhost:4000";
let allItems = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in to continue.");
    window.location.href = "/login.html";
    return;
  }
  const token = await user.getIdToken();
  fetchItems(token);
});

async function fetchItems(token) {
  const res = await fetch(`${API_BASE}/api/farmerManager/items`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    alert("You are not authorized to view this page.");
    window.location.href = "/";
    return;
  }
  allItems = await res.json();
  renderItems(allItems);
}

function renderItems(items) {
  const list = document.getElementById("itemsList");
  list.innerHTML = items.map(item => `
    <div class="itemCard">
      <img src="${item.imageUrl || 'https://via.placeholder.com/100'}" 
           alt="Item Image" style="max-width:100%; border-radius:8px; margin-bottom:10px;">
      <h3>${item.name}</h3>
      <p><strong>Category:</strong> ${item.category}</p>
      <p><strong>Weight:</strong> ${item.avgWeightPerUnitGr || 10}g</p>
      <p><strong>Price:</strong> A: ${item.price?.a ?? '-'} | B: ${item.price?.b ?? '-'} | C: ${item.price?.c ?? '-'}</p>
      <button onclick="openDetailView('${item.id}')">View Full Data</button>
    </div>
  `).join('');
}

window.filterItems = function() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allItems.filter(item =>
    item.name.toLowerCase().includes(term) ||
    item.category.toLowerCase().includes(term)
  );
  renderItems(filtered);
};

window.openDetailView = function(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return alert("Item not found");
  const modalContent = document.getElementById("itemFormModal").querySelector(".modal-content");

  let qualityRows = "";
  if (item.qualityStandards) {
    for (const [key, val] of Object.entries(item.qualityStandards)) {
      qualityRows += `
        <tr>
          <td>${key}</td>
          <td><input type="text" value="${val.A || ''}" id="qs-${key}-A" disabled></td>
          <td><input type="text" value="${val.B || ''}" id="qs-${key}-B" disabled></td>
          <td><input type="text" value="${val.C || ''}" id="qs-${key}-C" disabled></td>
        </tr>
      `;
    }
  }

  modalContent.innerHTML = `
    <h2>Full Data: ${item.name}</h2>
    <div class="edit-section">
      <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" 
           alt="Product Image" 
           style="max-width:220px; border-radius:8px; margin-bottom:15px;">
      <label>Image URL <input id="editImageUrl" value="${item.imageUrl || ''}" disabled></label>
      <label>Name <input id="editName" value="${item.name}" disabled></label>
      <label>Category 
        <select id="editCategory" disabled>
          <option value="fruit" ${item.category==="fruit"?"selected":""}>Fruit</option>
          <option value="vegetable" ${item.category==="vegetable"?"selected":""}>Vegetable</option>
        </select>
      </label>
      <label>Weight Per Unit (gr) <input type="number" id="editWeightPerUnit" value="${item.weightPerUnitG || ''}" disabled></label>
      <label>QM Per Unit <input type="number" id="editQmPerUnit" value="${item.avgQmPerUnit || ''}" disabled></label>
      <label>Avg Weight (for calcs) <input type="number" id="editWeight" value="${item.avgWeightPerUnitGr || 10}" disabled></label>
      <label>Season <input id="editSeason" value="${item.season || ''}" disabled></label>
      <label>Farmer Tips <textarea id="editTips" disabled>${item.farmerTips || ''}</textarea></label>
      <p><strong>Tolerance:</strong> ±2%</p>
    </div>

    <div class="edit-section">
      <h3>Customer Info</h3>
      <ul>
        ${(item.customerInfo || []).map(info => `<li>${info}</li>`).join('')}
      </ul>
    </div>

    <div class="edit-section">
      <h3>Price</h3>
      <div class="price-grid">
        <label>A <input type="number" id="priceA" value="${item.price?.a || ''}" disabled></label>
        <label>B <input type="number" id="priceB" value="${item.price?.b || ''}" disabled></label>
        <label>C <input type="number" id="priceC" value="${item.price?.c || ''}" disabled></label>
      </div>
    </div>

    <div class="edit-section">
      <h3>Quality Standards</h3>
      <table>
        <tr><th>Field</th><th>A</th><th>B</th><th>C</th></tr>
        ${qualityRows}
      </table>
    </div>

    <div class="form-actions">
      <button onclick="enableEdit('${item.id}')">Edit</button>
      <button onclick="closeForm()">Close</button>
    </div>
  `;
  document.getElementById("itemFormModal").classList.remove("hidden");
  document.getElementById("editName").focus();
};

window.enableEdit = function(id) {
  document.querySelectorAll('#itemFormModal input, #itemFormModal select, #itemFormModal textarea').forEach(el => {
    el.disabled = false;
  });
  const actions = document.querySelector("#itemFormModal .form-actions");
  actions.innerHTML = `
    <button onclick="saveFullEdits('${id}')">Save Changes</button>
    <button onclick="confirmDeleteItem('${id}')">Delete Item</button>
    <button onclick="closeForm()">Cancel</button>
  `;
};

window.saveFullEdits = async function(id) {
  const user = auth.currentUser;
  const token = await user.getIdToken();
  const qualityStandards = {};
  document.querySelectorAll("tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length === 4) {
      const field = cells[0].textContent;
      qualityStandards[field] = {
        A: cells[1].querySelector("input").value,
        B: cells[2].querySelector("input").value,
        C: cells[3].querySelector("input").value,
      };
    }
  });

  const data = {
    name: document.getElementById("editName").value,
    category: document.getElementById("editCategory").value,
    imageUrl: document.getElementById("editImageUrl").value,
    weightPerUnitG: parseInt(document.getElementById("editWeightPerUnit").value),
    avgQmPerUnit: parseFloat(document.getElementById("editQmPerUnit").value),
    avgWeightPerUnitGr: parseInt(document.getElementById("editWeight").value),
    season: document.getElementById("editSeason").value,
    farmerTips: document.getElementById("editTips").value,
    tolerance: "±2%",
    price: {
      a: parseFloat(document.getElementById("priceA").value),
      b: parseFloat(document.getElementById("priceB").value),
      c: parseFloat(document.getElementById("priceC").value),
    },
    qualityStandards
  };

  const res = await fetch(`${API_BASE}/api/farmerManager/items/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    alert("Failed to save changes.");
    return;
  }
  showToast("Saved ✅");
  closeForm();
  fetchItems(token);
};

window.confirmDeleteItem = async function(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  const user = auth.currentUser;
  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}/api/farmerManager/items/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    alert("Failed to delete item.");
    return;
  }
  showToast("Deleted ✅");
  closeForm();
  fetchItems(token);
};



window.showAddForm = function() {
  const modalContent = document.getElementById("itemFormModal").querySelector(".modal-content");
  modalContent.innerHTML = `
    <h2>Add New Item</h2>
    <div class="edit-section">
      <img src="https://via.placeholder.com/150" 
           alt="Product Image" 
           style="max-width:220px; border-radius:8px; margin-bottom:15px;">
      <label>Image URL <input id="addImageUrl" placeholder="https://..."></label>
      <label>Name <input id="addName" placeholder="Apple Fuji"></label>
      <label>Category 
        <select id="addCategory">
          <option value="fruit">Fruit</option>
          <option value="vegetable">Vegetable</option>
        </select>
      </label>
      <label>Weight Per Unit (gr) <input type="number" id="addWeightPerUnit" placeholder="180"></label>
      <label>QM Per Unit <input type="number" id="addQmPerUnit" step="0.01" placeholder="0.05"></label>
      <label>Avg Weight (for calcs) <input type="number" id="addWeight" placeholder="180"></label>
      <label>Season <input id="addSeason" placeholder="November-February"></label>
      <label>Farmer Tips <textarea id="addTips" placeholder="Harvest early in the morning for best shelf life."></textarea></label>
      <p><strong>Tolerance:</strong> ±2%</p>
    </div>

    <div class="edit-section">
      <h3>Customer Info</h3>
      <textarea id="addCustomerInfo" placeholder="Rich in vitamins; Supports immune system"></textarea>
    </div>

    <div class="edit-section">
      <h3>Price</h3>
      <div class="price-grid">
        <label>A <input type="number" id="addPriceA" placeholder="2.5"></label>
        <label>B <input type="number" id="addPriceB" placeholder="2.0"></label>
        <label>C <input type="number" id="addPriceC" placeholder="1.5"></label>
      </div>
    </div>

    <div class="edit-section">
      <h3>Quality Standards</h3>
      <p style="margin-top:5px;">
        <span title="Fill in typical values for each quality grade. For example: Acidity for A=0.5-0.7%, B=0.4-0.49%, C=<0.4%. Use units as shown.">
          🛈 Hover field names for hints
        </span>
      </p>
      <table>
        <tr><th>Field</th><th>A</th><th>B</th><th>C</th></tr>
        <tr><td title="Acidity range in %">Acidity (%)</td>
            <td><input id="qs-Acidity-A" placeholder="0.5-0.7"></td>
            <td><input id="qs-Acidity-B" placeholder="0.4-0.49"></td>
            <td><input id="qs-Acidity-C" placeholder="<0.4"></td></tr>
        <tr><td title="Sugar content (Brix)">Brix (%)</td>
            <td><input id="qs-Brix-A" placeholder="13+"></td>
            <td><input id="qs-Brix-B" placeholder="11-12.9"></td>
            <td><input id="qs-Brix-C" placeholder="9-10.9"></td></tr>
        <tr><td title="Description of color">Color Desc</td>
            <td><input id="qs-ColorDesc-A" placeholder="Bright coloration"></td>
            <td><input id="qs-ColorDesc-B" placeholder="Moderate"></td>
            <td><input id="qs-ColorDesc-C" placeholder="Pale"></td></tr>
        <tr><td title="Color coverage on fruit (%)">Color %</td>
            <td><input id="qs-ColorPerc-A" placeholder="85-100"></td>
            <td><input id="qs-ColorPerc-B" placeholder="60-84"></td>
            <td><input id="qs-ColorPerc-C" placeholder="<60"></td></tr>
        <tr><td title="Diameter in millimeters">Diameter (mm)</td>
            <td><input id="qs-Diameter-A" placeholder="75+"></td>
            <td><input id="qs-Diameter-B" placeholder="65-74"></td>
            <td><input id="qs-Diameter-C" placeholder="<65"></td></tr>
        <tr><td title="Max defect ratio by length/diameter">Defect Ratio (%)</td>
            <td><input id="qs-Defect-A" placeholder="≤3"></td>
            <td><input id="qs-Defect-B" placeholder="≤5"></td>
            <td><input id="qs-Defect-C" placeholder="≤7"></td></tr>
        <tr><td title="Pressure in kg/cm²">Pressure (kg/cm²)</td>
            <td><input id="qs-Pressure-A" placeholder="7.5"></td>
            <td><input id="qs-Pressure-B" placeholder="6-7.4"></td>
            <td><input id="qs-Pressure-C" placeholder="<6"></td></tr>
        <tr><td title="Grade quality label">Grade</td>
            <td><input id="qs-Grade-A" placeholder="Premium"></td>
            <td><input id="qs-Grade-B" placeholder="Standard"></td>
            <td><input id="qs-Grade-C" placeholder="Below Std"></td></tr>
        <tr><td title="Rejection rate %">Rejection (%)</td>
            <td><input id="qs-Rejection-A" placeholder="≤2"></td>
            <td><input id="qs-Rejection-B" placeholder="≤4"></td>
            <td><input id="qs-Rejection-C" placeholder="≤6"></td></tr>
        <tr><td title="Weight unit by grade (g)">Weight (g)</td>
            <td><input id="qs-Weight-A" placeholder="180+"></td>
            <td><input id="qs-Weight-B" placeholder="150-179"></td>
            <td><input id="qs-Weight-C" placeholder="<150"></td></tr>
      </table>
    </div>

    <div class="form-actions">
      <button onclick="submitNewItem()">Save Item</button>
      <button onclick="closeForm()">Cancel</button>
    </div>
  `;
  document.getElementById("itemFormModal").classList.remove("hidden");
  document.getElementById("addName").focus();
};

window.submitNewItem = async function() {
  const user = auth.currentUser;
  const token = await user.getIdToken();

  const qualityStandards = {
    acidityPercentage: {
      A: document.getElementById("qs-Acidity-A").value,
      B: document.getElementById("qs-Acidity-B").value,
      C: document.getElementById("qs-Acidity-C").value
    },
    brix: {
      A: document.getElementById("qs-Brix-A").value,
      B: document.getElementById("qs-Brix-B").value,
      C: document.getElementById("qs-Brix-C").value
    },
    colorDescription: {
      A: document.getElementById("qs-ColorDesc-A").value,
      B: document.getElementById("qs-ColorDesc-B").value,
      C: document.getElementById("qs-ColorDesc-C").value
    },
    colorPercentage: {
      A: document.getElementById("qs-ColorPerc-A").value,
      B: document.getElementById("qs-ColorPerc-B").value,
      C: document.getElementById("qs-ColorPerc-C").value
    },
    diameterMM: {
      A: document.getElementById("qs-Diameter-A").value,
      B: document.getElementById("qs-Diameter-B").value,
      C: document.getElementById("qs-Diameter-C").value
    },
    maxDefectRatioLengthDiameter: {
      A: document.getElementById("qs-Defect-A").value,
      B: document.getElementById("qs-Defect-B").value,
      C: document.getElementById("qs-Defect-C").value
    },
    pressure: {
      A: document.getElementById("qs-Pressure-A").value,
      B: document.getElementById("qs-Pressure-B").value,
      C: document.getElementById("qs-Pressure-C").value
    },
    qualityGrade: {
      A: document.getElementById("qs-Grade-A").value,
      B: document.getElementById("qs-Grade-B").value,
      C: document.getElementById("qs-Grade-C").value
    },
    rejectionRate: {
      A: document.getElementById("qs-Rejection-A").value,
      B: document.getElementById("qs-Rejection-B").value,
      C: document.getElementById("qs-Rejection-C").value
    },
    weightPerUnitG: {
      A: document.getElementById("qs-Weight-A").value,
      B: document.getElementById("qs-Weight-B").value,
      C: document.getElementById("qs-Weight-C").value
    }
  };

  const data = {
    avgQmPerUnit: parseFloat(document.getElementById("addQmPerUnit").value),
    avgWeightPerUnitGr: parseInt(document.getElementById("addWeight").value),
    caloriesPer100g: 42,
    category: document.getElementById("addCategory").value,
    customerInfo: document.getElementById("addCustomerInfo").value
                      .split(";")
                      .map(s => s.trim())
                      .filter(s => s),
    farmerTips: document.getElementById("addTips").value,
    imageUrl: document.getElementById("addImageUrl").value,
    name: document.getElementById("addName").value,
    price: {
      a: parseFloat(document.getElementById("addPriceA").value),
      b: parseFloat(document.getElementById("addPriceB").value),
      c: parseFloat(document.getElementById("addPriceC").value),
    },
    season: document.getElementById("addSeason").value,
    tolerance: "±2%",
    weightPerUnitG: parseInt(document.getElementById("addWeightPerUnit").value),
    qualityStandards
  };

  // 🔥 Build personalized ID
  const docId = `${data.category === "fruit" ? "FRT" : "VEG"}-${data.name.toLowerCase().replace(/\s+/g, "_")}`;

  // 🔍 Check if item already exists
  const duplicate = allItems.find(i => i.id === docId);
  if (duplicate) {
    alert(`An item with this ID (${docId}) already exists. Please use a different name.`);
    return;
  }

  // ✅ Validate all fields including standards
  if (!data.name || !data.category || !data.imageUrl ||
      !data.weightPerUnitG || !data.avgQmPerUnit || !data.avgWeightPerUnitGr ||
      !data.price.a || !data.price.b || !data.price.c ||
      !Object.values(qualityStandards).every(group => group.A && group.B && group.C)) {
    alert("Please fill in all fields including quality standards before saving.");
    return;
  }

  // 🚀 POST to your backend with explicit ID
  const res = await fetch(`${API_BASE}/api/farmerManager/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id: docId, ...data })
  });

  if (!res.ok) {
    alert("Failed to add item.");
    return;
  }

  showToast("Item added ✅");
  closeForm();
  fetchItems(token);
};


window.confirmDeleteItem = async function(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  const user = auth.currentUser;
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/api/farmerManager/items/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    alert("Failed to delete item.");
    return;
  }

  showToast("Item deleted ✅");
  closeForm();
  fetchItems(token);
};



window.closeForm = function() {
  document.getElementById("itemFormModal").classList.add("hidden");
};

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
