 document.addEventListener("DOMContentLoaded", () => {
      const cropTable = document.getElementById("cropTable");
      const cropTableBody = document.getElementById("cropTableBody");
      const modal = document.getElementById("cropModal");
      const cropSearch = document.getElementById("cropSearch");
      const cropSuggestions = document.getElementById("cropSuggestions");
      const cropForm = document.getElementById("cropForm");
      const cropStatusDropdown = document.getElementById("cropStatus");

      // get data from the database for the crops

      const crops = [];  
      let selectedCrop = "";
// get data from the database for the items
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
        alert("Edit crop " + id);
      };

      window.deleteCrop = function (id) {
        const index = crops.findIndex(c => c.id === id);
        if (index !== -1) {
          crops.splice(index, 1);
          renderTable();
        }
      };

      document.getElementById("addCropBtn").addEventListener("click", () => {
        modal.classList.remove("hidden");
        populateStatusDropdown();
      });

      document.getElementById("closeModal").addEventListener("click", () => {
        modal.classList.add("hidden");
      });

      function populateStatusDropdown() {
        cropStatusDropdown.innerHTML = `<option value="">-- Select status --</option>`;
        cropStatusOptions.forEach(status => {
          const option = document.createElement("option");
          option.value = status.toLowerCase().replace(/\s+/g, "_");
          option.textContent = status;
          cropStatusDropdown.appendChild(option);
        });
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

        const newCrop = {
          id: "crop" + Date.now(),
          item,
          status,
          plantedDate,
          timeStamp: new Date().toISOString(),
          amount
        };

        crops.push(newCrop);
        renderTable();
        cropForm.reset();
        modal.classList.add("hidden");
      });

      renderTable();
    });