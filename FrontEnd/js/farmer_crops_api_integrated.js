// =================================================================
// 🔄 UPDATED FARMER CROPS - WITH API INTEGRATION
// Example of how to integrate the backend API with frontend
// =================================================================

import { 
  fetchCropsPageData, 
  addCrop, 
  updateCropStatus,
  CROP_STATUS_OPTIONS,
  REAL_CROP_IMAGES 
} from './farmer-api.js';

// Global variables
let parsedLands = [];
let itemList = [];
let cropStatusOptions = CROP_STATUS_OPTIONS;
let selectedLand = null;

// Utility functions (keep existing)
function formatDateOnly(dateString) {
  const date = new Date(dateString);
  return isNaN(date) ? dateString : date.toLocaleDateString();
}

function getStatusOptions(currentStatus) {
  const currentIndex = cropStatusOptions.indexOf(currentStatus);
  const options = [];

  if (currentIndex > 0) options.push(cropStatusOptions[currentIndex - 1]);
  options.push(currentStatus);
  if (currentIndex < cropStatusOptions.length - 2) {
    options.push(cropStatusOptions[currentIndex + 1]);
  }

  options.push("Field Clearing");
  return [...new Set(options)];
}

function getCropDisplayName(itemId) {
  const item = itemList.find((i) => i.itemId === itemId);
  return item ? `${item.itemName} - ${item.variety}` : "Unknown Item";
}

function getRandomRealCropImage() {
  const index = Math.floor(Math.random() * REAL_CROP_IMAGES.length);
  return REAL_CROP_IMAGES[index];
}

// =================================================================
// 🔌 API INTEGRATION FUNCTIONS
// =================================================================

// Load data from API instead of hardcoded values
async function loadPageData() {
  try {
    // Show loading indicator
    showLoadingIndicator();
    
    // Fetch data from backend API
    const data = await fetchCropsPageData();
    
    // Update global variables with API data
    parsedLands = data.parsedLands || [];
    itemList = data.itemList || [];
    cropStatusOptions = data.cropStatusOptions || CROP_STATUS_OPTIONS;
    
    // Initialize page with API data
    fillLandDropdown();
    populateItemDropdown();
    
    if (parsedLands.length > 0) {
      selectedLand = parsedLands[0];
      document.getElementById("landSelector").value = selectedLand.LandId;
      renderCropTable();
    }
    
    hideLoadingIndicator();
    console.log('Successfully loaded data from API');
    
  } catch (error) {
    console.error('Failed to load data from API:', error);
    hideLoadingIndicator();
    showErrorMessage('Failed to load data. Using offline mode.');
    
    // Fallback to original hardcoded data
    await loadFallbackData();
  }
}

// Fallback to original mock data if API fails
async function loadFallbackData() {
  // Original hardcoded data as fallback
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
        imageUrl: REAL_CROP_IMAGES[0],
      },
    },
  ];
  
  itemList = [
    { itemName: "Tomato", variety: "Cherry", itemId: "001" },
    { itemName: "Lettuce", variety: "Iceberg", itemId: "002" },
    { itemName: "Potato", variety: "White", itemId: "003" },
  ];
  
  fillLandDropdown();
  populateItemDropdown();
  
  if (parsedLands.length > 0) {
    selectedLand = parsedLands[0];
    document.getElementById("landSelector").value = selectedLand.LandId;
    renderCropTable();
  }
}

// =================================================================
// 🌱 UPDATED CROP MANAGEMENT FUNCTIONS
// =================================================================

// Updated add crop function with API integration
async function handleAddCrop() {
  const selectedItemId = document.getElementById("itemDropdown").value;
  const plantedAmount = parseFloat(document.getElementById("inputPlantedAmt").value);
  const avgRate = parseFloat(document.getElementById("avgRatePerUnit").value);
  const fruiting = parseFloat(document.getElementById("fruitingPerPlant").value);
  const plantedOn = document.getElementById("inputPlantedOn").value;
  const expectedHarvestDate = document.getElementById("expectedHarvestDate").value;

  const item = itemList.find((i) => i.itemId === selectedItemId);

  if (!item || isNaN(plantedAmount) || isNaN(avgRate) || isNaN(fruiting) || !plantedOn || !expectedHarvestDate) {
    alert("Please fill all fields with valid values.");
    return;
  }

  try {
    // Show loading
    const addButton = document.getElementById("btnAddCrop");
    const originalText = addButton.textContent;
    addButton.textContent = "Adding...";
    addButton.disabled = true;

    // Prepare crop data
    const cropData = {
      itemId: item.itemId,
      quantity: plantedAmount,
      avgRatePerUnit: avgRate,
      fruitingPerPlant: fruiting,
      plantedDate: plantedOn,
      expectedHarvestDate,
      status: "Planting",
      statusPercentage: 10,
      imageUrl: getRandomRealCropImage(),
      // Additional fields for backend
      farmerId: 'current-user-id', // You'll need to get this from auth
      updatedOn: new Date().toISOString()
    };

    // Call API to add crop
    await addCrop(selectedLand.LandId, cropData);

    // Update local data
    selectedLand.Crops = {
      itemId: item.itemId,
      plantedAmount,
      plantedOn,
      status: "Planting",
      updatedOn: new Date().toISOString(),
      percentage: 10,
      imageUrl: getRandomRealCropImage(),
    };

    // Reset form fields
    document.getElementById("inputPlantedAmt").value = "";
    document.getElementById("avgRatePerUnit").value = "";
    document.getElementById("fruitingPerPlant").value = "";
    document.getElementById("inputPlantedOn").value = "";
    document.getElementById("expectedHarvestDate").value = "";

    // Refresh table
    renderCropTable();
    
    // Show success message
    showSuccessMessage("Crop added successfully!");

    // Restore button
    addButton.textContent = originalText;
    addButton.disabled = false;

  } catch (error) {
    console.error('Failed to add crop:', error);
    alert("Failed to add crop. Please try again.");
    
    // Restore button
    const addButton = document.getElementById("btnAddCrop");
    addButton.textContent = "Add Crop";
    addButton.disabled = false;
  }
}

// Updated advance crop status with API integration
async function advanceCropStatus(newStatus) {
  if (!selectedLand?.Crops) return;

  try {
    if (newStatus === "Field Clearing") {
      // Call API to clear/remove crop
      // await deleteCrop(selectedLand.Crops.id); // You'll need to implement this
      selectedLand.Crops = null;
    } else {
      // Call API to update crop status
      const updatedData = {
        status: newStatus,
        updatedOn: new Date().toISOString()
      };
      
      // await updateCropStatus(selectedLand.Crops.id, newStatus, selectedLand.Crops.percentage);
      
      // Update local data
      selectedLand.Crops.status = newStatus;
      selectedLand.Crops.updatedOn = updatedData.updatedOn;
    }
    
    renderCropTable();
    showSuccessMessage("Crop status updated successfully!");
    
  } catch (error) {
    console.error('Failed to update crop status:', error);
    showErrorMessage("Failed to update crop status. Please try again.");
  }
}

// Updated percentage update with API integration
async function updateCropPercentage(value) {
  const parsed = parseFloat(value);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
    try {
      // Call API to update percentage
      // await updateCropStatus(selectedLand.Crops.id, selectedLand.Crops.status, parsed);
      
      // Update local data
      selectedLand.Crops.percentage = parsed;
      selectedLand.Crops.updatedOn = new Date().toISOString();
      
      showSuccessMessage("Percentage updated successfully!");
      
    } catch (error) {
      console.error('Failed to update percentage:', error);
      showErrorMessage("Failed to update percentage.");
    }
  }
}

// =================================================================
// 🎨 UI HELPER FUNCTIONS
// =================================================================

function showLoadingIndicator() {
  // Create or show loading indicator
  let loader = document.getElementById('loadingIndicator');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loadingIndicator';
    loader.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 1000;">
        <div>Loading data from server...</div>
        <div style="margin-top: 10px; text-align: center;">⏳</div>
      </div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = 'block';
}

function hideLoadingIndicator() {
  const loader = document.getElementById('loadingIndicator');
  if (loader) {
    loader.style.display = 'none';
  }
}

function showSuccessMessage(message) {
  showToast(message, 'success');
}

function showErrorMessage(message) {
  showToast(message, 'error');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 1001;
    padding: 12px 20px; border-radius: 4px; color: white;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// =================================================================
// 🏁 KEEP EXISTING FUNCTIONS (NO CHANGES NEEDED)
// =================================================================

function fillLandDropdown() {
  const select = document.getElementById("landSelector");
  select.innerHTML = ""; // Clear existing options
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

function populateItemDropdown() {
  const dropdown = document.getElementById("itemDropdown");
  dropdown.innerHTML = "";
  itemList.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.itemId;
    option.textContent = `${item.itemName} - ${item.variety}`;
    dropdown.appendChild(option);
  });
}

function renderCropTable() {
  const tbody = document.querySelector("#tblCrops tbody");
  tbody.innerHTML = "";

  if (!selectedLand) return;

  const crop = selectedLand.Crops;

  if (!crop) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7">No crop reported on this land.</td>`;
    tbody.appendChild(row);
    document.querySelector(".section#addCropSection").style.display = "block";
    return;
  }

  document.querySelector(".section#addCropSection").style.display = "none";

  const tr = document.createElement("tr");
  const options = getStatusOptions(crop.status);

  tr.innerHTML = `
    <td>${getCropDisplayName(crop.itemId)}</td>    
    <td>${crop.plantedAmount}</td>
    <td>${formatDateOnly(crop.plantedOn)}</td>
    <td>
      <select onchange="advanceCropStatus(this.value)">
        ${options
          .map(
            (opt) =>
              `<option value="${opt}" ${
                opt === crop.status ? "selected" : ""
              }>${opt}</option>`
          )
          .join("")}
      </select>
    </td>
    <td>${formatDateOnly(crop.updatedOn)}</td>
    <td>
      <input type="number" value="${crop.percentage}" min="0" max="100" 
             onchange="updateCropPercentage(this.value)" />
    </td>
    <td><img src="${crop.imageUrl}" alt="${crop.itemId}" width="50" height="50"></td>
  `;
  tbody.appendChild(tr);
}

// =================================================================
// 🚀 UPDATED INITIALIZATION
// =================================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Load data from API instead of hardcoded
  await loadPageData();
  
  // Set up event listeners
  document.getElementById("btnAddCrop").addEventListener("click", handleAddCrop);
  
  console.log('Farmer crops page initialized with API integration');
});

// Export functions for global access (if needed)
window.advanceCropStatus = advanceCropStatus;
window.updateCropPercentage = updateCropPercentage;
