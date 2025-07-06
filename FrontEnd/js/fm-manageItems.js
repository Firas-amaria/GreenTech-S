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
  renderItems(allItems, token);
}

function renderItems(items) {
  const list = document.getElementById("itemsList");
  list.innerHTML = items.map(item => `
    <div class="itemCard">
      <h3>${item.name}</h3>
      <p><strong>Category:</strong> ${item.category}</p>
      <p><strong>Weight Per Unit:</strong> ${item.avgWeightPerUnitGr || 10}g</p>
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
