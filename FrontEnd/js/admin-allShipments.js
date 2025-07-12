import { getCurrentUserToken } from "../js/firebase-init.js";

async function fetchShipments() {
  const token = await getCurrentUserToken();
  const response = await fetch("http://localhost:4000/api/admin/getShipments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch Shipments");
  return await response.json();
}

let Shipments = [];

// The six fixed stages—in this order
const allStagesOrder = [
  { key: "at-farm", label: "At Farm" },
  { key: "ready-for-pickup", label: "Ready for Pickup" },
  { key: "in-transit", label: "In Transit" },
  { key: "arrived", label: "Arrived" },
  { key: "sorting", label: "Sorting" },
  { key: "warehouse", label: "Warehouse" },
];

// Helper: map stages array to { key: { timestamp, status } }
function buildStageMap(stagesArr) {
  const map = {};
  stagesArr.forEach((s) => {
    map[s.key] = { timestamp: s.timestamp, status: s.status };
  });
  return map;
}

// Helper: format ISO timestamp → "YYYY-MM-DD hh:mm"
function formatTimestamp(input) {
  let date;

  if (!input) return "";

  // If it's Firestore Timestamp object
  if (typeof input === "object" && "_seconds" in input) {
    date = new Date(input._seconds * 1000);
  }
  // If it's already a Date or string
  else {
    date = new Date(input);
  }

  if (isNaN(date)) return "Invalid Date";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Render a single shipment card (header + timeline + hidden fullReport section)
function renderShipmentCard(shipment) {
  const hasProblem = shipment.stages.some((s) => s.status === "problem");
  const stageMap = buildStageMap(shipment.stages);

  // Outer card container
  const card = document.createElement("div");
  card.classList.add("shipment-card");
  if (hasProblem) card.classList.add("problem-flag");

  // --- Header (ID, origin/dest, driver info, Full Report button) ---
  const headerRow = document.createElement("div");
  headerRow.classList.add("shipment-header");

  const infoDiv = document.createElement("div");
  infoDiv.classList.add("shipment-info");
  infoDiv.innerHTML = `
    <strong>ID:</strong> ${shipment.id} &nbsp;|&nbsp;
    <strong>Origin:</strong> ${shipment.origin} &nbsp;|&nbsp;
    <strong>Destination:</strong> ${shipment.destination}
  `;

  const reportBtn = document.createElement("button");
  reportBtn.classList.add("full-report-btn");
  reportBtn.textContent = "Full Report";
  reportBtn.dataset.shipmentId = shipment.id;

  headerRow.appendChild(infoDiv);
  headerRow.appendChild(reportBtn);
  card.appendChild(headerRow);

  // --- Timeline Row ---
  const timelineRow = document.createElement("div");
  timelineRow.classList.add("shipment-timeline");

  allStagesOrder.forEach((stageDef) => {
    const key = stageDef.key;
    const reached = !!stageMap[key];
    let statusClass = "upcoming";
    let tsText = "";

    if (reached) {
      const { timestamp, status } = stageMap[key];
      tsText = formatTimestamp(timestamp);

      if (status === "problem") {
        statusClass = "problem";
      } else if (status === "current") {
        statusClass = "current";
      } else if (status === "ok") {
        statusClass = "completed";
      }
    }

    const stageDiv = document.createElement("div");
    stageDiv.classList.add("stage", statusClass);

    const dot = document.createElement("div");
    dot.classList.add("stage-dot");

    const labelDiv = document.createElement("div");
    labelDiv.classList.add("stage-label");
    labelDiv.textContent = stageDef.label;

    const tsDiv = document.createElement("div");
    tsDiv.classList.add("stage-timestamp");
    tsDiv.textContent = tsText;

    stageDiv.appendChild(dot);
    stageDiv.appendChild(labelDiv);
    stageDiv.appendChild(tsDiv);
    timelineRow.appendChild(stageDiv);
  });

  card.appendChild(timelineRow);

  // --- Full Report (initially hidden) ---
  const fullReportDiv = document.createElement("div");
  fullReportDiv.classList.add("full-report");
  fullReportDiv.style.display = "none"; // hidden by default

  // Build inner HTML for full report
  const fr = shipment.fullReport;
  let frHtml = `
    <h3>Full Report for ${fr.shipmentId}</h3>
    <table class="report-table">
      <tr><td><strong>Status:</strong></td><td>${fr.status}</td></tr>
      <tr><td><strong>Farmer ID:</strong></td><td>${fr.farmerId}</td></tr>
      <tr><td><strong>Amount:</strong></td><td>${fr.amount}</td></tr>
      <tr><td><strong>Pickup Time:</strong></td><td>${formatTimestamp(
        fr.pickupTime
      )}</td></tr>
      <tr><td><strong>Driver:</strong></td><td>${fr.driver.name} / ${
    fr.driver.phone
  }</td></tr>
      <tr><td><strong>Current Shipment Status:</strong></td><td>${
        fr.shipmentStatus
      }</td></tr>
    </table>

  <h4 style="display: inline-block;">Farmer Reports (per container)</h4>
  <button class="order-report-btn" style="margin-left: 10px; font-size: 14px;">Order Report</button>

    <table class="report-table">
      <thead>
        <tr>
          <th>Container ID</th>
        </tr>
      </thead>
      <tbody>
      
  `;

  if (
    Array.isArray(fr.farmerReports) &&
    fr.farmerReports.length > 0 &&
    Array.isArray(fr.farmerReports[0].containers)
  ) {
    fr.farmerReports[0].containers.forEach((c) => {
      frHtml += `
      <tr>
        <td><a href="#">${c.code}</a></td>
      </tr>
    `;
    });
  } else {
    frHtml += `
    <tr>
      <td colspan="1">No container data available</td>
    </tr>
  `;
  }

  frHtml += `</tbody>
    </table>`;

  if (fr.logisticsResults && Object.keys(fr.logisticsResults).length > 0) {
    frHtml += `
      

    <h4>Logistics Center Results</h4>
    <table class="report-table">
      <tr><td><strong>Grade A (kgs):</strong></td><td>${
        fr.logisticsResults?.stats.gradeA
      }</td></tr>
      <tr><td><strong>Grade B (kgs):</strong></td><td>${
        fr.logisticsResults?.stats.gradeB
      }</td></tr>
      <tr><td><strong>Grade C (kgs):</strong></td><td>${
        fr.logisticsResults?.stats.gradeC
      }</td></tr>
      <tr><td><strong>Rejection %:</strong></td><td>${
        fr.logisticsResults?.stats.rejectionPercent
      }</td></tr>
    </table>

    <h5>New Barcodes by Grade</h5>
    <ul>
      <li><strong>Grade A:</strong> ${fr.logisticsResults.newBarcodes.gradeA.join(
        ", "
      )}</li>
      <li><strong>Grade B:</strong> ${fr.logisticsResults.newBarcodes.gradeB.join(
        ", "
      )}</li>
      <li><strong>Grade C:</strong> ${fr.logisticsResults.newBarcodes.gradeC.join(
        ", "
      )}</li>
    </ul>

    <h5>End-of-Day Statistics</h5>
    <ul>
      <li><strong>Sold (kgs):</strong> ${fr.logisticsResults.endOfDay.sold}</li>
      <li><strong>Left (kgs):</strong> ${fr.logisticsResults.endOfDay.left}</li>
    </ul>

    <h4>Warehouse Placements</h4>
    <table class="report-table">
      <thead>
        <tr>
          <th>Barcode</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
  `;
  }

  fr.warehousePlacement.forEach((wp) => {
    frHtml += `
      <tr>
        <td>${wp.barcode}</td>
        <td>${wp.location}</td>
      </tr>
    `;
  });

  frHtml += `
      </tbody>
    </table>

    <h4>History / Audit Trail</h4>
    <table class="report-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  fr.history.forEach((h) => {
    frHtml += `
      <tr>
        <td>${formatTimestamp(h.timestamp)}</td>
        <td>${h.user}</td>
        <td>${h.action}</td>
      </tr>
    `;
  });

  frHtml += `
      </tbody>
    </table>
  `;

  fullReportDiv.innerHTML = frHtml;
  card.appendChild(fullReportDiv);

  const orderReportBtn = fullReportDiv.querySelector(".order-report-btn");
  if (orderReportBtn) {
    orderReportBtn.addEventListener("click", () => {
      alert("Order report button clicked!");
    });
  }
  // --- Event Listener: toggle Full Report ---
  reportBtn.addEventListener("click", () => {
    const isVisible = fullReportDiv.style.display === "block";
    fullReportDiv.style.display = isVisible ? "none" : "block";
    reportBtn.textContent = isVisible ? "Full Report" : "Hide Report";

    // If you want to fetch real data instead of using mock:
    // if (!isVisible) {
    //   fetch(`/api/admin/shipments/${shipment.id}/full-report`)
    //     .then((res) => res.json())
    //     .then((data) => {
    //       // Replace fullReportDiv.innerHTML with rendered “data”
    //       // e.g. fullReportDiv.innerHTML = renderFullReportHTML(data);
    //     })
    //     .catch((err) => console.error(err));
    // }
  });

  return card;
}

// Populate all shipments into #shipments-list
function populateShipmentsList(shipmentsData) {
  const container = document.getElementById("shipments-list");
  container.innerHTML = ""; // clear existing

  // Problems first
  const problemsFirst = [
    ...shipmentsData.filter((s) =>
      s.stages.some((x) => x.status === "problem")
    ),
    ...shipmentsData.filter(
      (s) => !s.stages.some((x) => x.status === "problem")
    ),
  ];

  problemsFirst.forEach((sh) => {
    const cardEl = renderShipmentCard(sh);
    container.appendChild(cardEl);
  });
}

// (Optional) Filter logic
function applyFilterLogic() {
  const searchTerm = document
    .getElementById("search-shipment")
    .value.trim()
    .toLowerCase();
  const stageFilter = document.getElementById("filter-stage").value;

  let filtered = mockShipments.slice();
  if (searchTerm) {
    filtered = filtered.filter((sh) => {
      return (
        sh.id.toLowerCase().includes(searchTerm) ||
        sh.origin.toLowerCase().includes(searchTerm) ||
        sh.destination.toLowerCase().includes(searchTerm)
      );
    });
  }
  if (stageFilter) {
    filtered = filtered.filter((sh) => {
      return sh.stages.some((st) => st.key === stageFilter);
    });
  }
  populateShipmentsList(filtered);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Real API call (commented out):
  Shipments = await fetchShipments();
  // Use mock data by default:
  populateShipmentsList(Shipments);

  // Wire up filter button
  document
    .getElementById("apply-filters")
    .addEventListener("click", applyFilterLogic);
});

// Add alert behavior to "Order Report" button

function calculateStageTimings(shiftStartStr) {
  const allStagesOrder = [
    { key: "at-farm", durationMin: 90 }, // 1h30m
    { key: "ready-for-pickup", durationMin: 1 }, // 1m
    { key: "in-transit", durationMin: 60 }, // 1h
    { key: "arrived", durationMin: 15 }, // 15m
    { key: "sorting", durationMin: 60 }, // 1h
    { key: "warehouse", durationMin: 0 }, // just arrival
  ];

  const result = [];

  let currentTime = parseTime(shiftStartStr); // e.g. 08:00 => Date object today
  for (let i = 0; i < allStagesOrder.length; i++) {
    const stage = allStagesOrder[i];

    // start time
    let startTime = new Date(currentTime);

    // duration
    let endTime = new Date(startTime.getTime() + stage.durationMin * 60000);

    result.push({
      key: stage.key,
      start: formatTime(startTime),
      end: stage.durationMin > 0 ? formatTime(endTime) : formatTime(startTime),
      durationMin: stage.durationMin,
    });

    // if current stage is "in-transit", which starts same time as ready-for-pickup,
    // we don't shift currentTime forward yet.
    if (stage.key === "ready-for-pickup") continue;

    // if current stage is in-transit (starts at same time as ready-for-pickup), we also need to wait.
    if (stage.key === "in-transit") {
      endTime = new Date(startTime.getTime() + stage.durationMin * 60000);
    }

    // move current time forward
    currentTime = new Date(endTime);
  }

  return result;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}
