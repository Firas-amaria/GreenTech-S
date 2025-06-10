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
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=50&q=80", // Tomato
  "https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=50&q=80", // Lettuce
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=50&q=80", // Potato
  "https://images.unsplash.com/photo-1574226516831-e1dff420e43e?auto=format&fit=crop&w=50&q=80", // Carrots
  "https://images.unsplash.com/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=50&q=80", // Peppers
];

function getRandomRealCropImage() {
  const index = Math.floor(Math.random() * realCropImages.length);
  return realCropImages[index];
}

let cropsData = [
  {
    id: 1,
    item: "Tomato",
    plantedAmount: 10,
    plantedOn: "2025-05-01",
    status: "Planting",
    percentage: 17,
    imageUrl: realCropImages[0],
  },
  {
    id: 2,
    item: "Lettuce",
    plantedAmount: 5,
    plantedOn: "2025-05-10",
    status: "Growing",
    percentage: 20,
    imageUrl: realCropImages[1],
  },
  {
    id: 3,
    item: "Potato",
    plantedAmount: 8,
    plantedOn: "2025-04-20",
    status: "Harvesting",
    percentage: 30,
    imageUrl: realCropImages[2],
  },
];

function formatDateOnly(dateString) {
  const date = new Date(dateString);
  return isNaN(date) ? dateString : date.toLocaleDateString();
}

function populateCropsTable() {
  const tbody = document.querySelector("#tblCrops tbody");
  tbody.innerHTML = "";

  cropsData.forEach((crop) => {
    const tr = document.createElement("tr");
    const currentIndex = cropStatusOptions.indexOf(crop.status);
    const isFinal = currentIndex === cropStatusOptions.length - 1;
    let statusCell;

    if (!isFinal) {
      const nextStatus = cropStatusOptions[currentIndex + 1];
      statusCell = `
            <td class="inline-edit">
              <select onchange="advanceCropStatus(${crop.id}, this.value)">
                <option value="${crop.status}" disabled selected>${crop.status}</option>
                <option value="${nextStatus}">${nextStatus}</option>
              </select>
            </td>`;
    } else {
      statusCell = `<td>${crop.status}</td>`;
    }

    tr.innerHTML = `
          <td>${crop.item}</td>
          <td>${crop.plantedAmount}</td>
          <td>${formatDateOnly(crop.plantedOn)}</td>
          ${statusCell}
          <td>${crop.percentage !== null ? crop.percentage + "%" : "N/A"}</td>
          <td><img src="${crop.imageUrl}" alt="${crop.item}"></td>
        `;
    tbody.appendChild(tr);
  });
}

function advanceCropStatus(id, newStatus) {
  const crop = cropsData.find((c) => c.id === id);
  if (crop) {
    crop.status = newStatus;
    populateCropsTable();
  }
}

document.getElementById("btnAddCrop").addEventListener("click", () => {
  const item = document.getElementById("itemInput").value.trim();
  const plantedAmount = parseFloat(
    document.getElementById("inputPlantedAmt").value
  );
  const plantedOn = document.getElementById("inputPlantedOn").value;

  if (!item || isNaN(plantedAmount) || plantedAmount <= 0 || !plantedOn) {
    alert("Please fill in valid crop details.");
    return;
  }

  const newCrop = {
    id: cropsData.length + 1,
    item,
    plantedAmount,
    plantedOn,
    status: "Planting",
    percentage: 10,
    imageUrl: getRandomRealCropImage(),
  };

  cropsData.push(newCrop);

  // Clear inputs
  document.getElementById("itemInput").value = "";
  document.getElementById("inputPlantedAmt").value = "";
  document.getElementById("inputPlantedOn").value = "";

  populateCropsTable();
});

// Initialize
populateCropsTable();

// Optional logout event handler (if you want to handle logout)
document.getElementById("logoutLink2").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Logging out...");
  // Add actual logout logic here
});
