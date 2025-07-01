// ===================================================================
// ✅ Final farmer_crops.js with Status Update + Percentage + Field Clear
// ===================================================================

let parsedLands = [];
let itemList = [];
let selectedLand = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadCropsPageData();
    populateItemDropdown();
    attachAddCropButton();

    if (parsedLands.length > 0) {
      selectedLand = parsedLands[0];
   //   document.getElementById("landSelector").value = selectedLand.LandId;
      populateCropsTable();
    }
  } catch (err) {
    showToast("Initialization failed", "error");
    console.error(err);
  }
});

async function loadCropsPageData() {
  try {
    const dashboardData = await apiCall("/frontend/dashboard");
    parsedLands = dashboardData.parsedLands || [];

    const itemsData = await apiCall("/frontend/items");
    itemList = itemsData.map(item => ({
      itemId: item.id,
      itemName: item.name,
      variety: item.category || "Standard"
    })) || [];
  } catch (error) {
    console.error("Error loading Firebase data:", error);
    showToast("Error loading data", "error");
  }
}

/*function fillLandDropdown() {
  const select = document.getElementById("landSelector");
  select.innerHTML = "";
  parsedLands.forEach(land => {
    const opt = document.createElement("option");
    opt.value = land.LandId;
    opt.textContent = land.name;
    select.appendChild(opt);
  });
  select.addEventListener("change", (e) => {
    const landId = e.target.value;
    selectedLand = parsedLands.find(l => l.LandId === landId);
    populateCropsTable();
  });
}*/

function populateItemDropdown() {
  const dropdown = document.getElementById("itemDropdown");
  dropdown.innerHTML = '<option value="">-- Select Crop --</option>';
  itemList.forEach(item => {
    const option = document.createElement("option");
    option.value = item.itemId;
    option.textContent = `${item.itemName} (${item.variety})`;
    dropdown.appendChild(option);
  });
}

function populateCropsTable() {
  const tbody = document.querySelector("#tblCrops tbody");
  tbody.innerHTML = "";

  parsedLands.forEach((land) => {
    const crop = land.Crops;

    // Land is cleared
    if (!crop || crop.status === "Field Clearing") {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${land.name}</td>
        <td><em>Empty Land</em></td>
        <td>--</td>
       <td>
          <span class="add-crop-link" onclick="handleEmptyCropClick('${land.LandId}')">Add Crops</span>
        </td>
        <td>Field Cleared</td>
        <td>--</td>
        <td>--</td>
      `;
      tbody.appendChild(tr);
      return;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${land.name}</td>
      <td>${getCropDisplayName(crop.itemId)}</td>
      <td>${crop.plantedAmount || "--"}</td>
      <td>${formatDateOnly(crop.plantedOn)}</td>
      <td>
        <select onchange="advanceCropStatus('${crop.id}', this.value)">
          ${getStatusOptions(crop.status)}
        </select>
      </td>
      <td>${formatDateOnly(crop.updatedOn)}</td>
      <td>${crop.percentage !== undefined ? crop.percentage + "%" : "--"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function getCropDisplayName(itemId) {
  const item = itemList.find(i => i.itemId === itemId);
  return item ? `${item.itemName} (${item.variety})` : "Unknown";
}

function formatDateOnly(dateStr) {
  const date = new Date(dateStr);
  return isNaN(date) ? "--" : date.toLocaleDateString();
}

const cropStatusOptions = [
  "Planting", "Growing", "Crop Maintenance", "Blooming",
  "Fruit Set", "Ripening", "Harvesting", "Harvested", "Field Clearing"
];

function getStatusOptions(currentStatus) {
  return cropStatusOptions.map(status => {
    const selected = status === currentStatus ? "selected" : "";
    return `<option value="${status}" ${selected}>${status}</option>`;
  }).join("");
}

async function advanceCropStatus(cropId, newStatus) {
  try {
    if (newStatus === "Field Clearing") {
      await apiCall(`/crops/${cropId}`, { method: "DELETE" });
      showToast("Crop cleared successfully", "success");
    } else {
      await apiCall(`/crops/${cropId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: newStatus,
          updatedOn: new Date().toISOString()
        })
      });
      showToast("Status updated successfully!", "success");
    }

    await loadCropsPageData();
    populateCropsTable();
  } catch (err) {
    console.error("Failed to update crop status:", err);
    showToast("Error updating status", "error");
  }
}
window.advanceCropStatus = advanceCropStatus;

function getEmptyLands() {
  return parsedLands.filter(l => !l.Crops || l.Crops.status === "Field Clearing");
}

function renderEmptyLandSelector(defaultLandId = null) {
  const selector = document.getElementById("emptyLandSelector");
  selector.innerHTML = "";
  getEmptyLands().forEach(land => {
    const opt = document.createElement("option");
    opt.value = land.LandId;
    opt.textContent = land.name;
    selector.appendChild(opt);
  });
  if (defaultLandId) selector.value = defaultLandId;

  selector.onchange = () => {
    const newLandId = selector.value;
    selectedLand = parsedLands.find(l => l.LandId === newLandId);
  };
}

function attachAddCropButton() {
  const btn = document.getElementById("showAddCropFormBtn");
  if (!btn) return;
  btn.onclick = () => {
    const newLandId = document.getElementById("emptyLandSelector").value;
    selectedLand = parsedLands.find(l => l.LandId === newLandId);
    document.getElementById("addCropSection").scrollIntoView({ behavior: "smooth" });
    showToast(`Now adding crop to: ${selectedLand.name}`, "info");
  };
}

window.handleEmptyCropClick = function(landId) {
  const land = parsedLands.find(l => l.LandId === landId);
  if (!land) return showToast("Land not found", "error");
  selectedLand = land;

  // Show only the form section
  document.getElementById("addCropSection").style.display = "block";
  document.getElementById("addCropSection").scrollIntoView({ behavior: "smooth" });
  showToast(`Ready to add crop for "${land.name}"`, "info");
};


function getAuthToken() {
  return localStorage.getItem("authToken") || null;
}

async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body,
  };
  const res = await fetch(`http://localhost:4000/api/farmer${endpoint}`, config);
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
  return await res.json();
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    success: '#4CAF50',
    error: '#F44336', 
    warning: '#FF9800',
    info: '#2196F3'
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

document.getElementById("btnAddCrop").addEventListener("click", async () => {
  const itemId = document.getElementById("itemDropdown").value;
  const quantity = parseFloat(document.getElementById("inputPlantedAmt").value);
  const avgRate = parseFloat(document.getElementById("avgRatePerUnit").value);
  const fruiting = parseFloat(document.getElementById("fruitingPerPlant").value);
  const plantedOn = document.getElementById("inputPlantedOn").value;
  const expectedHarvestDate = document.getElementById("expectedHarvestDate").value;

  if (!itemId || isNaN(quantity) || isNaN(avgRate) || isNaN(fruiting) || !plantedOn || !expectedHarvestDate) {
    showToast("Please fill in all fields correctly", "error");
    return;
  }

  try {
    const cropData = {
      itemId,
      quantity,
      avgRatePerUnit: avgRate,
      fruitingPerPlant: fruiting,
      plantedOn,
      expectedHarvestDate,
      status: "Planting",
      updatedOn: new Date().toISOString(),
      percentage: 0,
      imageUrl: "https://via.placeholder.com/50"
    };
    await apiCall("/crops", {
      method: "POST",
      body: JSON.stringify({ farmId: selectedLand.LandId, ...cropData })
    });
    showToast("Crop added successfully!", "success");
    await loadCropsPageData();
    populateCropsTable();
    document.getElementById("addCropSection").style.display = "none";
  } catch (err) {
    console.error("Failed to add crop:", err);
    showToast("Error adding crop", "error");
  }
});