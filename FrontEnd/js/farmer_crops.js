import { getCurrentUserToken } from "../js/firebase-init.js";

// Static data (fallback)
const cropStatusOptions = [
  "Planting",
  "Growing",
  "Crop Maintenance",
  "Blooming",
  "Fruit Set",
  "Ripening",
  "Harvesting",
  "Harvested",
  "Field Clearing",
];

const realCropImages = [
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1574226516831-e1dff420e43e?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=50&q=80",
];

function getRandomRealCropImage() {
  const index = Math.floor(Math.random() * realCropImages.length);
  return realCropImages[index];
}

//API call function
async function fetchFarmerLands() {
  const token = await getCurrentUserToken();
  const response = await fetch(
    "http://localhost:4000/api/farmer/getFarmerLands",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

async function fetchItemList() {
  const token = await getCurrentUserToken();
  const response = await fetch("http://localhost:4000/api/farmer/getItemList", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

// Global variables (will be loaded from API)
let parsedLands = [];
let itemList = [];

let selectedLand = null;

// =================================================================
// 🔌 API INTEGRATION FUNCTIONS
// =================================================================

// Load data from API
async function loadCropsPageData() {
  try {
    showLoadingIndicator("Loading crops data...");

    parsedLands = await fetchFarmerLands();
    itemList = await fetchItemList();

    hideLoadingIndicator();
    return true;
  } catch (error) {
    console.warn("Failed to load from API, using fallback data:", error);
    hideLoadingIndicator();
    return false;
  }
}

// Add crop via API
async function addCropViaAPI(landId, cropData) {
  try {
    const token = await getCurrentUserToken();
    const response = await fetch("http://localhost:4000/api/farmer/addCrop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        landId: landId,
        crop: cropData,
      }),
    });

    if (!response.ok) throw new Error("Failed to add crop");

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

// =================================================================
// 🎨 UI HELPER FUNCTIONS
// =================================================================

function showLoadingIndicator(message = "Loading...") {
  let loader = document.getElementById("loadingIndicator");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loadingIndicator";
    loader.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 1000;
                  text-align: center;">
        <div>${message}</div>
        <div style="margin-top: 10px;">⏳</div>
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    loader.querySelector("div div").textContent = message;
  }
  loader.style.display = "block";
}

function hideLoadingIndicator() {
  const loader = document.getElementById("loadingIndicator");
  if (loader) {
    loader.style.display = "none";
  }
}

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

function formatDateOnly(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date)) return dateInput;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months start at 0
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Populate the item dropdown for adding new crops

function getStatusOptions(currentStatus) {
  // Return all status options, with the current status marked as selected
  return cropStatusOptions
    .map((status) => {
      const selected = status === currentStatus ? "selected" : "";
      return `<option value="${status}" ${selected}>${status}</option>`;
    })
    .join("");
}

function getItemDisplayName(itemId) {
  const item = itemList.find((it) => it.id === itemId);
  if (!item) {
    console.warn("No item found for ID:", itemId);
    return "Unknown Crop";
  }
  return item.name;
}

async function updateCrops(newStatus, statusPercentage, landId) {
  console.log("called");
  try {
    if (newStatus === "Field Clearing") {
      try {
        const token = await getCurrentUserToken();
        const response = await fetch(
          `http://localhost:4000/api/farmer/removeLandCrops/${landId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to update crop status");
        const land = parsedLands.find((l) => l.id === landId);

        if (land) {
          delete land.crop;
        }
      } catch (error) {
        console.warn("API clear failed, updating locally:", error);
        showToast("Cleared locally - will sync when online", "warning");
      }
    } else {
      try {
        const token = await getCurrentUserToken();
        const response = await fetch(
          `http://localhost:4000/api/farmer/updateCrops/${landId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: newStatus,
              statusPercentage: statusPercentage,
              updatedAt: new Date().toISOString(),
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to update crop status");
      } catch (error) {
        console.warn("API update failed, updating locally:", error);
        showToast("Updated locally - will sync when online", "warning");
      }

      // Safely update local data
      const land = parsedLands.find((l) => l.id === landId);
      if (land && land.crop) {
        land.crop.status = newStatus;
        land.crop.statusPercentage = statusPercentage;
        land.crop.updatedAt = new Date().toISOString();
      }
    }

    renderCropTable();
  } catch (error) {
    console.error("Failed to update crop status:", error);
    showToast("Failed to update status. Please try again.", "error");
  }
}

function populateItemDropdown() {
  const dropdown = document.getElementById("itemDropdown");
  dropdown.innerHTML = '<option value="">-- Select Crop --</option>';
  itemList.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} `;
    dropdown.appendChild(option);
  });
}

async function handleAddCrop() {
  console.log("called handleAddCrop");
  const selectedItemId = document.getElementById("itemDropdown").value;
  const plantedAmount = parseFloat(
    document.getElementById("inputPlantedAmount").value
  );
  const avgRate = parseFloat(document.getElementById("avgRatePerUnit").value);
  const fruiting = parseFloat(
    document.getElementById("fruitingPerPlant").value
  );
  const plantedOn = document.getElementById("inputPlantedOn").value;
  const expectedHarvestDate = document.getElementById(
    "expectedHarvestDate"
  ).value;

  const item = itemList.find((it) => it.id === selectedItemId);
  if (!item) {
    alert("No item found for ID:", selectedItemId);
    return;
  }
  if (isNaN(plantedAmount)) {
    alert("Please fill all fields with valid values. plantedAmount");
    return;
  }
  if (isNaN(avgRate)) {
    alert("Please fill all fields with valid values. avgRate");
    return;
  }
  if (isNaN(fruiting)) {
    alert("Please fill all fields with valid values. fruiting");
    return;
  }
  if (!plantedOn || !expectedHarvestDate) {
    alert("Please fill all fields with valid values.");
    return;
  }

  // Show loading state
  const addButton = document.getElementById("btnAddCrop");
  const originalText = addButton.textContent;
  addButton.textContent = "Adding...";
  addButton.disabled = true;

  try {
    // Prepare crop data
    // console.log("selected item id:" + selectedItemId);
    const cropData = {
      itemId: selectedItemId,
      plantedAmount: plantedAmount,
      avgRatePerUnit: avgRate,
      ExpectedFruitingPerPlant: fruiting,
      plantedOn: plantedOn,
      expectedHarvestDate,
      expectedHarvestingKg: (plantedAmount * avgRate) / 1000, // Convert to kg
      status: "Planting",
      statusPercentage: 0,
      imageUrl: getRandomRealCropImage(),
    };

    const token = await getCurrentUserToken();
    const response = await fetch("http://localhost:4000/api/farmer/addCrop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        landId: selectedLand.id,
        crop: cropData,
      }),
    });

    if (!response.ok) throw new Error("Failed to add crop");

    const land = parsedLands.find((l) => l.id === selectedLand.id);
    if (land) {
      land.crop = {
        ...cropData,
        updatedAt: new Date().toISOString(),
      };
    }
    showToast("Crop added successfully!", "success");
    // Reset form fields
    document.getElementById("inputPlantedAmount").value = "";
    document.getElementById("avgRatePerUnit").value = "";
    document.getElementById("fruitingPerPlant").value = "";
    document.getElementById("inputPlantedOn").value = "";
    document.getElementById("expectedHarvestDate").value = "";

    renderCropTable();
  } catch (error) {
    console.error("Failed to add crop:", error);
    showToast("Failed to add crop. Please try again.", "error");
  } finally {
    // Restore button
    addButton.textContent = originalText;
    addButton.disabled = false;
  }
}

function renderCropTable() {
  const tableBody = document.querySelector("#cropTable tbody");
  tableBody.innerHTML = "";

  parsedLands.forEach((land) => {
    const tr = document.createElement("tr");

    // Land Name
    const tdName = document.createElement("td");
    tdName.textContent = land.landName;
    tr.appendChild(tdName);

    if (land.crop) {
      const crop = land.crop;

      // Crop Name
      const tdItem = document.createElement("td");
      tdItem.textContent = getItemDisplayName(crop.itemId);
      tr.appendChild(tdItem);

      // Planted Amount
      const tdAmount = document.createElement("td");
      tdAmount.textContent = crop.plantedAmount;
      tr.appendChild(tdAmount);

      // Planted On Date
      const tdPlantedOn = document.createElement("td");
      tdPlantedOn.textContent = crop.plantedDate;
      tr.appendChild(tdPlantedOn);

      // Status Dropdown
      const tdStatus = document.createElement("td");
      const selectStatus = document.createElement("select");
      selectStatus.innerHTML = getStatusOptions(crop.status);
      selectStatus.value = crop.status;
      selectStatus.addEventListener("change", (e) => {
        updateCrops(e.target.value, crop.statusPercentage, land.id);
      });
      tdStatus.appendChild(selectStatus);
      tr.appendChild(tdStatus);

      // Updated On Date
      const tdUpdatedOn = document.createElement("td");
      tdUpdatedOn.textContent = formatDateOnly(
        new Date(crop.updatedAt._seconds * 1000)
      );
      tr.appendChild(tdUpdatedOn);

      // Status Percentage Input
      const tdPercentage = document.createElement("td");
      const inputPercentage = document.createElement("input");
      inputPercentage.type = "number";
      inputPercentage.min = 0;
      inputPercentage.max = 100;
      inputPercentage.value = crop.statusPercentage;
      inputPercentage.addEventListener("change", (e) => {
        updateCrops(crop.status, e.target.value, land.id);
      });
      tdPercentage.appendChild(inputPercentage);
      tr.appendChild(tdPercentage);

      // Crop Image
      const tdImage = document.createElement("td");
      const img = document.createElement("img");
      img.src = crop.imageUrl;
      img.alt = crop.item || "Crop Image";
      tdImage.appendChild(img);
      tr.appendChild(tdImage);
    } else {
      // No crop yet — show Add Crop button
      const td = document.createElement("td");
      td.colSpan = 10;
      const btn = document.createElement("button");
      btn.className = "btn-primary";
      btn.textContent = "Add Crop";
      btn.onclick = () => showAddCropForm(land);
      td.appendChild(btn);
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  });

  // Hide Add Crop form by default
  document.getElementById("addCropSection").style.display = "none";
}

function showAddCropForm(land) {
  selectedLand = land;
  document.getElementById("addCropSection").style.display = "block";
  populateItemDropdown();
  document.getElementById("inputPlantedAmount").value = "";
  document.getElementById("avgRatePerUnit").value = "";
  document.getElementById("fruitingPerPlant").value = "";
  document.getElementById("inputPlantedOn").value = "";
  document.getElementById("expectedHarvestDate").value = "";
}

function setupAddCropButton() {
  document
    .getElementById("btnAddCrop")
    .addEventListener("click", handleAddCrop);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Load data from API
  await loadCropsPageData();
  renderCropTable();
  setupAddCropButton();
});

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// Make functions globally available for inline event handlers
window.updateCrops = updateCrops;
