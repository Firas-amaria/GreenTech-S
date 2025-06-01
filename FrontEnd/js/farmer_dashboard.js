document.addEventListener("DOMContentLoaded", () => {
  const cropTable = document.querySelector("#cropTable tbody");

  // Simulated DB data
  const crops = [
    {
      id: "crop1",
      item: "Tomato",
      status: "growing",
      plantedDate: "2025-05-01",
      amount: 120,
      harvestEstimate: "2025-06-10"
    },
    {
      id: "crop2",
      item: "Cucumber",
      status: "planted",
      plantedDate: "2025-05-28",
      amount: 80,
      harvestEstimate: "2025-06-20"
    }
  ];

  function renderTable() {
    cropTable.innerHTML = ""; // clear
    crops.forEach(crop => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${crop.item}</td>
        <td>${crop.status}</td>
        <td>${crop.plantedDate}</td>
        <td>${crop.amount}</td>
        <td>${crop.harvestEstimate}</td>
        <td>
          <button onclick="editCrop('${crop.id}')">✏ Edit</button>
          <button onclick="deleteCrop('${crop.id}')">🗑 Delete</button>
        </td>
      `;
      cropTable.appendChild(row);
    });
  }

  renderTable();

  window.editCrop = function(id) {
    alert("Edit crop: " + id);
    // Load data to modal form for edit
  };

  window.deleteCrop = function(id) {
    const i = crops.findIndex(c => c.id === id);
    if (i !== -1) {
      crops.splice(i, 1);
      renderTable();
    }
  };
});
