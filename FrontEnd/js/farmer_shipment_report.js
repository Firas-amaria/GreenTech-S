import { getCurrentUserToken } from "../js/firebase-init.js";

async function fetchApprovedShipmentByID() {
  const token = await getCurrentUserToken();
  const response = await fetch(
    `http://localhost:4000/api/farmer/getApprovedShipmentsByID/${shipmentId}`,
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

async function loadQualityStandards(itemId) {
  try {
    const itemList = await fetchItemList();
    const item = itemList.find((it) => it.id === itemId);
    if (!item) {
      console.warn("No item found for ID:", itemId);
      return "Unknown Crop";
    }
    return item.qualityStandards;
  } catch (error) {
    console.warn("Failed to load quality standards from API", error);
  }
}

// =================================================================
// 🎨 UI HELPER FUNCTIONS
// =================================================================

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

// ===== Parse query param "shipmentId" =====
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

const shipmentId = getQueryParam("shipmentId");
let shipment = {};
let qualityStandards = [];

const qualityParameterDisplayMap = [
  {
    key: "brix",
    label: "Brix (Sugar %)",
    inputType: "number",
    placeholder: "e.g. 12",
  },
  {
    key: "acidityPercentage",
    label: "Acidity (%)",
    inputType: "number",
    placeholder: "percentage",
  },
  {
    key: "pressure",
    label: "Pressure (kg/cm²)",
    inputType: "number",
    placeholder: "e.g. 1.2",
  },
  {
    key: "colorDescription",
    label: "Color Description",
    inputType: "text",
    placeholder: "e.g. Red, Green",
  },
  {
    key: "colorPercentage",
    label: "Color (%)",
    inputType: "number",
    placeholder: "e.g. 80",
  },
  {
    key: "weightPerUnitG",
    label: "Weight per Unit (g)",
    inputType: "number",
    placeholder: "e.g. 0.5",
  },
  {
    key: "diameterMM",
    label: "Diameter (mm)",
    inputType: "number",
    placeholder: "e.g. 5.5",
  },
];

// Load shipment data and quality standards
async function initializeShipmentReport() {
  try {
    shipment = await fetchApprovedShipmentByID(shipmentId);

    if (shipment.itemId) {
      qualityStandards = await loadQualityStandards(shipment.itemId);
    }

    console.log("QS:" + qualityStandards);
    populateShipmentDetails();
  } catch (error) {
    console.error("Failed to initialize shipment report:", error);
    showToast("Failed to load shipment data", "error");
  }
}

// ===== Populate Shipment Details at Top =====
function populateShipmentDetails() {
  document.getElementById("spanShipmentId").textContent = shipmentId || "N/A";
  document.getElementById("spanItem").textContent =
    shipment.itemDisplayName || "N/A";
  document.getElementById("spanAmount").textContent =
    `${shipment.finalConfirmedQuantityKg} kg` || "N/A";
  document.getElementById("spanPickupTime").textContent =
    shipment.scheduledPickupTimeSlot || "N/A";
}

function buildQualityLegendTable(qualityStandards) {
  const table = document.createElement("table");
  table.classList.add("quality-legend-table");

  // Defensive check
  if (!qualityStandards || typeof qualityStandards !== "object") {
    table.innerHTML = `<tbody><tr><td colspan="4"><em>No quality standards found for this item.</em></td></tr></tbody>`;
    return table;
  }

  let html = `
    <thead>
      <tr>
        <th>Parameter</th>
        <th>A (Premium)</th>
        <th>B (Standard)</th>
        <th>C (Below Standard)</th>
      </tr>
    </thead>
    <tbody>
  `;

  // Only loop through listed keys in specified order
  for (const { key, label } of qualityParameterDisplayMap) {
    const grades = qualityStandards[key];
    if (!grades) continue; // skip if not present in data

    html += `
      <tr>
        <td>${label}</td>
        <td>${grades?.A || "-"}</td>
        <td>${grades?.B || "-"}</td>
        <td>${grades?.C || "-"}</td>
      </tr>
    `;
  }

  html += "</tbody>";
  table.innerHTML = html;
  return table;
}

// ===== Globals =====
let containerCountGlobal = 0; // number of containers generated
let completedContainersCount = 0; // how many have been marked ready
let sumReadyWeight = 0; // sum of weights for containers already marked ready

// Array to store data of each container when marked ready
const readyContainersData = [];

// ===== Generate Container Blocks =====
document
  .getElementById("btnGenerateContainers")
  .addEventListener("click", () => {
    const count = parseInt(
      document.getElementById("inputContainerCount").value
    );
    if (isNaN(count) || count < 1) {
      alert("Enter a valid number of containers.");
      return;
    }
    createContainerBlocks(count);
    document.getElementById("remainingSection").style.display = "block";
    document.getElementById("completedContainersSection").style.display =
      "block";
    updateRemainingKg();
  });

function createContainerBlocks(count) {
  const containerDiv = document.getElementById("containersContainer");
  containerDiv.innerHTML = ""; // clear existing blocks
  completedContainersCount = 0;
  containerCountGlobal = count;
  sumReadyWeight = 0; // reset sum of ready weights
  readyContainersData.length = 0; // clear previously stored data

  // Reset completed containers list
  document.getElementById("completedContainersList").innerHTML = "";

  for (let i = 1; i <= count; i++) {
    appendContainerBlock(i);
  }
  updateReadyForPickupButton();
  // Scroll to first container
  if (count > 0) {
    document
      .getElementById("container-001")
      .scrollIntoView({ behavior: "smooth" });
  }
  updateRemainingKg();
}

function appendContainerBlock(index) {
  const containerDiv = document.getElementById("containersContainer");
  const code = String(index).padStart(3, "0");

  const block = document.createElement("div");
  block.classList.add("container-block");
  block.id = `container-${code}`;

  const header = document.createElement("h3");
  header.textContent = `Container Code: `;
  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.value = code;
  codeInput.readOnly = true;
  header.appendChild(codeInput);
  block.appendChild(header);

  // KG field
  const rowKg = document.createElement("div");
  rowKg.classList.add("inline-row");
  rowKg.innerHTML = `
  <label for="kg-${code}">Weight (kg):</label>
  <input type="number" id="kg-${code}" placeholder="e.g. 20" />
`;
  rowKg
    .querySelector(`#kg-${code}`)
    .addEventListener("input", updateRemainingKg);
  block.appendChild(rowKg);

  // Need-KG message
  const needKgMsg = document.createElement("p");
  needKgMsg.id = `needKg-${code}`;
  needKgMsg.classList.add("message");
  block.appendChild(needKgMsg);

  // Time Harvested (split into date choice + time input)
  const rowTime = document.createElement("div");
  rowTime.classList.add("inline-row");
  rowTime.innerHTML = `
  <label>Harvested:</label>
  <select id="harvested-day-${code}">
    <option value="today">Today</option>
    <option value="yesterday">Yesterday</option>
  </select>
  <input type="time" id="harvested-time-${code}" />
`;
  block.appendChild(rowTime);

  const wrapper = document.createElement("div");
  wrapper.classList.add("input-and-table-wrapper");

  const inputsLeft = document.createElement("div");
  inputsLeft.classList.add("input-fields");

  qualityParameterDisplayMap.forEach(
    ({ key, label, inputType, placeholder }) => {
      const row = document.createElement("div");
      row.classList.add("inline-row");

      const unitSuffix = label.includes("%")
        ? "%"
        : label.includes("mm")
        ? "mm"
        : "";

      row.innerHTML = `
      <label for="${key}-${code}">${label}:</label>
      <input type="${inputType}" id="${key}-${code}" placeholder="${placeholder}" />
      ${unitSuffix ? `<span style="margin-left:4px;">${unitSuffix}</span>` : ""}
    `;

      inputsLeft.appendChild(row);
    }
  );

  const legendTable = buildQualityLegendTable(qualityStandards);
  const tableWrapper = document.createElement("div");
  tableWrapper.classList.add("table-wrapper");
  const legendTitle = document.createElement("h4");
  legendTitle.textContent = `Quality Standards for "${
    shipment.itemDisplayName || ""
  }"`;
  tableWrapper.appendChild(legendTitle);
  tableWrapper.appendChild(legendTable);

  wrapper.appendChild(inputsLeft);
  wrapper.appendChild(tableWrapper);
  block.appendChild(wrapper);

  // ✅ Add final button
  const readyBtn = document.createElement("button");
  readyBtn.textContent = "Container Ready";
  readyBtn.classList.add("btn-primary");
  readyBtn.addEventListener("click", () => markContainerReady(code));
  block.appendChild(readyBtn);

  containerDiv.appendChild(block);
}

// ===== Mark Container as Ready =====
function markContainerReady(code) {
  const block = document.getElementById(`container-${code}`);
  if (!block) return;

  // Basic fields
  const kgVal = parseFloat(block.querySelector(`#kg-${code}`).value);
  const dayOption = block.querySelector(`#harvested-day-${code}`).value;
  const timeInput = block.querySelector(`#harvested-time-${code}`).value;

  if (!timeInput) {
    alert("Please enter harvest time.");
    return;
  }

  // Calculate full ISO datetime
  let baseDate = new Date();
  if (dayOption === "yesterday") {
    baseDate.setDate(baseDate.getDate() - 1);
  }
  const [hours, minutes] = timeInput.split(":").map(Number);
  baseDate.setHours(hours, minutes, 0, 0);
  const timeVal = baseDate.toISOString();

  // Dynamically collect quality inputs
  const qualityValues = {};
  let missingQualityField = false;

  for (const { key, inputType } of qualityParameterDisplayMap) {
    const input = block.querySelector(`#${key}-${code}`);
    if (!input) continue;

    const val =
      inputType === "number" ? parseFloat(input.value) : input.value.trim();

    // Validate: required fields must not be empty
    if (
      (inputType === "number" && isNaN(val)) ||
      (inputType === "text" && !val)
    ) {
      missingQualityField = true;
      break;
    }

    qualityValues[key] = val;
  }

  if (isNaN(kgVal) || !timeVal || missingQualityField) {
    alert(
      "Please complete all required fields (Item, Weight, Time Harvested, and Quality Parameters) before marking this container as ready."
    );
    return;
  }

  // Store for submission
  readyContainersData.push({
    code,
    weightKg: kgVal,
    harvestedTime: timeVal,
    ...qualityValues,
  });

  // Weight summary
  sumReadyWeight += kgVal;

  // Remove from DOM
  block.remove();
  completedContainersCount++;

  // Add to completed list
  const completedList = document.getElementById("completedContainersList");
  const li = document.createElement("li");
  li.textContent = `Container ${code}`;

  const viewBtn = document.createElement("button");
  viewBtn.textContent = "View Details";
  viewBtn.classList.add("btn-primary");
  viewBtn.addEventListener("click", () => {
    const containerData = {
      code,
      weightKg: kgVal,
      harvestedTime: timeVal,
      ...qualityValues,
    };
    alert(JSON.stringify(containerData, null, 2));
  });

  li.appendChild(viewBtn);
  completedList.appendChild(li);

  updateRemainingKg();
  updateReadyForPickupButton();
}

// ===== Update Remaining KG =====
function updateRemainingKg() {
  const totalShipmentKg = shipment.finalConfirmedQuantityKg || 0;
  const remaining = totalShipmentKg - sumReadyWeight;
  const pRemaining = document.getElementById("pRemainingKg");
  const btnAdd = document.getElementById("btnAddContainer");

  if (remaining > 0) {
    pRemaining.textContent = `Remaining to report: ${remaining.toFixed(2)} kg`;
    btnAdd.style.display = "inline-block";
  } else if (remaining === 0) {
    pRemaining.textContent = `All ${totalShipmentKg} kg accounted for.`;
    btnAdd.style.display = "none";
  } else {
    pRemaining.textContent = `Reported weight exceeds shipment by ${Math.abs(
      remaining
    ).toFixed(2)} kg.`;
    btnAdd.style.display = "none";
  }

  // Update “need-kg” message for the last open container block
  const openBlocks = document.querySelectorAll('div[id^="container-"]');
  if (openBlocks.length > 0) {
    let maxCode = 0;
    openBlocks.forEach((blockElem) => {
      const id = blockElem.id.replace("container-", "");
      const num = parseInt(id, 10);
      if (!isNaN(num) && num > maxCode) maxCode = num;
    });
    const lastCode = String(maxCode).padStart(3, "0");
    const needMsgElm = document.getElementById(`needKg-${lastCode}`);
    if (needMsgElm) {
      if (remaining > 0) {
        needMsgElm.textContent = `You need ${remaining.toFixed(
          2
        )} more kg to fulfill the shipment.`;
      } else if (remaining === 0) {
        needMsgElm.textContent = `Shipment weight is now fully accounted for.`;
      } else {
        needMsgElm.textContent = "";
      }
    }
  }
}

// ===== Add a Single Container Block =====
document.getElementById("btnAddContainer").addEventListener("click", () => {
  const nextIndex = containerCountGlobal + 1;
  containerCountGlobal = nextIndex;
  appendContainerBlock(nextIndex);
  updateRemainingKg();
  // Scroll newly added container into view
  const newContainerId = `container-${String(nextIndex).padStart(3, "0")}`;
  document
    .getElementById(newContainerId)
    .scrollIntoView({ behavior: "smooth" });
});

// ===== Update "Ready for Pickup" Button State =====
function updateReadyForPickupButton() {
  const btn = document.getElementById("btnReadyPickup");
  // Enable only when all generated containers have been marked ready
  if (
    completedContainersCount === containerCountGlobal &&
    containerCountGlobal > 0
  ) {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// ===== "Shipment is Ready" Button Handler =====
document
  .getElementById("btnReadyPickup")
  .addEventListener("click", async () => {
    const totalShipmentKg = shipment.finalConfirmedQuantityKg || 0;
    const remaining = totalShipmentKg - sumReadyWeight;
    const reportBtn = document.getElementById("reportProblemBtn");

    if (remaining > 0) {
      alert(
        `You need to fill ${remaining.toFixed(
          2
        )} more kg before marking shipment as ready.`
      );
      reportBtn.style.display = "inline-block";
      return;
    }

    // Show loading state
    const readyBtn = document.getElementById("btnReadyPickup");
    const originalText = readyBtn.textContent;
    readyBtn.textContent = "Submitting...";
    readyBtn.disabled = true;

    try {
      // Build the payload object
      const payload = {
        shipmentId: shipmentId,
        totalWeightReported: sumReadyWeight,
        containers: readyContainersData,
        readyTimestamp: new Date().toISOString(),
      };

      const token = await getCurrentUserToken();
      const response = await fetch(
        `http://localhost:4000/api/farmer/submitShipmentReport`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      showToast("Shipment marked ready for pickup successfully!", "success");
      reportBtn.style.display = "none";

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "f-dashboard.html";
      }, 2000);
    } catch (error) {
      console.error("Failed to submit shipment report:", error);
      showToast("Failed to submit report. Please try again.", "error");
      reportBtn.style.display = "inline-block";
    } finally {
      readyBtn.textContent = originalText;
      readyBtn.disabled = false;
    }
  });

// ===== "Report a Problem" Button Handler =====
document.getElementById("reportProblemBtn").addEventListener("click", () => {
  alert("Redirecting to problem report form...");
});

// ===== Initialize when page loads =====
document.addEventListener("DOMContentLoaded", async () => {
  await initializeShipmentReport();
});
