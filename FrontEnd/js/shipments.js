// ==========================================
// js/shipments.js
// ==========================================

// ***** MOCK DATA *****
// Now includes a fullReport object per shipment, with all requested fields.
const mockShipments = [
  {
    id: "SH-1001",
    origin: "Farm A",
    destination: "Warehouse B",
    stages: [
      {
        key: "at-farm",
        label: "At Farm",
        timestamp: "2025-06-01T08:00:00Z",
        status: "ok",
      },
      {
        key: "ready-for-pickup",
        label: "Ready for Pickup",
        timestamp: "2025-06-01T10:00:00Z",
        status: "ok",
      },
      {
        key: "in-transit",
        label: "In Transit",
        timestamp: "2025-06-01T12:00:00Z",
        status: "problem", // PROBLEM flag here
      },
      // Later stages not reached yet; will render as “upcoming.”
    ],
    fullReport: {
      shipmentId: "SH-1001",
      status: "Approved",
      farmerId: "FARMER-55",
      amount: "2000 kg",
      pickupTime: "2025-06-01T10:00:00Z",
      driver: {
        name: "John Doe",
        phone: "+972-52-1234567",
      },
      shipmentStatus: "In Transit (problem at In-Transit stage)",
      farmerReports: [
        {
          containerId: "C-5001",
          qualityStandards: {
            brix: 22,
            acidity: "balanced",
            size: "medium",
          },
          pickedTime: "2025-06-01T08:05:00Z",
        },
        {
          containerId: "C-5002",
          qualityStandards: {
            brix: 21,
            acidity: "slight",
            size: "small",
          },
          pickedTime: "2025-06-01T08:10:00Z",
        },
        // …more containers
      ],
      logisticsResults: {
        stats: {
          gradeA: 1500, // kilos
          gradeB: 400,
          gradeC: 50,
          rejectionPercent: "5%",
        },
        newBarcodes: {
          gradeA: ["BAR-A-1001", "BAR-A-1002", /* … */],
          gradeB: ["BAR-B-2001", /* … */],
          gradeC: ["BAR-C-3001", /* … */],
        },
        endOfDay: {
          sold: 1900, // kilos
          left: 100, // kilos
        },
      },
      warehousePlacement: [
        {
          barcode: "BAR-A-1001",
          location: "Shelf 1A",
        },
        {
          barcode: "BAR-B-2001",
          location: "Shelf 2C",
        },
        // …more placements
      ],
      history: [
        {
          timestamp: "2025-06-01T08:00:00Z",
          user: "farmer_manager",
          action: "Posted shipment request",
        },
        {
          timestamp: "2025-06-01T10:00:00Z",
          user: "system",
          action: "Shipment approved",
        },
        {
          timestamp: "2025-06-01T12:00:00Z",
          user: "transporter_system",
          action: "Driver John Doe accepted",
        },
        {
          timestamp: "2025-06-01T12:30:00Z",
          user: "qc_supervisor",
          action: "Detected problem in transit (delayed)",
        },
        // …further history entries
      ],
    },
  },
  {
    id: "SH-1002",
    origin: "Farm C",
    destination: "Warehouse B",
    stages: [
      {
        key: "at-farm",
        label: "At Farm",
        timestamp: "2025-06-01T07:30:00Z",
        status: "ok",
      },
      {
        key: "ready-for-pickup",
        label: "Ready for Pickup",
        timestamp: "2025-06-01T09:00:00Z",
        status: "ok",
      },
      {
        key: "in-transit",
        label: "In Transit",
        timestamp: "2025-06-01T11:00:00Z",
        status: "ok",
      },
      {
        key: "arrived",
        label: "Arrived",
        timestamp: "2025-06-01T16:00:00Z",
        status: "current", // CURRENT stage
      },
      // “sorting” and “warehouse” auto‐render as “upcoming.”
    ],
    fullReport: {
      shipmentId: "SH-1002",
      status: "Approved",
      farmerId: "FARMER-73",
      amount: "1500 kg",
      pickupTime: "2025-06-01T09:00:00Z",
      driver: {
        name: "Alice Smith",
        phone: "+972-50-7654321",
      },
      shipmentStatus: "Arrived",
      farmerReports: [
        {
          containerId: "C-6001",
          qualityStandards: {
            brix: 23,
            acidity: "balanced",
            size: "medium",
          },
          pickedTime: "2025-06-01T07:35:00Z",
        },
        {
          containerId: "C-6002",
          qualityStandards: {
            brix: 22,
            acidity: "very sour",
            size: "small",
          },
          pickedTime: "2025-06-01T07:40:00Z",
        },
      ],
      logisticsResults: {
        stats: {
          gradeA: 1200,
          gradeB: 250,
          gradeC: 30,
          rejectionPercent: "3%",
        },
        newBarcodes: {
          gradeA: ["BAR-A-1101", "BAR-A-1102", /* … */],
          gradeB: ["BAR-B-2101", /* … */],
          gradeC: ["BAR-C-3101", /* … */],
        },
        endOfDay: {
          sold: 1400,
          left: 100,
        },
      },
      warehousePlacement: [
        {
          barcode: "BAR-A-1101",
          location: "Shelf 3B",
        },
        {
          barcode: "BAR-B-2101",
          location: "Shelf 4A",
        },
      ],
      history: [
        {
          timestamp: "2025-06-01T07:30:00Z",
          user: "farmer_manager",
          action: "Posted shipment request",
        },
        {
          timestamp: "2025-06-01T09:00:00Z",
          user: "system",
          action: "Shipment approved",
        },
        {
          timestamp: "2025-06-01T11:00:00Z",
          user: "driver_AliceSmith",
          action: "Delivered to Warehouse B",
        },
      ],
    },
  },
  {
    id: "SH-1003",
    origin: "Farm B",
    destination: "Warehouse A",
    stages: [
      {
        key: "at-farm",
        label: "At Farm",
        timestamp: "2025-06-01T06:45:00Z",
        status: "ok",
      },
      {
        key: "ready-for-pickup",
        label: "Ready for Pickup",
        timestamp: "2025-06-01T08:30:00Z",
        status: "ok",
      },
      {
        key: "in-transit",
        label: "In Transit",
        timestamp: "2025-06-01T10:00:00Z",
        status: "ok",
      },
      {
        key: "arrived",
        label: "Arrived",
        timestamp: "2025-06-01T14:00:00Z",
        status: "ok",
      },
      {
        key: "sorting",
        label: "Sorting",
        timestamp: "2025-06-01T17:00:00Z",
        status: "ok",
      },
      {
        key: "warehouse",
        label: "Warehouse",
        timestamp: "2025-06-01T19:30:00Z",
        status: "current", // Already at final stage
      },
    ],
    fullReport: {
      shipmentId: "SH-1003",
      status: "Approved",
      farmerId: "FARMER-21",
      amount: "1800 kg",
      pickupTime: "2025-06-01T08:30:00Z",
      driver: {
        name: "Michael Cohen",
        phone: "+972-54-8765432",
      },
      shipmentStatus: "Warehouse",
      farmerReports: [
        {
          containerId: "C-7001",
          qualityStandards: {
            brix: 24,
            acidity: "balanced",
            size: "medium",
          },
          pickedTime: "2025-06-01T06:50:00Z",
        },
        {
          containerId: "C-7002",
          qualityStandards: {
            brix: 23,
            acidity: "slight",
            size: "medium",
          },
          pickedTime: "2025-06-01T06:55:00Z",
        },
      ],
      logisticsResults: {
        stats: {
          gradeA: 1600,
          gradeB: 150,
          gradeC: 50,
          rejectionPercent: "2.8%",
        },
        newBarcodes: {
          gradeA: ["BAR-A-1201", "BAR-A-1202", /* … */],
          gradeB: ["BAR-B-2201", /* … */],
          gradeC: ["BAR-C-3201", /* … */],
        },
        endOfDay: {
          sold: 1700,
          left: 100,
        },
      },
      warehousePlacement: [
        {
          barcode: "BAR-A-1201",
          location: "Shelf 5A",
        },
        {
          barcode: "BAR-B-2201",
          location: "Shelf 6C",
        },
      ],
      history: [
        {
          timestamp: "2025-06-01T06:45:00Z",
          user: "farmer_manager",
          action: "Posted shipment request",
        },
        {
          timestamp: "2025-06-01T08:30:00Z",
          user: "system",
          action: "Shipment approved",
        },
        {
          timestamp: "2025-06-01T10:00:00Z",
          user: "driver_MichaelCohen",
          action: "Delivered to Warehouse A",
        },
      ],
    },
  },
];

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
function formatTimestamp(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
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
      <tr><td><strong>Pickup Time:</strong></td><td>${formatTimestamp(fr.pickupTime)}</td></tr>
      <tr><td><strong>Driver:</strong></td><td>${fr.driver.name} / ${fr.driver.phone}</td></tr>
      <tr><td><strong>Current Shipment Status:</strong></td><td>${fr.shipmentStatus}</td></tr>
    </table>

    <h4>Farmer Reports (per container)</h4>
    <table class="report-table">
      <thead>
        <tr>
          <th>Container ID</th>
          <th>Brix</th>
          <th>Acidity</th>
          <th>Size</th>
          <th>Picked Time</th>
        </tr>
      </thead>
      <tbody>
  `;

  fr.farmerReports.forEach((c) => {
    frHtml += `
      <tr>
        <td>${c.containerId}</td>
        <td>${c.qualityStandards.brix}</td>
        <td>${c.qualityStandards.acidity}</td>
        <td>${c.qualityStandards.size}</td>
        <td>${formatTimestamp(c.pickedTime)}</td>
      </tr>
    `;
  });

  frHtml += `
      </tbody>
    </table>

    <h4>Logistics Center Results</h4>
    <table class="report-table">
      <tr><td><strong>Grade A (kgs):</strong></td><td>${fr.logisticsResults.stats.gradeA}</td></tr>
      <tr><td><strong>Grade B (kgs):</strong></td><td>${fr.logisticsResults.stats.gradeB}</td></tr>
      <tr><td><strong>Grade C (kgs):</strong></td><td>${fr.logisticsResults.stats.gradeC}</td></tr>
      <tr><td><strong>Rejection %:</strong></td><td>${fr.logisticsResults.stats.rejectionPercent}</td></tr>
    </table>

    <h5>New Barcodes by Grade</h5>
    <ul>
      <li><strong>Grade A:</strong> ${fr.logisticsResults.newBarcodes.gradeA.join(", ")}</li>
      <li><strong>Grade B:</strong> ${fr.logisticsResults.newBarcodes.gradeB.join(", ")}</li>
      <li><strong>Grade C:</strong> ${fr.logisticsResults.newBarcodes.gradeC.join(", ")}</li>
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
    ...shipmentsData.filter((s) => s.stages.some((x) => x.status === "problem")),
    ...shipmentsData.filter((s) => !s.stages.some((x) => x.status === "problem")),
  ];

  problemsFirst.forEach((sh) => {
    const cardEl = renderShipmentCard(sh);
    container.appendChild(cardEl);
  });
}

// (Optional) Filter logic
function applyFilterLogic() {
  const searchTerm = document.getElementById("search-shipment").value.trim().toLowerCase();
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

document.addEventListener("DOMContentLoaded", () => {
  // Real API call (commented out):
  // fetch("/api/admin/shipments")
  //   .then((res) => res.json())
  //   .then((data) => populateShipmentsList(data))
  //   .catch((err) => console.error(err));

  // Use mock data by default:
  populateShipmentsList(mockShipments);

  // Wire up filter button
  document.getElementById("apply-filters").addEventListener("click", applyFilterLogic);
});
