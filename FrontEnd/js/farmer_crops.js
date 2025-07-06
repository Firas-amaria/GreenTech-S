// =================================================================
// 🔌 API INTEGRATION FOR FARMER CROPS
// =================================================================

// API Configuration
const API_BASE_URL = "http://localhost:4000/api/farmer";

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem("authToken") || null;
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();

  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

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

    // Try to load from API - use the dashboard endpoint which has the right structure
    const data = await apiCall("/frontend/dashboard");

    // Extract lands data from dashboard response
    parsedLands = data.parsedLands || [];

    // Also load items for the dropdown
    const itemsData = await apiCall("/frontend/items");
    itemList =
      itemsData.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        variety: item.category || "Standard",
      })) || [];

    //console.log("Successfully loaded data from API");
    console.log("Parsed lands:", parsedLands);
    console.log("Item list:", itemList);
    hideLoadingIndicator();
    return true;
  } catch (error) {
    console.warn("Failed to load from API, using fallback data:", error);
    hideLoadingIndicator();
    showToast("Using offline mode - some features may be limited", "warning");

    // Fallback to mock data
    parsedLands = [
      {
        LandId: "00001",
        name: "North Field",
        acres: "22",
        Crops: null,
      },
      {
        LandId: "00002",
        name: "South Plot",
        acres: "10",
        Crops: {
          itemId: "001",
          plantedAmount: 10,
          plantedOn: "2025-05-01",
          status: "Growing",
          updatedOn: "2025-05-15",
          percentage: 17,
          imageUrl: realCropImages[0],
        },
      },
    ];

    itemList = [
      { itemName: "Tomato", variety: "Cherry", itemId: "001" },
      { itemName: "Lettuce", variety: "Iceberg", itemId: "002" },
      { itemName: "Potato", variety: "White", itemId: "003" },
    ];

    return false;
  }
}

// Add crop via API
async function addCropViaAPI(landId, cropData) {
  try {
    //console.log("🔧 DEBUG: Adding crop via API");
    //console.log("🔧 DEBUG: landId:", landId);
    //console.log("🔧 DEBUG: cropData:", cropData);
    // console.log(
    //   "🔧 DEBUG: Auth token:",
    //   getAuthToken() ? "Present" : "Missing"
    // );

    const payload = {
      farmId: landId,
      ...cropData,
    };
    //console.log("🔧 DEBUG: API payload:", payload);

    const result = await apiCall("/crops", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    //console.log("🔧 DEBUG: API success:", result);
    return result;
  } catch (error) {
    console.error("🔧 DEBUG: API call failed:", error);
    console.error("🔧 DEBUG: Error details:", error.message);
    throw error;
  }
}

// Update crop status via API
async function updateCropStatusViaAPI(cropId, status, percentage) {
  try {
    return await apiCall(`/crops/${cropId}`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        statusPercentage: percentage,
        updatedOn: formatDate(new Date()),
      }),
    });
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

function fillLandDropdown() {
  const select = document.getElementById("landSelector");
  parsedLands.forEach((land) => {
    const opt = document.createElement("option");
    opt.value = land.LandId;
    opt.textContent = land.name;
    select.appendChild(opt);
  });
  select.addEventListener("change", (e) => {
    const landId = e.target.value;
    selectedLand = parsedLands.find((l) => l.LandId === landId);
    renderCropTable();
  });
}

function renderCropTable() {
  //console.log("🔧 DEBUG: renderCropTable called");
  //console.log("🔧 DEBUG: selectedLand:", selectedLand);
  //console.log("🔧 DEBUG: selectedLand?.Crops:", selectedLand?.Crops);

  const tbody = document.querySelector("#tblCrops tbody");
  tbody.innerHTML = "";

  if (!selectedLand) {
    console.log("🔧 DEBUG: No selected land");
    return;
  }

  const crop = selectedLand.Crops;

  if (!crop) {
    //console.log("🔧 DEBUG: No crop found on selected land");
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6">No crop reported on this land.</td>`;
    tbody.appendChild(row);
    document.querySelector(".section#addCropSection").style.display = "block";
    return;
  }

  //console.log("🔧 DEBUG: Crop found, rendering table with crop:", crop);
  document.querySelector(".section#addCropSection").style.display = "none";

  const tr = document.createElement("tr");
  const options = getStatusOptions(crop.status);

  tr.innerHTML = `
  <td>${getCropDisplayName(crop.itemId)}</td>    
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
        crop.percentage
      }" min="0" max="100" onchange="updateCropPercentage(this.value)" />
    </td>
    <td><img src="${crop.imageUrl}" alt="${crop.item}"></td>
  `;
  tbody.appendChild(tr);
}

function getCropDisplayName(itemId) {
  const item = itemList.find((i) => i.itemId === itemId);
  return item ? `${item.itemName} - ${item.variety}` : "Unknown Item";
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
  if (!selectedLand?.Crops) return;

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
    option.value = item.itemId;
    option.textContent = `${item.itemName} (${item.variety})`;
    dropdown.appendChild(option);
  });
}

async function handleAddCrop() {
  const selectedItemId = document.getElementById("itemDropdown").value;
  const plantedAmount = parseFloat(
    document.getElementById("inputPlantedAmt").value
  );
  const avgRate = parseFloat(document.getElementById("avgRatePerUnit").value);
  const fruiting = parseFloat(
    document.getElementById("fruitingPerPlant").value
  );
  const plantedOn = document.getElementById("inputPlantedOn").value;
  const expectedHarvestDate = document.getElementById(
    "expectedHarvestDate"
  ).value;

  const item = itemList.find((i) => i.itemId === selectedItemId);

  if (
    !item ||
    isNaN(plantedAmount) ||
    isNaN(avgRate) ||
    isNaN(fruiting) ||
    !plantedOn ||
    !expectedHarvestDate
  ) {
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

    // Try to add via API
    try {
      await addCropViaAPI(selectedLand.LandId, cropData);
      showToast("Crop added successfully!", "success");

      // Reload data from API to get the actual saved structure
      //console.log("🔧 DEBUG: Reloading data after successful crop addition...");
      //console.log("🔧 DEBUG: Before reload - selectedLand:", selectedLand);
      //console.log("🔧 DEBUG: Before reload - parsedLands:", parsedLands);

      await loadCropsPageData();

      //console.log("🔧 DEBUG: After reload - parsedLands:", parsedLands);

      // Re-select the same land after data reload
      if (selectedLand && selectedLand.LandId) {
        const updatedLand = parsedLands.find(
          (l) => l.LandId === selectedLand.LandId
        );
        if (updatedLand) {
          selectedLand = updatedLand;
          //console.log("🔧 DEBUG: Re-selected land after reload:", selectedLand);
        }
      }

      // Re-render the crop table
      renderCropTable();
      //console.log("🔧 DEBUG: Crop table re-rendered");
    } catch (apiError) {
      console.warn("API failed, updating locally:", apiError);
      showToast("Added locally - will sync when online", "warning");

      // Only update local data if API failed
      selectedLand.Crops = {
        itemId: item.itemId,
        plantedAmount,
        avgRatePerUnit: avgRate,
        fruitingPerPlant: fruiting,
        plantedOn,
        expectedHarvestDate,
        status: "Planting",
        updatedOn: new Date().toISOString(),
        percentage: 10,
        imageUrl: getRandomRealCropImage(),
      };
    }

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

document.addEventListener("DOMContentLoaded", async () => {
  // Load data from API
  await loadCropsPageData();

  // Initialize page
  fillLandDropdown();
  populateItemDropdown();

  if (parsedLands.length > 0) {
    selectedLand = parsedLands[0];
    document.getElementById("landSelector").value = selectedLand.LandId;
    renderCropTable();
  }

  // Add event listener for add crop button
  document
    .getElementById("btnAddCrop")
    .addEventListener("click", handleAddCrop);

  //console.log("Farmer crops page initialized with API integration");
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
