// Configuration
const API_BASE_URL = "http://localhost:4000/api";
let currentUser = null;
let userRole = null;
let currentTab = "overview";

// State management
const dashboardState = {
  drivers: [],
  shipments: [],
  problems: [],
  schedules: [],
  recentShipments: [], // For overview recent activity
  metrics: {
    activeDrivers: 0,
    activeShipments: 0,
    pendingAssignments: 0,
    problemReports: 0,
  },
  filteredData: {
    drivers: [],
    shipments: [],
    problems: [],
    schedules: [],
  },
};

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  await initializeAuth();
  setupEventListeners();
  showTab("overview");

  // Start real-time updates
  startRealTimeUpdates();
});

// Authentication
async function initializeAuth() {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  if (!token || !userData) {
    console.log("No auth found, redirecting to login");
    window.location.href = "index.html";
    return;
  }

  try {
    currentUser = JSON.parse(userData);
    userRole = currentUser.role;

    console.log("Current user data:", currentUser);

    // Update UI with user info
    const displayName =
      currentUser.firstName && currentUser.lastName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.name || "Manager";

    document.getElementById("user-name").textContent = displayName;
    document.getElementById("user-role").textContent = userRole;
  } catch (error) {
    console.error("Auth initialization error:", error);
    logout();
  }
}

// API Helper
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    showLoading(true);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    showMessage(error.message, "error");
    throw error;
  } finally {
    showLoading(false);
  }
}

// Tab Management
function showTab(tabName) {
  // Hide all tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Remove active class from all tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show selected tab content
  const targetSection = document.getElementById(`${tabName}-section`);
  if (targetSection) {
    targetSection.classList.add("active");
  } else {
    console.error(`Tab section not found: ${tabName}-section`);
    return;
  }

  // Find and activate the correct tab button
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    }
  });

  currentTab = tabName;

  // Load data for the selected tab
  loadTabData(tabName);
}

// Load data for specific tab
async function loadTabData(tabName) {
  try {
    switch (tabName) {
      case "overview":
        await loadOverviewData();
        break;
      case "drivers":
        await loadDriversData();
        break;
      case "shipments":
        await loadShipmentsData();
        break;
      case "problems":
        await loadProblemsData();
        break;
      case "schedule":
        await loadScheduleData();
        break;
    }
  } catch (error) {
    console.error(`Error loading ${tabName} data:`, error);
    showMessage(`Failed to load ${tabName} data`, "error");
  }
}

// Overview Data Loading
async function loadOverviewData() {
  try {
    // Load overview data from API
    const response = await apiCall("/manager/overview");

    if (response.success) {
      // Update metrics from backend
      dashboardState.metrics = {
        activeDrivers: response.overview.activeDrivers || 0,
        activeShipments: response.overview.totalShipments || 0,
        pendingAssignments:
          response.overview.shipmentStatusBreakdown?.pending || 0,
        problemReports: response.overview.totalProblems || 0,
      };

      // Store recent shipments and problems for activity rendering
      dashboardState.recentShipments = response.overview.recentShipments || [];

      // Load problems for recent activity
      await loadProblemsData();
    } else {
      // Fallback: Load all data for metrics calculation
      await Promise.all([
        loadDriversData(),
        loadShipmentsData(),
        loadProblemsData(),
      ]);
      calculateMetrics();
    }

    renderMetrics();
    renderRecentActivity();
  } catch (error) {
    console.error("Error loading overview data:", error);
    // Fallback: Load all data for metrics calculation
    await Promise.all([
      loadDriversData(),
      loadShipmentsData(),
      loadProblemsData(),
    ]);
    calculateMetrics();
    renderMetrics();
    renderRecentActivity();
  }
}

function calculateMetrics() {
  // Active drivers (available or busy)
  dashboardState.metrics.activeDrivers = dashboardState.drivers.filter(
    (driver) => driver.status === "available" || driver.status === "busy"
  ).length;

  // Active shipments (not pending or arrived)
  dashboardState.metrics.activeShipments = dashboardState.shipments.filter(
    (shipment) => {
      const status = getShipmentStatus(shipment);
      return status !== "pending" && status !== "arrived";
    }
  ).length;

  // Pending assignments (shipments without drivers)
  dashboardState.metrics.pendingAssignments = dashboardState.shipments.filter(
    (shipment) => !shipment.driver
  ).length;

  // Problem reports
  dashboardState.metrics.problemReports = dashboardState.problems.length;
}

function renderMetrics() {
  document.getElementById("metric-drivers").textContent =
    dashboardState.metrics.activeDrivers;
  document.getElementById("metric-shipments").textContent =
    dashboardState.metrics.activeShipments;
  document.getElementById("metric-pending").textContent =
    dashboardState.metrics.pendingAssignments;
  document.getElementById("metric-problems").textContent =
    dashboardState.metrics.problemReports;
}

function renderRecentActivity() {
  const container = document.getElementById("recent-activity");

  // Use recentShipments from overview API or fallback to local data
  let recentShipments = [];
  if (
    dashboardState.recentShipments &&
    dashboardState.recentShipments.length > 0
  ) {
    recentShipments = dashboardState.recentShipments.slice(0, 5);
  } else {
    // Fallback to local shipments data
    recentShipments = dashboardState.shipments
      .sort((a, b) => {
        const aTime = new Date(a.statusUpdatedAt || a.updatedAt || a.createdAt);
        const bTime = new Date(b.statusUpdatedAt || b.updatedAt || b.createdAt);
        return bTime - aTime;
      })
      .slice(0, 5);
  }

  const recentProblems = dashboardState.problems
    .sort((a, b) => {
      const aTime = new Date(a.timestamp || a.reportedAt);
      const bTime = new Date(b.timestamp || b.reportedAt);
      return bTime - aTime;
    })
    .slice(0, 3);

  let activityHTML = "<h4>Recent Shipment Updates</h4>";

  if (recentShipments.length === 0) {
    activityHTML += "<p class='no-data'>No recent shipment activity</p>";
  } else {
    activityHTML += "<ul>";
    recentShipments.forEach((shipment) => {
      const status = shipment.status || "pending";
      const updateTime =
        shipment.statusUpdatedAt || shipment.updatedAt || shipment.createdAt;
      const time = new Date(updateTime).toLocaleString();

      activityHTML += `
        <li>
          <strong>${shipment.id}</strong> - Status: 
          <span class="status-badge status-${status}">${status}</span>
          <small>(${time})</small>
        </li>
      `;
    });
    activityHTML += "</ul>";
  }

  activityHTML += "<h4>Recent Problems</h4>";

  if (recentProblems.length === 0) {
    activityHTML += "<p class='no-data'>No recent problems reported</p>";
  } else {
    activityHTML += "<ul>";
    recentProblems.forEach((problem) => {
      const time = new Date(
        problem.timestamp || problem.reportedAt
      ).toLocaleString();
      const message = problem.message || "No message available";

      activityHTML += `
        <li>
          <strong>${problem.shipmentId}</strong> - ${message.substring(0, 50)}${
        message.length > 50 ? "..." : ""
      }
          <small>(${time})</small>
        </li>
      `;
    });
    activityHTML += "</ul>";
  }

  container.innerHTML = activityHTML;
}

// Drivers Data Loading
async function loadDriversData() {
  try {
    // Load drivers and shipments data (schedules are optional)
    const [driversResponse, shipmentsResponse] = await Promise.all([
      apiCall("/manager/drivers"),
      apiCall("/manager/shipments")
    ]);

    // Load schedules separately with error handling
    let schedulesResponse = { success: false, schedules: [] };
    try {
      schedulesResponse = await apiCall("/manager/schedules");
    } catch (scheduleError) {
      console.warn("Could not load schedules data:", scheduleError.message);
    }

    // Process shipments data
    let allShipments = [];
    if (shipmentsResponse.success) {
      allShipments = shipmentsResponse.shipments;
      dashboardState.shipments = allShipments;
    }

    // Process schedules data
    let allSchedules = [];
    if (schedulesResponse.success) {
      allSchedules = schedulesResponse.schedules;
      dashboardState.schedules = allSchedules;
    }

    if (driversResponse.success) {
      // Process the drivers data and determine status/assignment
      dashboardState.drivers = driversResponse.drivers.map((driver) => {
        const processedDriver = {
          ...driver,
          name:
            `${driver.firstName || ""} ${driver.lastName || ""}`.trim() ||
            "Unknown",
          // Use the actual role from Firebase, fallback to type mapping
          role:
            driver.role ||
            (driver.type === "deliverer" ? "deliverer" : "industrialDriver"),
        };

        // Find shipments assigned to this driver
        const driverShipments = allShipments.filter(shipment => 
          shipment.driver === driver.id || 
          shipment.driverId === driver.id ||
          shipment.transporterId === driver.id ||
          shipment.delivererId === driver.id
        );

        // Determine status and current assignment based on shipments
        if (driverShipments.length > 0) {
          processedDriver.status = "busy";
          
          // Find the most recent or active shipment for current assignment
          const activeShipment = driverShipments.find(shipment => 
            shipment.status === "in_transit" || shipment.status === "picked_up"
          ) || driverShipments[0];
          
          if (activeShipment) {
            const shipmentType = activeShipment.type === "farmer_shipment" ? "Farmer Pickup" : "Customer Delivery";
            processedDriver.currentAssignment = `${shipmentType}: ${activeShipment.id}`;
          } else {
            processedDriver.currentAssignment = `Shipment: ${driverShipments[0].id}`;
          }
        } else {
          // No shipments assigned - check schedule-based availability
          const currentTime = new Date();
          const todaySchedule = allSchedules.find(schedule => 
            schedule.driverId === driver.id && 
            isScheduleForToday(schedule, currentTime)
          );

          if (todaySchedule && isDriverScheduledNow(todaySchedule, currentTime)) {
            processedDriver.status = "available";
            processedDriver.currentAssignment = "On Schedule - Available";
          } else {
            processedDriver.status = driver.availability || driver.status || "off_duty";
            processedDriver.currentAssignment = "None";
          }
        }

        return processedDriver;
      });
    } else {
      dashboardState.drivers = [];
    }

    dashboardState.filteredData.drivers = [...dashboardState.drivers];
    renderDriversTable();
  } catch (error) {
    console.error("Error loading drivers data:", error);
    dashboardState.drivers = [];
    dashboardState.filteredData.drivers = [];
    renderDriversTable();
  }
}

// Helper function to check if schedule is for today
function isScheduleForToday(schedule, currentTime) {
  if (!schedule.date && !schedule.startDate) return false;
  
  const scheduleDate = new Date(schedule.date || schedule.startDate);
  const today = new Date(currentTime);
  
  return scheduleDate.toDateString() === today.toDateString();
}

// Helper function to check if driver is scheduled now
function isDriverScheduledNow(schedule, currentTime) {
  if (!schedule.startTime || !schedule.endTime) return false;
  
  const now = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startTime = parseTimeToMinutes(schedule.startTime);
  const endTime = parseTimeToMinutes(schedule.endTime);
  
  return now >= startTime && now <= endTime;
}

// Helper function to parse time string to minutes
function parseTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function renderDriversTable() {
  const tbody = document.getElementById("drivers-table-body");

  if (dashboardState.filteredData.drivers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="no-data">No drivers found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dashboardState.filteredData.drivers
    .map(
      (driver) => `
    <tr>
      <td>${driver.name || `${driver.firstName} ${driver.lastName}`}</td>
      <td>${driver.role}</td>
      <td><span class="status-badge status-${driver.status}">${
        driver.status
      }</span></td>
      <td>${driver.currentAssignment || "None"}</td>
      <td>${driver.phone || "N/A"}</td>
      <td>${driver.vehicleType || "N/A"}</td>
      <td>
        <button class="btn-small btn-info" onclick="showDriverDetails('${
          driver.id
        }')">
          View Details
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

// Shipments Data Loading
async function loadShipmentsData() {
  try {
    // If shipments are already loaded from drivers data, use them
    if (dashboardState.shipments && dashboardState.shipments.length > 0) {
      dashboardState.filteredData.shipments = [...dashboardState.shipments];
      renderShipmentsTable();
      return;
    }

    // Otherwise, load shipments fresh
    const response = await apiCall("/manager/shipments");

    if (response.success) {
      dashboardState.shipments = response.shipments;
    } else {
      dashboardState.shipments = [];
    }

    dashboardState.filteredData.shipments = [...dashboardState.shipments];
    renderShipmentsTable();
  } catch (error) {
    console.error("Error loading shipments data:", error);
    dashboardState.shipments = [];
    dashboardState.filteredData.shipments = [];
    renderShipmentsTable();
  }
}

function renderShipmentsTable() {
  const tbody = document.getElementById("shipments-table-body");

  if (dashboardState.filteredData.shipments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="no-data">No shipments found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dashboardState.filteredData.shipments
    .map((shipment) => {
      const status = getShipmentStatus(shipment);
      const destination = getShipmentDestination(shipment);
      const pickupTime = getShipmentPickupTime(shipment);
      const driverName = getDriverNameSync(shipment.driver);

      return `
      <tr>
        <td>${shipment.id}</td>
        <td>
          <span class="shipment-type-badge ${
            shipment.type === "farmer_shipment"
              ? "type-farmer"
              : "type-customer"
          }">
            ${
              shipment.type === "farmer_shipment"
                ? "Farm → Logistics"
                : "Logistics → Customer"
            }
          </span>
        </td>
        <td><span class="status-badge status-${status}">${status}</span></td>
        <td data-driver-id="${shipment.driver || ""}">${driverName}</td>
        <td>${destination}</td>
        <td>${pickupTime}</td>
        <td>
          <button class="btn-small btn-info" onclick="showShipmentDetails('${
            shipment.id
          }', '${shipment.type}')">
            View Details
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// Problems Data Loading
async function loadProblemsData() {
  try {
    const response = await apiCall("/manager/problems");

    if (response.success) {
      dashboardState.problems = response.problems;
    } else {
      dashboardState.problems = [];
    }

    dashboardState.filteredData.problems = [...dashboardState.problems];
    renderProblemsTable();
  } catch (error) {
    console.error("Error loading problems data:", error);
    dashboardState.problems = [];
    dashboardState.filteredData.problems = [];
    renderProblemsTable();
  }
}

function renderProblemsTable() {
  const tbody = document.getElementById("problems-table-body");

  if (dashboardState.filteredData.problems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="no-data">No problem reports found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dashboardState.filteredData.problems
    .map((problem) => {
      const reportedAt = problem.reportedAt?.toDate
        ? problem.reportedAt.toDate()
        : new Date(problem.reportedAt || problem.timestamp);
      const status = problem.status || "open";

      return `
      <tr>
        <td>${problem.shipmentId}</td>
        <td>${problem.message}</td>
        <td>${problem.reportedBy || "Unknown"}</td>
        <td>${reportedAt.toLocaleString()}</td>
        <td>
          <span class="shipment-type-badge ${
            problem.shipmentType === "farmer_shipment"
              ? "type-farmer"
              : "type-customer"
          }">
            ${
              problem.shipmentType === "farmer_shipment"
                ? "Farm → Logistics"
                : "Logistics → Customer"
            }
          </span>
        </td>
        <td>
          <span class="status-badge status-${status}">${status}</span>
        </td>
        <td>
          <button class="btn-small btn-info" onclick="showProblemDetails('${
            problem.id
          }')">
            View Details
          </button>
          ${
            status !== "resolved"
              ? `
            <button class="btn-small btn-success" onclick="resolveProblem('${problem.id}')">
              Resolve
            </button>
          `
              : ""
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

// Schedule Data Loading
async function loadScheduleData() {
  try {
    // If schedules are already loaded from drivers data, use them
    if (dashboardState.schedules && dashboardState.schedules.length > 0) {
      dashboardState.filteredData.schedules = [...dashboardState.schedules];
      renderScheduleTable();
      return;
    }

    // Otherwise, load schedules fresh
    const response = await apiCall("/manager/schedules");

    if (response.success) {
      dashboardState.schedules = response.schedules;
    } else {
      dashboardState.schedules = [];
    }

    dashboardState.filteredData.schedules = [...dashboardState.schedules];
    renderScheduleTable();
  } catch (error) {
    console.error("Error loading schedule data:", error);
    dashboardState.schedules = [];
    dashboardState.filteredData.schedules = [];
    renderScheduleTable();
  }
}

function renderScheduleTable() {
  const tbody = document.getElementById("schedule-table-body");

  if (dashboardState.filteredData.schedules.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-data">No schedule data found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dashboardState.filteredData.schedules
    .map((schedule) => {
      const scheduleText = formatScheduleDisplay(
        schedule.schedule || schedule.weeklySchedule
      );
      const standbyText =
        schedule.standbyShifts && schedule.standbyShifts.length > 0
          ? `${schedule.standbyShifts.length} shifts`
          : "No standby shifts";
      const lastUpdated = schedule.updatedAt
        ? new Date(schedule.updatedAt).toLocaleDateString()
        : "Unknown";

      return `
      <tr>
        <td>${schedule.driverName}</td>
        <td>${schedule.driverType}</td>
        <td>${scheduleText}</td>
        <td>${standbyText}</td>
        <td>${lastUpdated}</td>
        <td>
          <button class="btn-small btn-info" onclick="showScheduleDetails('${schedule.driverId}')">
            View Details
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// Event Listeners Setup
function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tabName = e.target.getAttribute("data-tab");
      if (tabName) {
        showTab(tabName);
      }
    });
  });

  // Logout
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// Filter Functions
function applyOverviewFilters() {
  // Overview doesn't need filtering, just refresh data
  loadOverviewData();
}

function applyDriverFilters() {
  const searchTerm =
    document.getElementById("driver-search")?.value.toLowerCase() || "";
  const roleFilter = document.getElementById("driver-role-filter")?.value || "";
  const statusFilter = document.getElementById("driver-status-filter")?.value || "";

  dashboardState.filteredData.drivers = dashboardState.drivers.filter(
    (driver) => {
      const matchesSearch =
        !searchTerm ||
        driver.name.toLowerCase().includes(searchTerm) ||
        (driver.phone && driver.phone.includes(searchTerm));

      const matchesRole = !roleFilter || driver.role === roleFilter;
      const matchesStatus = !statusFilter || driver.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    }
  );

  renderDriversTable();
}

function clearDriverFilters() {
  const searchInput = document.getElementById("driver-search");
  const roleFilter = document.getElementById("driver-role-filter");
  const statusFilter = document.getElementById("driver-status-filter");

  if (searchInput) searchInput.value = "";
  if (roleFilter) roleFilter.value = "";
  if (statusFilter) statusFilter.value = "";

  dashboardState.filteredData.drivers = [...dashboardState.drivers];
  renderDriversTable();
}

function applyShipmentFilters() {
  const searchTerm =
    document.getElementById("shipment-search")?.value.toLowerCase() || "";
  const typeFilter =
    document.getElementById("shipment-type-filter")?.value || "";
  const statusFilter =
    document.getElementById("shipment-status-filter")?.value || "";

  dashboardState.filteredData.shipments = dashboardState.shipments.filter(
    (shipment) => {
      const matchesSearch =
        !searchTerm ||
        shipment.id.toLowerCase().includes(searchTerm) ||
        getShipmentDestination(shipment).toLowerCase().includes(searchTerm);

      const matchesType = !typeFilter || shipment.type === typeFilter;
      const matchesStatus =
        !statusFilter || getShipmentStatus(shipment) === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    }
  );

  renderShipmentsTable();
}

function clearShipmentFilters() {
  const searchInput = document.getElementById("shipment-search");
  const typeFilter = document.getElementById("shipment-type-filter");
  const statusFilter = document.getElementById("shipment-status-filter");

  if (searchInput) searchInput.value = "";
  if (typeFilter) typeFilter.value = "";
  if (statusFilter) statusFilter.value = "";

  dashboardState.filteredData.shipments = [...dashboardState.shipments];
  renderShipmentsTable();
}

function applyProblemFilters() {
  const searchTerm =
    document.getElementById("problem-search")?.value.toLowerCase() || "";
  const typeFilter =
    document.getElementById("problem-type-filter")?.value || "";
  const statusFilter =
    document.getElementById("problem-status-filter")?.value || "";

  dashboardState.filteredData.problems = dashboardState.problems.filter(
    (problem) => {
      const matchesSearch =
        !searchTerm ||
        problem.shipmentId.toLowerCase().includes(searchTerm) ||
        problem.message.toLowerCase().includes(searchTerm);

      const matchesType = !typeFilter || problem.shipmentType === typeFilter;
      const matchesStatus =
        !statusFilter || (problem.status || "open") === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    }
  );

  renderProblemsTable();
}

function clearProblemFilters() {
  const searchInput = document.getElementById("problem-search");
  const typeFilter = document.getElementById("problem-type-filter");
  const statusFilter = document.getElementById("problem-status-filter");

  if (searchInput) searchInput.value = "";
  if (typeFilter) typeFilter.value = "";
  if (statusFilter) statusFilter.value = "";

  dashboardState.filteredData.problems = [...dashboardState.problems];
  renderProblemsTable();
}

function applyScheduleFilters() {
  const searchTerm =
    document.getElementById("schedule-search")?.value.toLowerCase() || "";
  const typeFilter =
    document.getElementById("schedule-type-filter")?.value || "";
  const statusFilter =
    document.getElementById("schedule-status-filter")?.value || "";
  const dateFrom = document.getElementById("schedule-date-from")?.value || "";
  const dateTo = document.getElementById("schedule-date-to")?.value || "";

  dashboardState.filteredData.schedules = dashboardState.schedules.filter(
    (schedule) => {
      const matchesSearch =
        !searchTerm || schedule.driverName.toLowerCase().includes(searchTerm);

      const matchesType = !typeFilter || schedule.driverType === typeFilter;
      const matchesStatus =
        !statusFilter || schedule.availability === statusFilter;

      // Date range filtering - check if schedule has standby shifts within the date range
      let matchesDateRange = true;
      if (dateFrom || dateTo) {
        // HTML date inputs return YYYY-MM-DD format
        const fromDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
        const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

        console.log("Date filtering setup:", {
          dateFromInput: dateFrom,
          dateToInput: dateTo,
          fromDate: fromDate?.toISOString(),
          toDate: toDate?.toISOString(),
        });

        // Check if any standby shifts fall within the date range
        if (schedule.standbyShifts && schedule.standbyShifts.length > 0) {
          matchesDateRange = schedule.standbyShifts.some((shift) => {
            // Parse shift date (should be in YYYY-MM-DD format from Firebase)
            const shiftDate = new Date(shift.date + "T00:00:00");

            console.log("Checking shift:", {
              shiftDateString: shift.date,
              shiftDate: shiftDate.toISOString(),
              fromDate: fromDate?.toISOString(),
              toDate: toDate?.toISOString(),
            });

            // Check if shift date is within range
            const afterFrom = !fromDate || shiftDate >= fromDate;
            const beforeTo = !toDate || shiftDate <= toDate;

            console.log("Date comparison:", { afterFrom, beforeTo });

            return afterFrom && beforeTo;
          });

          console.log(
            "Schedule:",
            schedule.driverName,
            "Standby shifts match result:",
            matchesDateRange
          );
        } else {
          // If no standby shifts, check if schedule was updated within the date range
          if (schedule.updatedAt) {
            const updatedDate = new Date(schedule.updatedAt);
            const afterFrom = !fromDate || updatedDate >= fromDate;
            const beforeTo = !toDate || updatedDate <= toDate;
            matchesDateRange = afterFrom && beforeTo;
            console.log(
              "Schedule:",
              schedule.driverName,
              "Updated date match result:",
              matchesDateRange
            );
          } else {
            // If no date info available, don't filter out unless both dates are set
            matchesDateRange = !(fromDate && toDate);
            console.log(
              "Schedule:",
              schedule.driverName,
              "No date info, match result:",
              matchesDateRange
            );
          }
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDateRange;
    }
  );

  renderScheduleTable();
}

function clearScheduleFilters() {
  const searchInput = document.getElementById("schedule-search");
  const typeFilter = document.getElementById("schedule-type-filter");
  const statusFilter = document.getElementById("schedule-status-filter");
  const dateFromInput = document.getElementById("schedule-date-from");
  const dateToInput = document.getElementById("schedule-date-to");

  if (searchInput) searchInput.value = "";
  if (typeFilter) typeFilter.value = "";
  if (statusFilter) statusFilter.value = "";
  if (dateFromInput) dateFromInput.value = "";
  if (dateToInput) dateToInput.value = "";

  dashboardState.filteredData.schedules = [...dashboardState.schedules];
  renderScheduleTable();
}

// Modal Functions
function showDriverDetails(driverId) {
  const driver = dashboardState.drivers.find((d) => d.id === driverId);
  if (!driver) {
    showMessage("Driver not found", "error");
    return;
  }

  alert(
    `Driver Details:\n\nName: ${driver.name}\nRole: ${driver.role}\nStatus: ${
      driver.status
    }\nPhone: ${driver.phone || "N/A"}\nVehicle: ${
      driver.vehicleType || "N/A"
    }\nCurrent Assignment: ${driver.currentAssignment || "None"}`
  );
}

function showShipmentDetails(shipmentId, shipmentType) {
  const shipment = dashboardState.shipments.find((s) => s.id === shipmentId);
  if (!shipment) {
    showMessage("Shipment not found", "error");
    return;
  }

  const status = getShipmentStatus(shipment);
  const destination = getShipmentDestination(shipment);
  const pickupTime = getShipmentPickupTime(shipment);

  alert(
    `Shipment Details:\n\nID: ${
      shipment.id
    }\nType: ${shipmentType}\nStatus: ${status}\nDestination: ${destination}\nPickup Time: ${pickupTime}\nDriver: ${getDriverName(
      shipment.driver
    )}`
  );
}

function showProblemDetails(problemId) {
  const problem = dashboardState.problems.find((p) => p.id === problemId);
  if (!problem) {
    showMessage("Problem not found", "error");
    return;
  }

  const reportedAt = problem.reportedAt?.toDate
    ? problem.reportedAt.toDate()
    : new Date(problem.reportedAt || problem.timestamp);
  alert(
    `Problem Details:\n\nShipment ID: ${problem.shipmentId}\nMessage: ${
      problem.message
    }\nReported By: ${
      problem.reportedBy || "Unknown"
    }\nReported At: ${reportedAt.toLocaleString()}\nStatus: ${
      problem.status || "open"
    }`
  );
}

function showScheduleDetails(driverId) {
  const schedule = dashboardState.schedules.find(
    (s) => s.driverId === driverId
  );
  if (!schedule) {
    showMessage("Schedule not found", "error");
    return;
  }

  // Format weekly schedule
  const weeklySchedule = schedule.weeklySchedule || schedule.schedule || {};
  const weeklyScheduleHtml =
    Object.keys(weeklySchedule).length > 0
      ? Object.entries(weeklySchedule)
          .map(([day, shifts], index) => {
            const bgColor = index % 2 === 0 ? "background-color: #f8f9fa;" : "";
            if (Array.isArray(shifts)) {
              return shifts.length > 0
                ? `<tr style="${bgColor}"><td style="padding: 8px; border: 1px solid #ddd;"><strong>${day}:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${shifts.join(
                    ", "
                  )}</td></tr>`
                : `<tr style="${bgColor}"><td style="padding: 8px; border: 1px solid #ddd;"><strong>${day}:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #6c757d;"><em>No shifts</em></td></tr>`;
            }
            return `<tr style="${bgColor}"><td style="padding: 8px; border: 1px solid #ddd;"><strong>${day}:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${shifts}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #6c757d;"><em>No weekly schedule set</em></td></tr>';

  // Format standby shifts
  const standbyShifts = schedule.standbyShifts || [];
  const standbyHtml =
    standbyShifts.length > 0
      ? standbyShifts
          .map((shift, index) => {
            const bgColor = index % 2 === 0 ? "background-color: #f8f9fa;" : "";
            return `<tr style="${bgColor}"><td style="padding: 8px; border: 1px solid #ddd;"><strong>${shift.date}:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${shift.shift}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #6c757d;"><em>No standby shifts assigned</em></td></tr>';

  const modalContent = `
    <div style="margin-bottom: 20px;">
      <h4 style="color: #333; margin-bottom: 10px;">Driver Information</h4>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${
          schedule.driverName
        }</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${
          schedule.driverType
        }</td></tr>
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Role:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${
          schedule.role || "N/A"
        }</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Availability:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${
          schedule.availability
        }</td></tr>
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Last Updated:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${
          schedule.updatedAt
            ? new Date(schedule.updatedAt).toLocaleString()
            : "Unknown"
        }</td></tr>
      </table>
    </div>

    <div style="margin-bottom: 20px;">
      <h4 style="color: #333; margin-bottom: 10px;">Weekly Schedule</h4>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        ${weeklyScheduleHtml}
      </table>
    </div>

    <div>
      <h4 style="color: #333; margin-bottom: 10px;">Standby Shifts</h4>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        ${standbyHtml}
      </table>
    </div>
  `;

  // Show the modal
  const modal = document.getElementById("schedule-details-modal");
  const content = document.getElementById("schedule-details-content");
  content.innerHTML = modalContent;
  modal.style.display = "flex";
}

function closeModal() {
  // Close any open modals
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.style.display = "none";
  });
}

// Close modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById("schedule-details-modal");
  if (event.target === modal) {
    closeModal();
  }
};

// Real-time updates
function startRealTimeUpdates() {
  // Poll for updates every 30 seconds
  setInterval(async () => {
    if (currentTab && document.visibilityState === "visible") {
      try {
        await loadTabData(currentTab);
      } catch (error) {
        console.error("Error in real-time update:", error);
      }
    }
  }, 30000);
}

// Resolve a shipment problem
async function resolveProblem(problemId) {
  try {
    const resolution = prompt("Enter resolution details:");
    if (!resolution) return;

    const response = await apiCall(`/manager/problems/${problemId}/resolve`, {
      method: "PUT",
      body: JSON.stringify({
        resolution: resolution,
        resolvedBy: currentUser.uid
      })
    });

    if (response.success) {
      showMessage("Problem resolved successfully", "success");
      // Reload problems data
      await loadProblemsData();
    } else {
      showMessage("Failed to resolve problem", "error");
    }
  } catch (error) {
    console.error("Error resolving problem:", error);
    showMessage("Error resolving problem", "error");
  }
}

// Utility Functions
function showLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    if (show) {
      overlay.classList.add("show");
    } else {
      overlay.classList.remove("show");
    }
  }
}

function showMessage(message, type) {
  const toast = document.getElementById("message-toast");
  if (toast) {
    toast.textContent = message;
    toast.className = `message-toast ${type}`;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  } else {
    // Fallback to alert if toast element doesn't exist
    alert(message);
  }
}

// Helper functions for shipment data processing
function getShipmentStatus(shipment) {
  if (shipment.type === "farmer_shipment") {
    // For farmer shipments, status is now at top level
    return shipment.status || "pending";
  } else {
    // For customer shipments, status is direct property
    return shipment.status || "pending";
  }
}

function getShipmentDestination(shipment) {
  if (shipment.type === "farmer_shipment") {
    return shipment.destination || "Logistics Center";
  } else {
    return (
      shipment.delivery_address || shipment.destination || "Customer Location"
    );
  }
}

function getShipmentPickupTime(shipment) {
  const pickupTime =
    shipment.pickup_time || shipment.scheduledPickup || shipment.createdAt;
  if (pickupTime) {
    return new Date(pickupTime).toLocaleDateString();
  }
  return "Not scheduled";
}

async function getDriverName(driverId) {
  if (!driverId) return "Unassigned";

  try {
    // First try to get from cache if we already fetched this driver
    if (window.driverRoleCache && window.driverRoleCache[driverId]) {
      return window.driverRoleCache[driverId];
    }

    // Initialize cache if not exists
    if (!window.driverRoleCache) {
      window.driverRoleCache = {};
    }

    // Make API call to get driver role
    const response = await apiCall(`/manager/driver-role/${driverId}`);
    if (response.success && response.role) {
      window.driverRoleCache[driverId] = response.role;
      return response.role;
    }

    // Fallback if API call fails
    return "Unknown Role";
  } catch (error) {
    console.error("Error fetching driver role:", error);
    return "Unknown Role";
  }
}

// Synchronous version for immediate display, updates async
function getDriverNameSync(driverId) {
  if (!driverId) return "Unassigned";

  // Check cache first
  if (window.driverRoleCache && window.driverRoleCache[driverId]) {
    return window.driverRoleCache[driverId];
  }

  // Start async fetch and return placeholder
  getDriverName(driverId).then((role) => {
    // Update the display after role is fetched
    const cells = document.querySelectorAll(`[data-driver-id="${driverId}"]`);
    cells.forEach((cell) => {
      cell.textContent = role;
    });
  });

  return "Loading...";
}

// Helper function to format schedule display
function formatScheduleDisplay(schedule) {
  if (!schedule || typeof schedule !== "object") {
    return "No schedule available";
  }

  const scheduleEntries = Object.entries(schedule);
  if (scheduleEntries.length === 0) {
    return "No schedule set";
  }

  // Format each day's schedule - handle both old format and new schedule_management format
  const formattedDays = scheduleEntries
    .map(([day, slots]) => {
      if (Array.isArray(slots)) {
        // Filter out empty arrays and format non-empty ones
        if (slots.length > 0) {
          return `${day}: ${slots.join(", ")}`;
        }
        return null; // Skip empty arrays
      } else if (slots) {
        return `${day}: ${slots}`;
      }
      return null;
    })
    .filter((entry) => entry !== null);

  if (formattedDays.length === 0) {
    return "No active schedule";
  }

  // Show first few days, truncate if too long
  if (formattedDays.length <= 2) {
    return formattedDays.join(" | ");
  } else {
    return `${formattedDays.slice(0, 2).join(" | ")} + ${
      formattedDays.length - 2
    } more`;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  localStorage.removeItem("user");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
}

// Make functions globally available
window.showTab = showTab;
window.applyOverviewFilters = applyOverviewFilters;
window.applyDriverFilters = applyDriverFilters;
window.clearDriverFilters = clearDriverFilters;
window.applyShipmentFilters = applyShipmentFilters;
window.clearShipmentFilters = clearShipmentFilters;
window.applyProblemFilters = applyProblemFilters;
window.clearProblemFilters = clearProblemFilters;
window.applyScheduleFilters = applyScheduleFilters;
window.clearScheduleFilters = clearScheduleFilters;
window.showDriverDetails = showDriverDetails;
window.showShipmentDetails = showShipmentDetails;
window.showProblemDetails = showProblemDetails;
window.showScheduleDetails = showScheduleDetails;
window.closeModal = closeModal;
window.resolveProblem = resolveProblem;
window.updateDriverStatus = updateDriverStatus;
window.getShipmentStatus = getShipmentStatus;
window.getShipmentDestination = getShipmentDestination;
window.getShipmentPickupTime = getShipmentPickupTime;
window.getDriverName = getDriverName;
window.getDriverNameSync = getDriverNameSync;
window.formatScheduleDisplay = formatScheduleDisplay;
