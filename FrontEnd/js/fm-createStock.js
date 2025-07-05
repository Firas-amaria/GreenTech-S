

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const shift = params.get("shift");
  const container = document.getElementById("stock-section");
  document.getElementById("header").textContent = `Create Stock for ${shift}`;

  let stats = [];
  let farmerInventory = [];

  try {
    // console.log(`🔄 Fetching demand statistics for shift: ${shift}`);
    const statRes = await fetch(
      `http://localhost:4000/api/farmerManager/demandStatistics/${shift}`
    );
    if (!statRes.ok) {
      throw new Error(`Demand stat fetch failed: ${statRes.status}`);
    }
    const statData = await statRes.json();
    // console.log("📊 Demand statistics response:", statData);
    stats = statData?.items || [];

    if (stats.length === 0) {
      console.warn("⚠ No demand statistics found for this shift.");
      container.innerHTML = "<p>No demand data for this shift.</p>";
      return;
    }
  } catch (error) {
    console.error("❌ Error fetching demand statistics:", error);
    container.innerHTML = "<p>Failed to load demand data.</p>";
    return;
  }

  try {
    //console.log("🔄 Fetching farmer inventory");
    const invRes = await fetch(
      `http://localhost:4000/api/farmerManager/farmerInventory`
    );
    if (!invRes.ok) {
      throw new Error(`Farmer inventory fetch failed: ${invRes.status}`);
    }
    const invData = await invRes.json();
    //console.log("🌾 Raw farmer inventory response:", invData);

    farmerInventory = invData.inventory || [];

    if (!Array.isArray(farmerInventory)) {
      throw new Error("Expected an array in 'inventory' field.");
    }

    console.log("🌾 Parsed farmer inventory (array):", farmerInventory);
  } catch (error) {
    console.error("❌ Error fetching farmer inventory:", error);
    container.innerHTML = "<p>Failed to load farmer inventory.</p>";
    return;
  }

  stats.forEach((item) => {
    const typicalDemand = item.averageDemandQuantityKg;
    const itemFarmers = farmerInventory.filter(
      (inv) => inv.itemId === item.itemId
    );

    // console.log(
    //   `📦 Item ${item.itemDisplayName} (${item.itemId}) has ${itemFarmers.length} matching farmers.`
    // );

    itemFarmers.forEach((farmer) => {
      farmer.maxOrder = parseFloat(farmer.maxOrder).toFixed(1);
    });

    const section = document.createElement("div");
    section.className = "item-section";
    section.innerHTML = `<h2>${item.itemDisplayName} (expected: ${typicalDemand} kg)</h2>`;

    if (itemFarmers.length === 0) {
      section.innerHTML += `<p>No farmers have this item ready for harvest.</p>`;
    } else {
      const tbodyId = `farmers-${item.itemId}`;
      section.innerHTML += `
        <table>
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Available</th>
              <th>Max Order</th>
              <th>Order (kg)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="${tbodyId}"></tbody>
        </table>
        <p id="summary-${item.itemId}">
          Total ordered so far: 0 kg | Remaining to fill demand: ${typicalDemand} kg
        </p>
      `;
      container.appendChild(section);
      renderFarmersForItem(itemFarmers, item, tbodyId, typicalDemand);
    }
    container.appendChild(section);
  });
});

function renderFarmersForItem(farmers, item, tbodyId, typicalDemand) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";

  farmers.forEach((farmer) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${farmer.farmerId}</td>
      <td>${farmer.currentAvailableForProcurementKg.toFixed(1)} kg</td>
      <td id="max-${item.itemId}-${farmer.farmerId}">${farmer.maxOrder} kg</td>
      <td>
        <input type="number" min="0" placeholder="kg" 
          data-item="${item.itemId}" 
          data-farmer="${farmer.farmerId}" 
          data-max="${farmer.maxOrder}"
          data-typical="${typicalDemand}"
          id="input-${item.itemId}-${farmer.farmerId}">
      </td>
      <td></td>
    `;
    tbody.appendChild(tr);

    const btn = document.createElement("button");
    btn.textContent = "Add";
    btn.addEventListener("click", () => {
      console.log(
        `🟢 Add clicked for ${item.itemId}, Farmer ${farmer.farmerId}`
      );
      createFarmerStock(
        item.itemId,
        item.itemDisplayName,
        farmer.farmerId,
        farmer.pickupAddress,
        btn
      );
    });
    tr.lastElementChild.appendChild(btn);

    const input = tr.querySelector("input");
    input.addEventListener("input", () =>
      updateTotals(item.itemId, typicalDemand)
    );
  });
}

function updateTotals(itemId, typicalDemand) {
  let total = 0;
  const inputs = document.querySelectorAll(`input[data-item="${itemId}"]`);
  inputs.forEach((input) => {
    let val = parseFloat(input.value) || 0;
    const max = parseFloat(input.dataset.max) || 0;
    if (val > max) {
      val = max;
      input.value = max;
    }
    total += val;
  });
  const remaining = Math.max(0, typicalDemand - total).toFixed(1);
  document.getElementById(
    `summary-${itemId}`
  ).textContent = `Total ordered so far: ${total.toFixed(
    1
  )} kg | Remaining to fill demand: ${remaining} kg`;
}

async function createFarmerStock(
  itemId,
  itemDisplayName,
  farmerId,
  landId,
  btnEl
) {
  const inputId = `input-${itemId}-${farmerId}`;
  const inputEl = document.getElementById(inputId);
  let orderQty = parseFloat(inputEl.value) || 0;

  const maxEl = document.getElementById(`max-${itemId}-${farmerId}`);
  let maxAvailable = parseFloat(maxEl.textContent) || 0;

  if (orderQty > maxAvailable) {
    orderQty = maxAvailable;
    inputEl.value = maxAvailable;
  }

  if (orderQty <= 0) {
    alert("Please enter a valid kg amount.");
    return;
  }

  maxAvailable -= orderQty;
  maxEl.textContent = `${maxAvailable.toFixed(1)} kg`;
  inputEl.dataset.max = maxAvailable.toFixed(1);

  const shift = new URLSearchParams(window.location.search).get("shift");


  const user = JSON.parse(localStorage.getItem("user"));
// 2. Extract only the name
const managerName = user?.name;
/*  

okay what we need now is to make sure that the manager is a farmer manager or admin 
send token and in backend check if the user is a farmer manager or admin
If not, alert the user and return early.
and saving in local storage i dont know if it is a good idea or not
cause it refreshes somewhere between 30mins to an hour 
*/

  console.log("📤 Sending stock POST request with:", {
    logisticCenterId: "LC-1",
    shift,
    itemId,
    itemDisplayName,
    itemPictureUrl: "https://example.com/images/default.jpg",
    sourceFarmerId: farmerId,
    sourceFarmerName: farmerId,
    sourceFarmName: "UNKNOWN FARM",
    sourceLandId: landId,
    currentAvailableQuantityKg: orderQty,
    originalCommittedQuantityKg: orderQty,
    createdByManagerId: "FM_UID_abc" ,
    managerName: managerName,
  });

  try {
    const res = await fetch(
      "http://localhost:4000/api/farmerManager/createStockItem",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logisticCenterId: "LC-1",
          shift,
          itemId,
          itemDisplayName,
         // itemPictureUrl: "https://example.com/images/default.jpg",
          sourceFarmerId: farmerId,
          sourceFarmerName: farmerId,
          sourceFarmName: "UNKNOWN FARM",
          sourceLandId: landId,
          currentAvailableQuantityKg: orderQty,
          originalCommittedQuantityKg: orderQty,
          createdByManagerId: "user_UID_abc", // Replace with actual user ID
          createdByName: managerName,
          
        }),
      }
    );

    const result = await res.json();
    console.log("✅ POST response:", result);

    if (res.ok) {
      btnEl.classList.add("added");
      btnEl.textContent = "Added";
    } else {
      alert("Failed to save stock item!");
    }
  } catch (err) {
    console.error("❌ Error submitting stock:", err);
    alert("Network error! Failed to submit.");
  }
}

