/*******************************************************
 * 🔌 API INTEGRATED SHIPMENT REPORT
 *******************************************************/

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

// =================================================================
// 🔌 API INTEGRATION FUNCTIONS
// =================================================================

async function loadShipmentData(shipmentId) {
  try {
    // Try to load specific shipment from API
    const shipmentData = await apiCall(`/shipments/${shipmentId}`);
    return shipmentData;
  } catch (error) {
    console.warn(
      "Failed to load shipment from API, using fallback data:",
      error
    );

    // Fallback to mock data
    const sampleShipments = [
      { id: 301, item: "Tomato", amount: 120, pickupTime: "2025-06-02T08:00" },
      { id: 302, item: "Lettuce", amount: 80, pickupTime: "2025-06-01T09:30" },
      { id: 303, item: "Potato", amount: 200, pickupTime: "2025-06-04T11:00" },
    ];

    const fallbackShipment =
      sampleShipments.find((s) => String(s.id) === shipmentId) || {};
    return fallbackShipment;
  }
}

async function loadQualityStandards(itemId) {
  try {
    return await apiCall(`/frontend/quality-standards/${itemId}`);
  } catch (error) {
    console.warn(
      "Failed to load quality standards from API, using fallback:",
      error
    );

    // Fallback quality standards
    return [
      { parameter: "Brix (סוכר)", a: "≥ 12", b: "8–11", c: "< 8" },
      {
        parameter: "Acidity (חומציות)",
        a: "Balanced (מאוזנת)",
        b: "Slight (חמוץ/תפל)",
        c: "Very Sour (חמוץ מאוד)",
      },
      {
        parameter: "Size (גודל)",
        a: "Medium",
        b: "Small or Too Large",
        c: "Inconsistent/Abnormal",
      },
    ];
  }
}

async function submitShipmentReport(shipmentId, payload) {
  try {
    return await apiCall(`/shipments/${shipmentId}/report-complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to submit shipment report via API:", error);
    throw error;
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

// Load shipment data and quality standards
async function initializeShipmentReport() {
  try {
    // Load shipment data
    shipment = await loadShipmentData(shipmentId);

    // Load quality standards for this item
    if (shipment.item) {
      // Try to get itemId from the item name - this might need adjustment based on your data structure
      qualityStandards = await loadQualityStandards(
        shipment.itemId || shipment.item
      );
    }

    // Populate UI
    populateShipmentDetails();

    console.log("Shipment report initialized with API data");
  } catch (error) {
    console.error("Failed to initialize shipment report:", error);
    showToast("Failed to load shipment data", "error");
  }
}

// ===== Populate Shipment Details at Top =====
function populateShipmentDetails() {
  document.getElementById("spanShipmentId").textContent = shipment.id || "N/A";
  document.getElementById("spanItem").textContent = shipment.item || "N/A";
  document.getElementById("spanAmount").textContent =
    shipment.amount != null ? `${shipment.amount} kg` : "N/A";
  document.getElementById("spanPickupTime").textContent = shipment.pickupTime
    ? new Date(shipment.pickupTime).toLocaleString()
    : "N/A";
}

// ===== Placeholder for Quality Standards (to be fetched from backend) =====
// This will be loaded dynamically from API
qualityStandards = [
  // Example format; replace with real API response
  { parameter: "Brix (סוכר)", a: "≥ 12", b: "8–11", c: "< 8" },
  {
    parameter: "Acidity (חומציות)",
    a: "Balanced (מאוזנת)",
    b: "Slight (חמוץ/תפל)",
    c: "Very Sour (חמוץ מאוד)",
  },
  {
    parameter: "Size (גודל)",
    a: "Medium",
    b: "Small or Too Large",
    c: "Inconsistent/Abnormal",
  },
];

// Build dynamic table of quality standards
function buildQualityLegendTable() {
  const table = document.createElement("table");
  let html = `
        <thead>
          <tr>
            <th>Parameter</th>
            <th>A (≥ / Balanced / Medium)</th>
            <th>B (Range / Slight / Small or Too Large)</th>
            <th>C (&lt; or &gt; / Very Sour / Inconsistent/Abnormal)</th>
          </tr>
        </thead>
        <tbody>
      `;
  qualityStandards.forEach((q) => {
    html += `
          <tr>
            <td>${q.parameter}</td>
            <td>${q.a}</td>
            <td>${q.b}</td>
            <td>${q.c}</td>
          </tr>
        `;
  });
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
  const code = String(index).padStart(3, "0"); // e.g., "001"

  const block = document.createElement("div");
  block.classList.add("container-block");
  block.id = `container-${code}`;

  // Container header
  const header = document.createElement("h3");
  header.textContent = `Container Code: `;
  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.value = code;
  codeInput.readOnly = true; // scanner will set real barcode in production
  header.appendChild(codeInput);
  block.appendChild(header);

  // Item field
  const rowItem = document.createElement("div");
  rowItem.classList.add("inline-row");
  rowItem.innerHTML = `
        <label for="item-${code}">Item:</label>
        <input type="text" id="item-${code}" value="${shipment.item || ""}" />
      `;
  block.appendChild(rowItem);

  // KG field
  const rowKg = document.createElement("div");
  rowKg.classList.add("inline-row");
  rowKg.innerHTML = `
        <label for="kg-${code}">Weight (kg):</label>
        <input type="number" id="kg-${code}" placeholder="e.g. 20" />
      `;
  // Whenever any kg-### input changes, recalc remaining:
  rowKg
    .querySelector(`#kg-${code}`)
    .addEventListener("input", updateRemainingKg);
  block.appendChild(rowKg);

  // Need-KG message under weight input
  const needKgMsg = document.createElement("p");
  needKgMsg.id = `needKg-${code}`;
  needKgMsg.classList.add("message");
  block.appendChild(needKgMsg);

  // Time Harvested
  const rowTime = document.createElement("div");
  rowTime.classList.add("inline-row");
  rowTime.innerHTML = `
        <label for="harvested-${code}">Time Harvested:</label>
        <input type="datetime-local" id="harvested-${code}" />
      `;
  block.appendChild(rowTime);

  // Quality Standards Legend (dynamic table)
  const legendTitle = document.createElement("h4");
  legendTitle.textContent = `Quality Standards for "${shipment.item || ""}"`;
  block.appendChild(legendTitle);

  const legendTable = buildQualityLegendTable();
  block.appendChild(legendTable);

  // Brix (number input)
  const rowBrix = document.createElement("div");
  rowBrix.classList.add("inline-row");
  rowBrix.innerHTML = `
        <label for="brix-${code}">Brix (סוכר):</label>
        <input type="number" id="brix-${code}" placeholder="e.g. 12" />
      `;
  block.appendChild(rowBrix);

  // Acidity (dropdown)
  const rowAcidity = document.createElement("div");
  rowAcidity.classList.add("inline-row");
  rowAcidity.innerHTML = `
        <label for="acidity-${code}">Acidity (חומציות):</label>
        <input type="number" id="acidity-${code}" placeholder=" persantage" /> %`;

  block.appendChild(rowAcidity);

  // color description
  const rowColor = document.createElement("div");
  rowColor.classList.add("inline-row");
  rowColor.innerHTML = `
        <label for="color-${code}">Color Description:</label>
        <input type="text" id="color-${code}" placeholder="e.g. Red, Green" />
      `;
  block.appendChild(rowColor);

  //color percentage
  const rowColorPercentage = document.createElement("div");
  rowColorPercentage.classList.add("inline-row");
  rowColorPercentage.innerHTML = `
        <label for="colorPercentage-${code}">Color Percentage:</label>
        <input type="number" id="colorPercentage-${code}" placeholder="e.g. 80" />%
      `;

  block.appendChild(rowColorPercentage);

  // pressure
  const rowPressure = document.createElement("div");
  rowPressure.classList.add("inline-row");
  rowPressure.innerHTML = `
        <label for="pressure-${code}">Pressure:</label>
        <input type="number" id="pressure-${code}" placeholder="e.g. 1.2" />
      `;
  block.appendChild(rowPressure);

  // weight per unit
  const rowWeightPerUnit = document.createElement("div");
  rowWeightPerUnit.classList.add("inline-row");
  rowWeightPerUnit.innerHTML = `
        <label for="weightPerUnit-${code}">Weight per Unit:</label>
        <input type="number" id="weightPerUnit-${code}" placeholder="e.g. 0.5" />
      `;
  block.appendChild(rowWeightPerUnit);

  // diameter
  const rowDiameter = document.createElement("div");
  rowDiameter.classList.add("inline-row");
  rowDiameter.innerHTML = `
        <label for="diameter-${code}">Size (Diameter m"m):</label>
        <input type="number" id="diameter-${code}" placeholder="e.g.5.5" />
      `;
  block.appendChild(rowDiameter);

  // "Container Ready" Button
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

  // Gather container data
  const itemVal = block.querySelector(`#item-${code}`).value.trim();
  const kgVal = parseFloat(block.querySelector(`#kg-${code}`).value);
  const timeVal = block.querySelector(`#harvested-${code}`).value;
  const brixVal = parseFloat(block.querySelector(`#brix-${code}`).value);
  const acidityVal = block.querySelector(`#acidity-${code}`).value;
  const sizeVal = block.querySelector(`#size-${code}`).value;

  // Validate fields
  if (
    !itemVal ||
    isNaN(kgVal) ||
    !timeVal ||
    isNaN(brixVal) ||
    !acidityVal ||
    !sizeVal
  ) {
    alert(
      "Please fill in Item, Weight, Time Harvested, Brix, Acidity, and Size before marking this container as ready."
    );
    return;
  }

  // Store this container's data for later submission
  readyContainersData.push({
    code,
    item: itemVal,
    weightKg: kgVal,
    harvestedTime: timeVal,
    brix: brixVal,
    acidity: acidityVal,
    size: sizeVal,
  });

  // Increase sumReadyWeight by this container's weight
  sumReadyWeight += kgVal;

  // Remove this container block from the DOM
  block.remove();
  completedContainersCount++;

  // Add to completed containers list
  const completedList = document.getElementById("completedContainersList");
  const li = document.createElement("li");
  li.textContent = `Container ${code}`;
  const viewBtn = document.createElement("button");
  viewBtn.textContent = "View Details";
  viewBtn.classList.add("btn-primary");
  viewBtn.addEventListener("click", () => {
    const containerData = {
      code,
      item: itemVal,
      weightKg: kgVal,
      harvestedTime: timeVal,
      brix: brixVal,
      acidity: acidityVal,
      size: sizeVal,
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
  const totalShipmentKg = shipment.amount || 0;
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
    const totalShipmentKg = shipment.amount || 0;
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
      // All filled: send readyContainersData + timestamp to backend
      const payload = {
        containers: readyContainersData,
        readyTimestamp: new Date().toISOString(),
      };

      // Use the global shipmentId if shipment.id is not available
      const finalShipmentId = shipment.id || shipmentId;

      await submitShipmentReport(finalShipmentId, payload);

      showToast("Shipment marked ready for pickup successfully!", "success");
      reportBtn.style.display = "none";

      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = "f_dashboard.html";
      }, 2000);
    } catch (error) {
      console.error("Failed to submit shipment report:", error);
      showToast("Failed to submit report. Please try again.", "error");
      reportBtn.style.display = "inline-block";
    } finally {
      // Restore button
      readyBtn.textContent = originalText;
      readyBtn.disabled = false;
    }
  });

// ===== "Report a Problem" Button Handler =====
document.getElementById("reportProblemBtn").addEventListener("click", () => {
  // In a real app, redirect to problem-report form or open modal
  alert("Redirecting to problem report form...");
  // Example: window.location.href = `/report-problem?shipmentId=${shipmentId}`;
});

// ===== Logout Link =====
document.getElementById("logoutLink4").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Logging out... (placeholder)");
  // BACKEND: POST /api/logout → window.location.href = '/login.html';
});

// ===== Initialize when page loads =====
document.addEventListener("DOMContentLoaded", async () => {
  await initializeShipmentReport();
  console.log("Shipment report page initialized with API integration");
});
