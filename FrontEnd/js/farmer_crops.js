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

const parsedLands = [
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

const itemList = [
  { itemName: "Tomato", variety: "Cherry", itemId: "001" },
  { itemName: "Lettuce", variety: "Iceberg", itemId: "002" },
  { itemName: "Potato", variety: "White", itemId: "003" },
];

let selectedLand = null;

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
  const tbody = document.querySelector("#tblCrops tbody");
  tbody.innerHTML = "";

  if (!selectedLand) return;

  const crop = selectedLand.Crops;

  if (!crop) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6">No crop reported on this land.</td>`;
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

function updateCropPercentage(value) {
  const parsed = parseFloat(value);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
    selectedLand.Crops.percentage = parsed;
    selectedLand.Crops.updatedOn = formatDateOnly(new Date().toISOString());
  }
}

function advanceCropStatus(newStatus) {
  if (!selectedLand?.Crops) return;

  if (newStatus === "Field Clearing") {
    selectedLand.Crops = null;
  } else {
    selectedLand.Crops.status = newStatus;
    selectedLand.Crops.updatedOn = formatDateOnly(new Date().toISOString());
  }
  renderCropTable();
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

function handleAddCrop() {
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

  // Reset form fields
  document.getElementById("inputPlantedAmt").value = "";
  document.getElementById("avgRatePerUnit").value = "";
  document.getElementById("fruitingPerPlant").value = "";
  document.getElementById("inputPlantedOn").value = "";
  document.getElementById("expectedHarvestDate").value = "";

  renderCropTable();
}

document.addEventListener("DOMContentLoaded", () => {
  fillLandDropdown();
  selectedLand = parsedLands[0];
  document.getElementById("landSelector").value = selectedLand.LandId;
  populateItemDropdown();
  renderCropTable();
  document
    .getElementById("btnAddCrop")
    .addEventListener("click", handleAddCrop);
});
