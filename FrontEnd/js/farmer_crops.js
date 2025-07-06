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

async function updateCropStatusViaAPI(cropId, status, percentage) {
  try {
    const token = await getCurrentUserToken();
    const response = await fetch(
      `http://localhost:4000/api/farmer/crops/${cropId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          statusPercentage: percentage,
          updatedOn: formatDate(new Date()),
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to update crop status");

    return await response.json();
  } catch (error) {
    console.error("Failed to update crop status via API:", error);
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

function formatDateOnly(dateString) {
  const date = new Date(dateString);
  return isNaN(date) ? dateString : date.toLocaleDateString();
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

async function updateCropPercentage(value) {
  const parsed = parseFloat(value);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
    // Check if this will trigger inventory removal (harvesting + 100%)
    if (selectedLand?.Crops?.status === "Harvesting" && parsed === 100) {
      const confirmComplete = confirm(
        `Mark harvest as 100% complete?\n\nThis will remove the crop from your inventory.`
      );
      if (!confirmComplete) {
        // Reset the input value
        const percentageInput = document.querySelector(
          'input[type="number"][onchange*="updateCropPercentage"]'
        );
        if (percentageInput) {
          percentageInput.value = selectedLand.Crops.percentage;
        }
        return;
      }
    }

    try {
      // Try to update via API
      if (selectedLand.Crops.id) {
        await updateCropStatusViaAPI(
          selectedLand.Crops.id,
          selectedLand.Crops.status,
          parsed
        );
        showToast("Percentage updated successfully!", "success");
      }
    } catch (error) {
      console.warn("API update failed, updating locally:", error);
      showToast("Updated locally - will sync when online", "warning");
    }

    // Update local data
    selectedLand.Crops.percentage = parsed;
    selectedLand.Crops.updatedOn = formatDateOnly(new Date().toISOString());
  }
}

async function advanceCropStatus(newStatus) {
  console.log("called");
  try {
    if (newStatus === "Field Clearing") {
      // Try to clear via API
      try {
        if (selectedLand.Crops.id) {
          await apiCall(`/crops/${selectedLand.Crops.id}`, {
            method: "DELETE",
          });
          showToast("Crop cleared successfully!", "success");
        }
      } catch (error) {
        console.warn("API clear failed, updating locally:", error);
        showToast("Cleared locally - will sync when online", "warning");
      }

      selectedLand.Crops = null;
    } else {
      // Try to update status via API
      try {
        if (selectedLand.Crops.id) {
          await updateCropStatusViaAPI(
            selectedLand.Crops.id,
            newStatus,
            selectedLand.Crops.percentage
          );
          showToast("Status updated successfully!", "success");
        }
      } catch (error) {
        console.warn("API update failed, updating locally:", error);
        showToast("Updated locally - will sync when online", "warning");
      }

      // Update local data
      selectedLand.Crops.status = newStatus;
      selectedLand.Crops.updatedOn = formatDateOnly(new Date().toISOString());
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
  const addButton = document.getElementById("AddCropbtn");
  const originalText = addButton.textContent;
  addButton.textContent = "Adding...";
  addButton.disabled = true;

  try {
    // Prepare crop data
    const cropData = {
      itemId: item.itemId,
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
        landId: selectedLand.index,
        crop: cropData,
      }),
    });

    if (!response.ok) throw new Error("Failed to add crop");

    // Try to add via API
    // try {
    //   await addCropViaAPI(selectedLand.LandId, cropData);
    //   showToast("Crop added successfully!", "success");

    //   // Reload data from API to get the actual saved structure
    //   //console.log("🔧 DEBUG: Reloading data after successful crop addition...");
    //   //console.log("🔧 DEBUG: Before reload - selectedLand:", selectedLand);
    //   //console.log("🔧 DEBUG: Before reload - parsedLands:", parsedLands);

    //   await loadCropsPageData();

    //   //console.log("🔧 DEBUG: After reload - parsedLands:", parsedLands);

    //   // Re-select the same land after data reload
    //   if (selectedLand && selectedLand.LandId) {
    //     const updatedLand = parsedLands.find(
    //       (l) => l.LandId === selectedLand.LandId
    //     );
    //     if (updatedLand) {
    //       selectedLand = updatedLand;
    //       //console.log("🔧 DEBUG: Re-selected land after reload:", selectedLand);
    //     }
    //   }

    //   // Re-render the crop table
    //   renderCropTable();
    //   //console.log("🔧 DEBUG: Crop table re-rendered");
    // } catch (apiError) {
    //   console.warn("API failed, updating locally:", apiError);
    //   showToast("Added locally - will sync when online", "warning");

    //   // Only update local data if API failed
    //   selectedLand.Crops = {
    //     itemId: item.itemId,
    //     plantedAmount,
    //     avgRatePerUnit: avgRate,
    //     fruitingPerPlant: fruiting,
    //     plantedOn,
    //     expectedHarvestDate,
    //     status: "Planting",
    //     updatedOn: new Date().toISOString(),
    //     percentage: 10,
    //     imageUrl: getRandomRealCropImage(),
    //   };
    // }

    // Reset form fields
    document.getElementById("inputPlantedAmt").value = "";
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

    const tdName = document.createElement("td");
    tdName.textContent = land.landName;
    tr.appendChild(tdName);

    if (land.crop) {
      // Crop exists — display its details

      const crop = land.crop;
      const options = getStatusOptions(crop.status);

      tr.innerHTML += `
        <td>${getItemDisplayName(crop.itemId)}</td>    
        <td>${crop.plantedAmount}</td>
        <td>${formatDateOnly(crop.plantedOn)}</td>
        <td>
            <select onchange="advanceCropStatus(this.value)">
             ${options}
            </select>
        </td>
        <td>${formatDateOnly(crop.updatedOn)}</td>
        <td>
          <input type="number" value="${
            crop.statusPercentage
          }" min="0" max="100" onchange="updateCropPercentage(this.value)" />
        </td>
        <td><img src="${crop.imageUrl}" alt="${crop.item}"></td>
      `;
    } else {
      // No crop — show Add Crop button
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

  // Hide old section
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
    .getElementById("AddCropbtn")
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
window.advanceCropStatus = advanceCropStatus;
window.updateCropPercentage = updateCropPercentage;
//when click on ShowFrom the form will be shown

function startForm() {
  document.querySelector(".section#addCropSection").style.display = "block";
  fillLandDropdown();

}
