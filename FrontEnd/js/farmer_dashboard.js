  document.addEventListener("DOMContentLoaded", () => {
      const cropTable = document.getElementById("cropTable");
      const cropTableBody = document.getElementById("cropTableBody");
      const modal = document.getElementById("cropModal");
      const cropSearch = document.getElementById("cropSearch");
      const cropSuggestions = document.getElementById("cropSuggestions");
      const cropForm = document.getElementById("cropForm");
      const cropStatusDropdown = document.getElementById("cropStatus");

      const crops = [];
      let selectedCrop = "";
      let editingCropId = null;

      const itemsList = [
        "Tomato", "Cucumber", "Carrot", "Lettuce",
        "Spinach", "Potato", "Onion", "Pepper"
      ];

      const cropStatusOptions = [
        "Planting", "Growing", "Crop Maintenance", "Blooming",
        "Fruit Set", "Ripening", "Harvesting", "Harvested", "Field Clearing"
      ];

      function renderTable() {
        cropTableBody.innerHTML = "";
        const header = document.createElement("tr");
        header.innerHTML = `
          <th>Item</th>
          <th>Status</th>
          <th>Planted Date</th>
          <th>Amount</th>
          <th>Actions</th>
        `;
        cropTableBody.appendChild(header);

        crops.forEach(crop => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${crop.item}</td>
            <td>${crop.status}</td>
            <td>${crop.plantedDate}</td>
            <td>${crop.amount}</td>
            <td>
              <button onclick="editCrop('${crop.id}')">✏️ Edit</button>
              <button onclick="deleteCrop('${crop.id}')">🗑️ Delete</button>
            </td>
          `;
          cropTableBody.appendChild(row);
        });
      }

      window.editCrop = function (id) {
        const crop = crops.find(c => c.id === id);
        if (!crop) return;
        editingCropId = id;
        document.getElementById("modalTitle").textContent = "Update Crop Status";
        modal.classList.remove("hidden");
        cropSearch.value = crop.item;
        document.getElementById("quantity").value = crop.amount;
        document.getElementById("harvestDate").value = crop.plantedDate;

        cropSearch.disabled = true;
        document.getElementById("quantity").disabled = true;
        document.getElementById("harvestDate").disabled = true;

        populateStatusDropdown(crop.status);
      };

      window.deleteCrop = function (id) {
        const index = crops.findIndex(c => c.id === id);
        if (index !== -1) {
          crops.splice(index, 1);
          renderTable();
        }
      };

      document.getElementById("addCropBtn").addEventListener("click", () => {
        editingCropId = null;
        cropForm.reset();
        cropSearch.disabled = false;
        document.getElementById("quantity").disabled = false;
        document.getElementById("harvestDate").disabled = false;
        document.getElementById("modalTitle").textContent = "Add Crop";
        modal.classList.remove("hidden");
        populateStatusDropdown();
      });

      document.getElementById("closeModal").addEventListener("click", () => {
        modal.classList.add("hidden");
      });

      function populateStatusDropdown(currentStatus = null) {
        cropStatusDropdown.innerHTML = `<option value="">-- Select status --</option>`;
        let startIndex = 0;
        if (currentStatus) {
          startIndex = cropStatusOptions.findIndex(s => s.toLowerCase().replace(/\s+/g, "_") === currentStatus);
          startIndex = Math.max(startIndex + 1, 0);
        }
        for (let i = startIndex; i < cropStatusOptions.length; i++) {
          const status = cropStatusOptions[i];
          const option = document.createElement("option");
          option.value = status.toLowerCase().replace(/\s+/g, "_");
          option.textContent = status;
          cropStatusDropdown.appendChild(option);
        }
      }

      cropSearch.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        cropSuggestions.innerHTML = "";
        if (!query) return;

        const matches = itemsList.filter(item =>
          item.toLowerCase().startsWith(query)
        );

        if (matches.length === 0) return;

        const list = document.createElement("ul");
        list.className = "suggestions-ul";
        matches.forEach(match => {
          const item = document.createElement("li");
          item.textContent = match;
          item.className = "suggestion-item";
          item.addEventListener("mousedown", () => {
            cropSearch.value = match;
            selectedCrop = match;
            cropSuggestions.innerHTML = "";
          });
          list.appendChild(item);
        });
        cropSuggestions.appendChild(list);
      });

      cropSearch.addEventListener("blur", () => {
        setTimeout(() => cropSuggestions.innerHTML = "", 100);
      });

      cropForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const item = cropSearch.value || selectedCrop;
        const amount = parseInt(document.getElementById("quantity").value);
        const status = cropStatusDropdown.value;
        const plantedDate = document.getElementById("harvestDate").value;

        if (!item || !status || !plantedDate || isNaN(amount)) {
          alert("Please fill in all fields correctly.");
          return;
        }

        if (editingCropId) {
          const crop = crops.find(c => c.id === editingCropId);
          if (crop) {
            crop.status = status;
          }
        } else {
          const newCrop = {
            id: "crop" + Date.now(),
            item,
            status,
            plantedDate,
            timeStamp: new Date().toISOString(),
            amount
          };
          crops.push(newCrop);
        }

        renderTable();
        cropForm.reset();
        modal.classList.add("hidden");
      });

      renderTable();
    });