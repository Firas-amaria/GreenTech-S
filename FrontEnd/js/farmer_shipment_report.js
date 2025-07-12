/*******************************************************
 * 🔌 API INTEGRATED SHIPMENT REPORT
 *******************************************************/

// API Configuration
const API_BASE_URL = "http://localhost:4000/api/farmer";

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem("token") || null;
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
    // Load all shipments from API and find the specific one
    const allShipmentsData = await apiCall("/shipments");
    
    // Find the specific shipment by ID
    const shipments = allShipmentsData.shipments || allShipmentsData || [];
    
    const shipmentData = shipments.find(s => String(s.id) === String(shipmentId));
    
    if (shipmentData) {
      return shipmentData;
    } else {
      throw new Error(`Shipment with ID ${shipmentId} not found`);
    }
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
    // Add status update to the payload, ensuring QR code is preserved
    const updatedPayload = {
      ...payload,
      status: "shipment_ready",
      qrcode: payload.qrcode // Explicitly ensure shipment QR code is included
    };
    
    return await apiCall(`/shipments/${shipmentId}/report-complete`, {
      method: "POST",
      body: JSON.stringify(updatedPayload),
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
    if (!shipmentId) {
      throw new Error("No shipment ID provided in URL");
    }

    // Load shipment data
    shipment = await loadShipmentData(shipmentId);

    if (!shipment || Object.keys(shipment).length === 0) {
      throw new Error("No shipment data found");
    }

    // Load quality standards for this item
    if (shipment.items && Array.isArray(shipment.items) && shipment.items.length > 0) {
      // Use the first item for quality standards (or you could load for all items)
      const firstItem = shipment.items[0];
      qualityStandards = await loadQualityStandards(
        firstItem.itemId || firstItem.name
      );
    } else if (shipment.item) {
      // Fallback for legacy format
      qualityStandards = await loadQualityStandards(
        shipment.itemId || shipment.item
      );
    }

    // Populate UI
    populateShipmentDetails();

  } catch (error) {
    console.error("Failed to initialize shipment report:", error);
    showToast("Failed to load shipment data", "error");
  }
}

// ===== Populate Shipment Details at Top =====
function populateShipmentDetails() {
  // Populate Shipment ID
  const spanShipmentId = document.getElementById("spanShipmentId");
  if (spanShipmentId) {
    spanShipmentId.textContent = shipment.id || "N/A";
  }
  
  // Populate Items - combine all items from the items array
  let itemsText = "N/A";
  if (shipment.items && Array.isArray(shipment.items) && shipment.items.length > 0) {
    itemsText = shipment.items
      .map(item => `${item.name} (${item.quantity} ${item.unit || 'units'})`)
      .join(", ");
  } else if (shipment.item) {
    // Fallback for legacy format
    itemsText = shipment.item;
  }
  const spanItem = document.getElementById("spanItem");
  if (spanItem) {
    spanItem.textContent = itemsText;
  }
  
  // Populate Amount - use totalWeight from farmer shipments or amount from legacy format
  let amountText = "N/A";
  if (shipment.totalWeight != null) {
    amountText = `${shipment.totalWeight} kg`;
  } else if (shipment.amount != null) {
    amountText = `${shipment.amount} kg`;
  }
  const spanAmount = document.getElementById("spanAmount");
  if (spanAmount) {
    spanAmount.textContent = amountText;
  }
  
  // Populate Pickup Time
  const spanPickupTime = document.getElementById("spanPickupTime");
  if (spanPickupTime) {
    spanPickupTime.textContent = shipment.pickupTime
      ? new Date(shipment.pickupTime).toLocaleString()
      : "N/A";
  }
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

// =================================================================
// 🔌 QR CODE GENERATION FUNCTIONS
// =================================================================

/**
 * Generate QR code as base64 data URL
 * @param {string} text - Text to encode in QR code
 * @returns {Promise<string>} - Base64 data URL of QR code
 */
async function generateQRCode(text) {
  try {
    // Generate QR code as data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// =================================================================

// ===== Globals =====
let containerCountGlobal = 0; // number of containers generated
let completedContainersCount = 0; // how many have been marked ready
let sumReadyWeight = 0; // sum of weights for containers already marked ready

// Array to store data of each container when marked ready
const readyContainersData = [];

// ===== Generate Container Blocks =====
const btnGenerateContainers = document.getElementById("btnGenerateContainers");
if (btnGenerateContainers) {
  btnGenerateContainers.addEventListener("click", () => {
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
}

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
        <select id="acidity-${code}">
          <option value="" disabled selected>Choose Acidity</option>
          <option value="Balanced">Balanced (מאוזנת)</option>
          <option value="Slight">Slight (חמוץ/תפל)</option>
          <option value="Very Sour">Very Sour (חמוץ מאוד)</option>
        </select>
      `;
  block.appendChild(rowAcidity);

  // Size (dropdown)
  const rowSize = document.createElement("div");
  rowSize.classList.add("inline-row");
  rowSize.innerHTML = `
        <label for="size-${code}">Size (גודל):</label>
        <select id="size-${code}">
          <option value="" disabled selected>Choose Size</option>
          <option value="Medium">Medium</option>
          <option value="Small or Too Large">Small or Too Large</option>
          <option value="Inconsistent/Abnormal">Inconsistent/Abnormal</option>
        </select>
      `;
  block.appendChild(rowSize);

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
  const totalShipmentKg = shipment.totalWeight || shipment.amount || 0;
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
const btnAddContainer = document.getElementById("btnAddContainer");
if (btnAddContainer) {
  btnAddContainer.addEventListener("click", () => {
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
}

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
const btnReadyPickup = document.getElementById("btnReadyPickup");
if (btnReadyPickup) {
  btnReadyPickup.addEventListener("click", async () => {
    const totalShipmentKg = shipment.totalWeight || shipment.amount || 0;
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
      // Use the global shipmentId if shipment.id is not available
      const finalShipmentId = shipment.id || shipmentId;
      
      // Generate QR codes for shipment and containers
      readyBtn.textContent = "Generating QR Codes...";
      
      // Generate shipment QR code
      const shipmentQRCode = await generateQRCode(finalShipmentId);
      
      // Generate QR codes for each container
      const containersWithQR = await Promise.all(
        readyContainersData.map(async (container) => {
          const containerQRCode = await generateQRCode(container.code);
          return {
            ...container,
            qrcode: containerQRCode
          };
        })
      );

      // All filled: send readyContainersData + timestamp + QR codes to backend
      const payload = {
        containers: containersWithQR,
        readyTimestamp: new Date().toISOString(),
        qrcode: shipmentQRCode,
      };

      // Try to submit via API
      readyBtn.textContent = "Submitting...";
      
      await submitShipmentReport(finalShipmentId, payload);

      showToast(
        `Shipment marked ready for pickup successfully! Generated ${containersWithQR.length + 1} QR codes.`, 
        "success"
      );
      reportBtn.style.display = "none";

      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = "f_dashboard.html";
      }, 2000);
    } catch (error) {
      console.error("Failed to submit shipment report:", error);
      
      // Check if error is related to QR code generation
      if (error.message && error.message.includes('QR')) {
        showToast("Failed to generate QR codes. Please try again.", "error");
      } else {
        showToast("Failed to submit report. Please try again.", "error");
      }
      
      reportBtn.style.display = "inline-block";
    } finally {
      // Restore button
      readyBtn.textContent = originalText;
      readyBtn.disabled = false;
    }
  });
}

// ===== "Report a Problem" Button Handler =====
const reportProblemBtn = document.getElementById("reportProblemBtn");
if (reportProblemBtn) {
  reportProblemBtn.addEventListener("click", () => {
    // In a real app, redirect to problem-report form or open modal
    alert("Redirecting to problem report form...");
    // Example: window.location.href = `/report-problem?shipmentId=${shipmentId}`;
  });
}

// ===== Logout Link =====
const logoutLink = document.getElementById("logoutLink4");
if (logoutLink) {
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Logging out... (placeholder)");
    // BACKEND: POST /api/logout → window.location.href = '/login.html';
  });
}

// ===== Initialize when page loads =====
document.addEventListener("DOMContentLoaded", async () => {
  await initializeShipmentReport();
});
