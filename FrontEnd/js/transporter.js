// Configuration
const API_BASE_URL = "http://localhost:4000/api";
let currentUser = null;
let userRole = null;
let currentTab = "profile";

// State management
const appState = {
  profile: null,
  weeklySchedule: {},
  standbyShifts: [],
  isMonthlyLocked: false,
  lockMessage: "",
  availableShipments: [],
  myShipments: [],
  currentDate: new Date(),
  // Vehicle loading state
  vehicleLoading: {
    isVisible: false,
    vehicleType: "bicycle",
    vehicleCapacity: 0,
    vehicleVolumeCapacity: 0,
    currentWeight: 0,
    currentVolume: 0,
    loadingPercentage: 0,
  },
};

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Starting initialization...");

    await initializeAuth();
    console.log("Auth initialized");

    await loadUserProfile();
    console.log("Profile loaded");

    setupEventListeners();
    console.log("Event listeners setup");

    showTab("profile");
    console.log("Profile tab shown");

    // Start real-time updates
    startRealTimeUpdates();
    console.log("Real-time updates started");
  } catch (error) {
    console.error("Initialization error:", error);
    // Continue with basic setup even if some parts fail
    try {
      setupEventListeners();
      showTab("profile");
    } catch (fallbackError) {
      console.error("Fallback setup also failed:", fallbackError);
    }
  }
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

    console.log("Current user data:", currentUser); // Debug log

    // Validate transporter roles
    if (!["deliverer", "industrialDriver"].includes(userRole)) {
      console.log("Invalid role for transporter:", userRole);
      alert("Access denied. This page is for transporters only.");
      console.log("Current user data:", currentUser); // Debug log
      // window.location.href = "index.html";
      return;
    }

    // Update UI with user info - use firstName if available, otherwise name
    const displayName =
      currentUser.firstName && currentUser.lastName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.name || "User";

    document.getElementById("user-name").textContent = displayName;
    document.getElementById("user-role").textContent = userRole;
  } catch (error) {
    console.error("Auth initialization error:", error);
    logout();
  }
}

// Utility Functions
function showLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

function showMessage(message, type = "info") {
  const toast = document.getElementById("message-toast");
  if (toast) {
    toast.textContent = message;
    toast.className = `message-toast ${type}`;
    toast.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }
  console.log(`${type.toUpperCase()}: ${message}`);
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
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

// Tab Management - UPDATED for data-tab approach
function showTab(tabName) {
  // Hide all tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Remove active class from all tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show selected tab content - with null check
  const targetSection = document.getElementById(`${tabName}-section`);
  if (targetSection) {
    targetSection.classList.add("active");
  } else {
    console.error(`Tab section not found: ${tabName}-section`);
    return;
  }

  // Find and activate the correct tab button using data-tab attribute
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
      case "profile":
        await loadProfile();
        break;
      case "schedule":
        await loadSchedule();
        break;
      case "shipments":
        await loadShipments();
        break;
    }
  } catch (error) {
    console.error(`Error loading ${tabName} data:`, error);
  }
}

// Profile Management
async function loadUserProfile() {
  try {
    // Get transporter profile data (from deliverers collection)
    const profileData = await apiCall("/transporter/profile");

    // Combine the profile data with current user data
    const combinedProfile = {
      ...profileData.profile,
      // Use currentUser data for name and phone if available
      firstName: currentUser?.firstName || profileData.profile?.firstName,
      lastName: currentUser?.lastName || profileData.profile?.lastName,
      phone: currentUser?.phone || profileData.profile?.phone,
    };

    appState.profile = combinedProfile;
    populateProfileForm(combinedProfile);
    showMessage("Profile loaded successfully", "success");
  } catch (error) {
    console.log("No existing profile found, using currentUser data");

    // Use currentUser data as fallback
    if (currentUser) {
      const basicProfile = {
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        phone: currentUser.phone || "",
        email: currentUser.email || "",
      };
      populateProfileForm(basicProfile);
      showMessage(
        "Loading basic user information. Please complete your profile.",
        "info"
      );
    } else {
      showMessage(
        "No profile found. Please fill out your profile information.",
        "info"
      );
      populateProfileForm({});
    }
  }
}

async function loadProfile() {
  // Load user profile (vehicle type will be loaded from deliverers collection)
  await loadUserProfile();
}

function populateProfileForm(profile) {
  console.log("Populating profile form with:", profile); // Debug log

  if (!profile) {
    console.log("No profile data provided");
    return;
  }

  // Handle special cases for fields that don't match directly
  if (profile.firstName || profile.lastName) {
    const nameElement = document.getElementById("name");
    if (nameElement) {
      const fullName = `${profile.firstName || ""} ${
        profile.lastName || ""
      }`.trim();
      nameElement.value = fullName || "";
      console.log("Set name to:", fullName);
    }
  } else if (profile.name) {
    const nameElement = document.getElementById("name");
    if (nameElement) {
      nameElement.value = profile.name;
      console.log("Set name from name field:", profile.name);
    }
  }

  // Handle phone field from user data
  if (profile.phone) {
    const phoneElement = document.getElementById("phone");
    if (phoneElement) {
      phoneElement.value = profile.phone;
      console.log("Set phone to:", profile.phone);
    }
  }

  // Handle vehicle type from extraFields (read-only display)
  if (profile.extraFields && profile.extraFields.vehicleType) {
    const vehicleTypeElement = document.getElementById("vehicleType");
    if (vehicleTypeElement) {
      vehicleTypeElement.value = profile.extraFields.vehicleType;
      console.log(
        "Set vehicle type from extraFields:",
        profile.extraFields.vehicleType
      );
    }
  } else if (profile.vehicleType) {
    const vehicleTypeElement = document.getElementById("vehicleType");
    if (vehicleTypeElement) {
      vehicleTypeElement.value = profile.vehicleType;
      console.log("Set vehicle type:", profile.vehicleType);
    }
  } else {
    // If no vehicle type found, show placeholder message
    const vehicleTypeElement = document.getElementById("vehicleType");
    if (vehicleTypeElement) {
      vehicleTypeElement.value = "";
      vehicleTypeElement.placeholder = "No vehicle type registered";
      console.log("No vehicle type found");
    }
  }

  // Handle other fields normally
  Object.keys(profile).forEach((key) => {
    const element = document.getElementById(key);
    if (
      element &&
      key !== "name" &&
      key !== "phone" &&
      key !== "vehicleType" &&
      key !== "firstName" &&
      key !== "lastName"
    ) {
      if (element.type === "checkbox") {
        element.checked = profile[key];
      } else {
        element.value = profile[key] || "";
      }
      console.log(`Set ${key} to:`, profile[key]);
    }
  });
}

// Schedule Management
async function loadSchedule() {
  try {
    console.log("Loading schedule data from Firebase...");

    // Load schedule data from Firebase
    const scheduleData = await apiCall("/transporter/schedule");
    appState.weeklySchedule = scheduleData.weeklySchedule || {};
    appState.standbyShifts = scheduleData.standbyShifts || [];
    appState.isMonthlyLocked = scheduleData.isMonthlyLocked || false;
    appState.lockMessage = scheduleData.message || "";

    console.log("Schedule data loaded:", scheduleData);

    renderWeeklySchedule();
    renderMonthlyCalendar();
  } catch (error) {
    console.error("Error loading schedule:", error);
    // Initialize with empty data if API fails
    appState.weeklySchedule = {};
    appState.standbyShifts = [];
    appState.isMonthlyLocked = false;
    appState.lockMessage = "";
    renderWeeklySchedule();
    renderMonthlyCalendar();
    showMessage("Could not load schedule from database", "error");
  }
}

function renderWeeklySchedule() {
  const tbody = document.getElementById("weekly-schedule-body");
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const shifts = ["Morning", "Afternoon", "Evening", "Night"];

  tbody.innerHTML = "";

  days.forEach((day) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${day}</strong></td>
      ${shifts
        .map(
          (shift) => `
        <td>
          <input type="checkbox" 
                 id="${day}-${shift}" 
                 data-day="${day}" 
                 data-shift="${shift}"
                 ${
                   appState.weeklySchedule[day]?.includes(shift)
                     ? "checked"
                     : ""
                 }>
        </td>
      `
        )
        .join("")}
    `;
    tbody.appendChild(row);
  });
}

function renderMonthlyCalendar() {
  const calendar = document.getElementById("monthly-calendar");
  const currentDate = appState.currentDate;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update month/year display
  document.getElementById(
    "current-month-year"
  ).textContent = `${currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;

  // Create calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  let calendarHTML = '<div class="calendar-grid">';

  // Day headers
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  dayHeaders.forEach((day) => {
    calendarHTML += `<div class="calendar-header">${day}</div>`;
  });

  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split("T")[0];
    const isToday = dateString === new Date().toISOString().split("T")[0];
    const isPast = date < new Date();
    const isStandby = appState.standbyShifts.some(
      (shift) => shift.date === dateString
    );

    let dayClass = "calendar-day";
    if (isPast) dayClass += " past";
    if (isToday) dayClass += " today";
    if (isStandby) dayClass += " standby";

    // Only make clickable if not locked and not past
    const isClickable = !appState.isMonthlyLocked && !isPast;
    if (isClickable) dayClass += " clickable";

    // Disable clicking if locked
    const onClickHandler = isClickable
      ? `toggleStandbyShift('${dateString}')`
      : "";

    calendarHTML += `
      <div class="${dayClass}" data-date="${dateString}" ${
      onClickHandler ? `onclick="${onClickHandler}"` : ""
    }>
        <span>${day}</span>
        ${isStandby ? "<small>Standby</small>" : ""}
      </div>
    `;
  }

  calendarHTML += "</div>";
  calendar.innerHTML = calendarHTML;

  // Update standby count
  document.getElementById("standby-count").textContent =
    appState.standbyShifts.length;

  // Handle monthly schedule locking
  const saveButton = document.getElementById("save-standby-shifts");
  const standbyInfo = document.querySelector(".standby-info-card");

  if (appState.isMonthlyLocked) {
    // Hide save button and show admin contact message
    saveButton.style.display = "none";

    // Add lock message if not already present
    let lockMessageEl = document.getElementById("lock-message");
    if (!lockMessageEl) {
      lockMessageEl = document.createElement("p");
      lockMessageEl.id = "lock-message";
      lockMessageEl.style.color = "#d32f2f";
      lockMessageEl.style.fontWeight = "bold";
      lockMessageEl.style.marginTop = "10px";
      standbyInfo.appendChild(lockMessageEl);
    }
    lockMessageEl.textContent =
      appState.lockMessage || "Contact admin to make changes.";

    // Update instruction text - look for the ul element instead of small
    const instructionEl = standbyInfo.querySelector("ul li:first-child");
    if (instructionEl) {
      instructionEl.textContent = "Schedule is locked for this month";
    }
  } else {
    // Show save button and remove lock message
    saveButton.style.display = "block";

    const lockMessageEl = document.getElementById("lock-message");
    if (lockMessageEl) {
      lockMessageEl.remove();
    }

    // Update instruction text - restore original text
    const instructionEl = standbyInfo.querySelector("ul li:first-child");
    if (instructionEl) {
      instructionEl.textContent =
        "Click on future dates to select standby shifts";
    }
  }
}

// Shipment Management
async function loadShipments() {
  try {
    const [availableData, myData] = await Promise.all([
      apiCall("/transporter/available-shipments"),
      apiCall("/transporter/my-shipments"),
    ]);

    // Only use data from the API, no mock data
    appState.availableShipments = availableData.shipments || [];
    appState.myShipments = myData.shipments || [];

    renderAvailableShipments();
    renderMyShipments();

    // Update vehicle loading visualization if visible
    if (appState.vehicleLoading.isVisible) {
      await updateVehicleLoading();
    }
  } catch (error) {
    console.error("Error loading shipments:", error);
    // If API fails, show empty lists instead of mock data
    appState.availableShipments = [];
    appState.myShipments = [];
    renderAvailableShipments();
    renderMyShipments();
    showMessage("Could not load shipments from database", "error");
  }
}

function renderAvailableShipments() {
  const container = document.getElementById("available-shipments");

  // Filter shipments based on type and status
  const filteredShipments = appState.availableShipments.filter((shipment) => {
    const status = shipment.status || "pending";

    if (shipment.type === "farmer_shipment") {
      // Farmer shipments: show if status is "available_shipment"
      return status === "available_shipment";
    } else {
      // Customer shipments (orders): show if status is "ready_for_pickup"
      return status === "ready_for_pickup";
    }
  });

  if (filteredShipments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h4>🚛 No Available Shipments</h4>
        <p>All shipments are currently assigned. Check back later for new opportunities.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredShipments
    .map((shipment) => {
      // Helper function to render items based on shipment type
      const renderItems = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          // Farmer shipments have containers and items with different structure
          const containerInfo =
            shipment.containers && shipment.containers.length > 0
              ? shipment.containers
                  .map(
                    (container) =>
                      `${container.item} (Code: ${container.code}, ${container.weightKg}kg)`
                  )
                  .join(", ")
              : "";

          const itemInfo =
            shipment.items && shipment.items.length > 0
              ? shipment.items
                  .map((item) => `${item.name} (${item.quantity} units)`)
                  .join(", ") +
                (shipment.totalWeight
                  ? ` - Total: ${shipment.totalWeight}kg`
                  : "")
              : "";

          return containerInfo || itemInfo || "No items listed";
        } else {
          // Customer shipments
          return shipment.items && shipment.items.length > 0
            ? shipment.items
                .map(
                  (item) =>
                    `${item.item} (${item.amount} units, ${item.weight})`
                )
                .join(", ")
            : "No items listed";
        }
      };

      const getDestination = (shipment) => {
        return shipment.type === "farmer_shipment"
          ? shipment.destination || "Logistics Center"
          : shipment.destinationAddress || "Not specified";
      };

      const getPickupTime = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          return shipment.pickupTime
            ? new Date(shipment.pickupTime).toLocaleString()
            : "TBD";
        }
        return shipment.pickupTime
          ? new Date(shipment.pickupTime).toLocaleString()
          : "TBD";
      };

      const getStatus = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          return shipment.status || "pending";
        }
        return shipment.status || "pending";
      };

      // Determine shipment priority
      const getPriorityClass = (shipment) => {
        const pickupTime = new Date(shipment.pickupTime);
        const now = new Date();
        const hoursUntilPickup = (pickupTime - now) / (1000 * 60 * 60);

        if (hoursUntilPickup < 2) return "priority-urgent";
        if (hoursUntilPickup < 6) return "priority-high";
        return "";
      };

      const shipmentTypeClass =
        shipment.type === "farmer_shipment"
          ? "farmer-shipment"
          : "customer-shipment";
      const priorityClass = getPriorityClass(shipment);

      return `
    <div class="shipment-card ${shipmentTypeClass} ${priorityClass}">
      <div class="shipment-header">
        <span class="shipment-id">🆔 ${shipment.id}</span>
        <span class="shipment-type">
          ${
            shipment.type === "farmer_shipment"
              ? "🌾 Farm → 🏢 Logistics"
              : "🏢 Logistics → 🏠 Customer"
          }
        </span>
      </div>
      <div class="shipment-header">
        <span class="logistics-id">${
          shipment.type === "farmer_shipment"
            ? `🚜 Farm: ${shipment.farmerId || "N/A"}`
            : `📦 Logistics: ${shipment.logisticsId || "N/A"}`
        }</span>
        <span class="shipment-status status-${getStatus(shipment)}">${getStatus(
        shipment
      ).replace(/_/g, " ")}</span>
      </div>
      <div class="shipment-content">
        <p><strong>📍 Destination:</strong> ${getDestination(shipment)}</p>
        <p><strong>📦 Items:</strong> ${renderItems(shipment)}</p>
        <p><strong>⏰ Pickup Time:</strong> ${getPickupTime(shipment)}</p>
        <p><strong>🔍 QR Code:</strong> ${
          shipment.qrCode ? "✅ Generated" : "❌ Not generated"
        }</p>
      </div>
      <div class="shipment-actions">
        <button onclick="showShipmentModal('${shipment.id}', '${
        shipment.type
      }')" class="btn-secondary">📋 View Details</button>
        <button onclick="viewShipmentMap('${shipment.id}', '${
        shipment.type
      }')" class="btn-info">🗺️ View Map</button>
        <button onclick="acceptShipment('${shipment.id}', '${
        shipment.type
      }')" class="btn-success">✅ Accept Shipment</button>
      </div>
    </div>
  `;
    })
    .join("");
}

function renderMyShipments() {
  const container = document.getElementById("my-shipments");

  if (appState.myShipments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h4>📋 No Assigned Shipments</h4>
        <p>You don't have any active shipments assigned. Accept available shipments to get started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.myShipments
    .map((shipment) => {
      // Helper function to render items based on shipment type
      const renderItems = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          // Farmer shipments have containers and items with different structure
          const containerInfo =
            shipment.containers && shipment.containers.length > 0
              ? shipment.containers
                  .map(
                    (container) =>
                      `${container.item} (Code: ${container.code}, ${container.weightKg}kg)`
                  )
                  .join(", ")
              : "";

          const itemInfo =
            shipment.items && shipment.items.length > 0
              ? shipment.items
                  .map((item) => `${item.name} (${item.quantity} units)`)
                  .join(", ") +
                (shipment.totalWeight
                  ? ` - Total: ${shipment.totalWeight}kg`
                  : "")
              : "";

          return containerInfo || itemInfo || "No items listed";
        } else {
          // Customer shipments - ONLY new order format from orders collection
          if (shipment.items && shipment.items.length > 0) {
            return shipment.items
              .map((item) => {
                // New format (from orders collection with enriched data)
                const weight = item.weight ? `, ${item.weight}` : "";
                return `${item.itemName} (${item.quantity} units${weight})`;
              })
              .join(", ");
          }
          return "No items listed";
        }
      };

      const getDestination = (shipment) => {
        return shipment.type === "farmer_shipment"
          ? shipment.destination || "Logistics Center"
          : shipment.destinationAddress || "Not specified";
      };

      const getPickupTime = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          return shipment.pickupTime
            ? new Date(shipment.pickupTime).toLocaleString()
            : "TBD";
        }
        return shipment.pickupTime
          ? new Date(shipment.pickupTime).toLocaleString()
          : "TBD";
      };

      const getStatus = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          return shipment.status || "pending";
        }
        return shipment.status || "pending";
      };

      const getNotes = (shipment) => {
        if (shipment.type === "farmer_shipment") {
          const reportNotes = shipment.reportNotes
            ? `<p><strong>📝 Report Notes:</strong> ${shipment.reportNotes}</p>`
            : "";
          return reportNotes;
        } else {
          const customerReport = shipment.customerReport
            ? `<p><strong>📊 Customer Report:</strong> ${shipment.customerReport}</p>`
            : "";
          const customerNotes = shipment.customerNotes
            ? `<p><strong>💬 Customer Notes:</strong> ${shipment.customerNotes}</p>`
            : "";
          return customerReport + customerNotes;
        }
      };

      // Determine status for proper button styling
      const currentStatus = getStatus(shipment);
      const shipmentTypeClass =
        shipment.type === "farmer_shipment"
          ? "farmer-shipment"
          : "customer-shipment";

      // Add urgency class if problem status
      const urgencyClass = currentStatus === "problem" ? "priority-urgent" : "";

      return `
    <div class="shipment-card ${shipmentTypeClass} ${urgencyClass}">
      <div class="shipment-header">
        <span class="shipment-id">🆔 ${shipment.id}</span>
        <span class="shipment-type">
          ${
            currentStatus === "transport_to_pickup"
              ? "🏢 Transport → � Destination"
              : shipment.type === "farmer_shipment"
              ? "🌾 Farm → 🏢 Logistics"
              : "🏢 Logistics → 🏠 Customer"
          }
        </span>
      </div>
      <div class="shipment-header">
        <span class="logistics-id">${
          shipment.type === "farmer_shipment"
            ? `🚜 Farm: ${shipment.farmerId || "N/A"}`
            : `📦 Logistics: ${shipment.logisticsId || "N/A"}`
        }</span>
        <span class="shipment-status status-${currentStatus}">${currentStatus.replace(
        /_/g,
        " "
      )}</span>
      </div>
      <div class="shipment-content">
        <p><strong>📍 Destination:</strong> ${getDestination(shipment)}</p>
        <p><strong>📦 Items:</strong> ${renderItems(shipment)}</p>
        <p><strong>⏰ Pickup Time:</strong> ${getPickupTime(shipment)}</p>
        <p><strong>🚛 Driver:</strong> ${
          shipment.driverInfo
            ? `${shipment.driverInfo.name} (${shipment.driverInfo.contact})`
            : shipment.driver || "Not assigned"
        }</p>
        <p><strong>🔍 QR Code:</strong> ${
          shipment.qrCode ? "✅ Generated" : "❌ Not generated"
        }</p>
        ${getNotes(shipment)}
      </div>
      <div class="shipment-actions">
        <button onclick="showShipmentModal('${shipment.id}', '${
        shipment.type
      }')" class="btn-secondary">📋 View Details</button>
        
        <button onclick="viewShipmentMap('${shipment.id}', '${
        shipment.type
      }')" class="btn-info">🗺️ View Map</button>
        
        <select onchange="updateShipmentStatus('${shipment.id}', this.value, '${
        shipment.type
      }')" class="status-select">
          <option value="transport_to_pickup" ${
            currentStatus === "transport_to_pickup" ? "selected" : ""
          }>🚚 Transport to Pickup</option>
          <option value="at_pickup" ${
            currentStatus === "at_pickup" ? "selected" : ""
          }>🚛 At Pickup</option>
          <option value="in_transportation" ${
            currentStatus === "in_transportation" ? "selected" : ""
          }>🛣️ In Transportation</option>
          <option value="arrived" ${
            currentStatus === "arrived" ? "selected" : ""
          }>📍 Arrived</option>
          <option value="problem" ${
            currentStatus === "problem" ? "selected" : ""
          }>⚠️ Problem</option>
        </select>
        
        ${
          currentStatus === "at_pickup"
            ? `<button onclick="verifyQR('${shipment.id}', '${shipment.type}')" class="btn-primary">🔍 Verify QR</button>`
            : ""
        }
        ${
          currentStatus === "problem"
            ? `<button onclick="reportProblem('${shipment.id}', '${shipment.type}')" class="btn-warning">⚠️ Report Issue</button>`
            : ""
        }
      </div>
    </div>
  `;
    })
    .join("");
}

// Work Management
function setupRoleSpecificContent() {
  const delivererWork = document.getElementById("deliverer-work");
  const driverWork = document.getElementById("driver-work");

  if (userRole === "deliverer") {
    delivererWork.classList.add("active");
    driverWork.style.display = "none";
    document.getElementById("work-title").textContent = "Deliverer Dashboard";
  } else if (userRole === "industrialDriver") {
    driverWork.classList.add("active");
    delivererWork.style.display = "none";
    document.getElementById("work-title").textContent =
      "Industrial Driver Dashboard";
  }
}

async function loadWorkData() {
  if (userRole === "deliverer") {
    await loadDelivererData();
  } else if (userRole === "industrialDriver") {
    await loadDriverData();
  }
}

async function loadDelivererData() {
  try {
    const notificationsData = await apiCall(
      "/transporter/pickup-notifications"
    );
    renderPickupNotifications(notificationsData.notifications);
  } catch (error) {
    console.error("Error loading deliverer data:", error);
  }
}

async function loadDriverData() {
  try {
    const [pickupsData, alertsData] = await Promise.all([
      apiCall("/transporter/available-pickups"),
      apiCall("/transporter/departure-notifications"),
    ]);

    renderAvailablePickups(pickupsData.pickups);
    renderDepartureAlerts(alertsData.alerts);
  } catch (error) {
    console.error("Error loading driver data:", error);
  }
}

function renderPickupNotifications(notifications) {
  const container = document.getElementById("pickup-notifications-list");

  if (notifications.length === 0) {
    container.innerHTML = "<p>No pickup notifications.</p>";
    return;
  }

  container.innerHTML = notifications
    .map(
      (notification) => `
    <div class="notification-card">
      <p><strong>Order:</strong> ${notification.orderId}</p>
      <p><strong>Shelf:</strong> ${notification.pickupShelf || "1A"}</p>
      <button onclick="confirmPickup('${
        notification.orderId
      }')" class="btn-primary">Confirm Pickup</button>
    </div>
  `
    )
    .join("");
}

function renderAvailablePickups(pickups) {
  const container = document.getElementById("available-pickups-list");

  if (pickups.length === 0) {
    container.innerHTML = "<p>No available pickups.</p>";
    return;
  }

  container.innerHTML = pickups
    .map(
      (pickup) => `
    <div class="pickup-card">
      <p><strong>Farm:</strong> ${pickup.farmName || "Farm Location"}</p>
      <p><strong>Crop:</strong> ${pickup.cropType || "Mixed"}</p>
      <p><strong>Weight:</strong> ${pickup.weight || "N/A"} kg</p>
      <button onclick="acceptPickup('${
        pickup.id
      }')" class="btn-primary">Accept</button>
    </div>
  `
    )
    .join("");
}

function renderDepartureAlerts(alerts) {
  const container = document.getElementById("departure-alerts-list");

  if (alerts.length === 0) {
    container.innerHTML = "<p>No departure alerts.</p>";
    return;
  }

  container.innerHTML = alerts
    .map(
      (alert) => `
    <div class="alert-card">
      <p><strong>Departure Time:</strong> ${new Date(
        alert.departureTime
      ).toLocaleTimeString()}</p>
      <p><strong>Destination:</strong> ${alert.destination}</p>
      <p><strong>Note:</strong> ${alert.message}</p>
    </div>
  `
    )
    .join("");
}

// Event Listeners - UPDATED for data-tab approach
function setupEventListeners() {
  // Profile form submission - removed (profile is now read-only)

  // Weekly schedule save
  const weeklyScheduleBtn = document.getElementById("save-weekly-schedule");
  if (weeklyScheduleBtn) {
    weeklyScheduleBtn.addEventListener("click", async () => {
      await saveWeeklySchedule();
    });
  }

  // Standby shifts save
  const standbyShiftsBtn = document.getElementById("save-standby-shifts");
  if (standbyShiftsBtn) {
    standbyShiftsBtn.addEventListener("click", async () => {
      await saveStandbyShifts();
    });
  }

  // Calendar navigation
  const prevMonthBtn = document.getElementById("prev-month");
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      appState.currentDate.setMonth(appState.currentDate.getMonth() - 1);
      renderMonthlyCalendar();
    });
  }

  const nextMonthBtn = document.getElementById("next-month");
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      appState.currentDate.setMonth(appState.currentDate.getMonth() + 1);
      renderMonthlyCalendar();
    });
  }

  // Check-in button - removed (no longer needed)
  // Start shift button - removed (no longer needed)

  // Refresh shipments
  const refreshBtn = document.getElementById("refresh-shipments");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await loadShipments();
    });
  }

  // Logout
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", logout);
  }

  // Tab buttons - UPDATED for data-tab approach
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = e.target.getAttribute("data-tab");
      if (tabName) {
        showTab(tabName);
      }
    });
  });

  // Modal event listeners
  setupModalEventListeners();

  // Vehicle loading visualization
  setupVehicleLoadingListeners();

  // Initialize notification system
  initializeNotificationSystem();
}

// Modal Functions
function showShipmentModal(shipmentId, shipmentType = "customer_shipment") {
  console.log("Opening modal for shipment:", shipmentId, "type:", shipmentType);

  // Find the shipment data
  const shipment =
    appState.availableShipments.find((s) => s.id === shipmentId) ||
    appState.myShipments.find((s) => s.id === shipmentId);

  if (!shipment) {
    showMessage("Shipment not found", "error");
    return;
  }

  // Check if this is an assigned shipment or available shipment
  const isMyShipment = appState.myShipments.find((s) => s.id === shipmentId);
  const isAvailableShipment = appState.availableShipments.find(
    (s) => s.id === shipmentId
  );

  // Helper functions for different shipment types
  const getPickupTime = (shipment) => {
    if (shipment.type === "farmer_shipment") {
      return shipment.pickupTime
        ? new Date(shipment.pickupTime).toLocaleString()
        : "TBD";
    }
    return shipment.pickupTime
      ? new Date(shipment.pickupTime).toLocaleString()
      : "TBD";
  };

  const getStatus = (shipment) => {
    if (shipment.type === "farmer_shipment") {
      return shipment.status || "pending";
    }
    return shipment.status || "pending";
  };

  const getDestination = (shipment) => {
    return shipment.type === "farmer_shipment"
      ? shipment.destination || "Not specified"
      : shipment.destinationAddress || "Not specified";
  };

  // Format times
  const pickupTime = getPickupTime(shipment);
  const createdAt = shipment.createdAt
    ? new Date(shipment.createdAt).toLocaleString()
    : "N/A";
  const updatedAt = shipment.updatedAt
    ? new Date(shipment.updatedAt).toLocaleString()
    : "N/A";

  // Build items list based on shipment type
  let itemsList;
  if (shipment.type === "farmer_shipment") {
    // Show containers for farmer shipments
    const containersList =
      shipment.containers && shipment.containers.length > 0
        ? shipment.containers
            .map(
              (container) => `
          <tr>
            <td>${container.code}</td>
            <td>Code: ${container.code}</td>
            <td>${container.weightKg}kg</td>
            <td>Size: ${container.grade}, Brix: ${container.brix}, Acidity: ${container.acidityPercentage}</td>
          </tr>
        `
            )
            .join("")
        : '<tr><td colspan="4">No containers listed</td></tr>';

    const farmItemsList =
      shipment.items && shipment.items.length > 0
        ? shipment.items
            .map(
              (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity} units</td>
            <td colspan="2">Total shipment: ${shipment.totalWeight || 0}kg, ${
                shipment.totalVolume || 0
              } volume</td>
          </tr>
        `
            )
            .join("")
        : '<tr><td colspan="4">No items listed</td></tr>';

    itemsList = `

      <h4>Containers</h4>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Code</th>
            <th>Weight</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${containersList}
        </tbody>
      </table>
      <h4>Items Summary</h4>
      <table class="items-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Weight</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          ${farmItemsList}
        </tbody>
      </table>
    `;
  } else {
    // Show regular items for customer shipments
    itemsList =
      shipment.items && shipment.items.length > 0
        ? `
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Amount</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            ${shipment.items
              .map(
                (item) => `
              <tr>
                <td>${item.item}</td>
                <td>${item.amount} units</td>
                <td>${item.weight}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
        : "<p>No items listed</p>";
  }

  // Build notes section based on shipment type
  const notesSection = (() => {
    if (shipment.type === "farmer_shipment") {
      const reportNotes = shipment.reportNotes;
      return reportNotes
        ? `

        <div class="modal-section">
          <h3>Report Notes</h3>
          <div class="detail-item">
            <p class="notes-text">${reportNotes}</p>
          </div>
        </div>
      `
        : "";
    } else {
      return shipment.customerNotes || shipment.customerReport
        ? `

        <div class="modal-section">
          <h3>Notes & Reports</h3>
          ${
            shipment.customerNotes
              ? `
            <div class="detail-item">
              <label>Customer Notes:</label>
              <p class="notes-text">${shipment.customerNotes}</p>
            </div>
          `
              : ""
          }
          ${
            shipment.customerReport
              ? `
            <div class="detail-item">
              <label>Customer Report:</label>
              <p class="notes-text">${shipment.customerReport}</p>
            </div>
          `
              : ""
          }
        </div>
      `
        : "";
    }
  })();

  // Build modal content
  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = `
    <div class="modal-header">
      <h2>Shipment Details</h2>
      <div class="shipment-type-badge">${
        shipment.type === "farmer_shipment"
          ? "Farm → Logistics"
          : "Logistics → Customer"
      }</div>
      <div class="shipment-status-badge status-${getStatus(shipment)}">
        ${getStatus(shipment).replace("_", " ").toUpperCase()}
      </div>
    </div>

    <div class="modal-section">
      <h3>Basic Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <label>Shipment ID:</label>
          <span>${shipment.id}</span>
        </div>
        <div class="detail-item">
          <label>${
            shipment.type === "farmer_shipment" ? "Farm ID:" : "Logistics ID:"
          }</label>
          <span>${
            shipment.type === "farmer_shipment"
              ? shipment.farmerId || "N/A"
              : shipment.logisticsId || "N/A"
          }</span>
        </div>
        <div class="detail-item">
          <label>QR Code:</label>
          <span>${shipment.qrCode || "Not generated"}</span>
        </div>
        <div class="detail-item">
          <label>Destination:</label>
          <span>${getDestination(shipment)}</span>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <h3>Items to Transport</h3>
      ${itemsList}
    </div>

    <div class="modal-section">
      <h3>Schedule & Driver Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <label>Pickup Time:</label>
          <span>${pickupTime}</span>
        </div>
        <div class="detail-item">
          <label>Driver:</label>
          <span>${
            shipment.driverInfo
              ? `${shipment.driverInfo.name} (${shipment.driverInfo.contact})`
              : shipment.driver || "Not assigned"
          }</span>
        </div>
      </div>
    </div>

    ${notesSection}

    <div class="modal-section">
      <h3>Timestamps</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <label>Created:</label>
          <span>${createdAt}</span>
        </div>
        <div class="detail-item">
          <label>Last Updated:</label>
          <span>${updatedAt}</span>
        </div>
        ${
          shipment.assignedAt
            ? `

        <div class="detail-item">
          <label>Assigned:</label>
          <span>${new Date(shipment.assignedAt).toLocaleString()}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>

    <div class="modal-actions">
      ${
        isAvailableShipment
          ? `

        <button onclick="acceptShipmentFromModal('${shipment.id}', '${
              shipment.type || "customer_shipment"
            }')" class="btn-primary">
          Accept Shipment
        </button>
      `
          : ""
      }
      ${
        isMyShipment
          ? `

        <div class="status-update-section">
          <label for="modal-status-select">Update Status:</label>
          <select id="modal-status-select" onchange="updateShipmentStatusFromModal('${
            shipment.id
          }', this.value, '${shipment.type || "customer_shipment"}')">
            <option value="at_pickup" ${
              getStatus(shipment) === "at_pickup" ? "selected" : ""
            }>At Pickup</option>
            <option value="in_transportation" ${
              getStatus(shipment) === "in_transportation" ? "selected" : ""
            }>In Transportation</option>
            <option value="arrived" ${
              getStatus(shipment) === "arrived" ? "selected" : ""
            }>Arrived</option>
            <option value="problem" ${
              getStatus(shipment) === "problem" ? "selected" : ""
            }>Problem</option>
          </select>
        </div>
      `
          : ""
      }
      <button onclick="closeShipmentModal()" class="btn-secondary">
        Close
      </button>
    </div>
  `;

  // Show the modal
  const modal = document.getElementById("shipment-modal");
  modal.classList.add("show");
}

async function acceptShipmentFromModal(
  shipmentId,
  shipmentType = "customer_shipment"
) {
  try {
    await acceptShipment(shipmentId, shipmentType);
    closeShipmentModal();
  } catch (error) {
    console.error("Error accepting shipment from modal:", error);
    showMessage("Failed to accept shipment", "error");
  }
}

async function updateShipmentStatusFromModal(
  shipmentId,
  newStatus,
  shipmentType = "customer_shipment"
) {
  try {
    await updateShipmentStatus(shipmentId, newStatus, shipmentType);
    // Refresh the modal content to reflect the updated status
    showShipmentModal(shipmentId, shipmentType);
  } catch (error) {
    console.error("Error updating shipment status from modal:", error);
    showMessage("Failed to update shipment status", "error");
  }
}

function closeShipmentModal() {
  const modal = document.getElementById("shipment-modal");
  modal.classList.remove("show");
}

// Event listeners for modal
function setupModalEventListeners() {
  // Close button
  const closeBtn = document.getElementById("modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeShipmentModal);
  }

  // Click outside modal to close
  const modal = document.getElementById("shipment-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeShipmentModal();
      }
    });
  }

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeShipmentModal();
    }
  });
}

// Action Functions
// Replace the saveProfile function in transporter.js
async function saveProfile() {
  try {
    // Get form data
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const vehicleType = document.getElementById("vehicleType").value;
    const vehicleCapacity = parseInt(
      document.getElementById("vehicleCapacity").value
    );
    const driverLicenseNumber = document.getElementById(
      "driverLicenseNumber"
    ).value;
    const vehicleRegistrationNumber = document.getElementById(
      "vehicleRegistrationNumber"
    ).value;
    const insurance = document.getElementById("insurance").checked;
    const refrigerated = document.getElementById("refrigerated").checked;

    // Create profile data that matches transporter_data.js structure EXACTLY
    const profileData = {
      userId: currentUser.uid,
      name: name,
      phone: phone,
      licenseType: "Commercial Driver's License (CDL)",
      vehicleType: vehicleType,
      vehicleCapacity: vehicleCapacity,
      driverLicenseNumber: driverLicenseNumber,
      vehicleRegistrationNumber: vehicleRegistrationNumber,
      insurance: insurance,
      refrigerated: refrigerated,
      acceptAgreement: true,
      certifyAccuracy: true,
      availabilitySchedule: appState.weeklySchedule || {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      },
      regions: ["California"],
      availability: "available",
      currentLocation: {
        lat: 34.0522,
        lng: -118.2437,
        address: "Current Location",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Sending profile data:", profileData);

    await apiCall("/transporter/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
    });

    showMessage("Profile saved successfully!", "success");
    appState.profile = profileData;
  } catch (error) {
    console.error("Profile save error:", error);
    showMessage("Error saving profile", "error");
  }
}

async function saveWeeklySchedule() {
  try {
    const schedule = {};
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    days.forEach((day) => {
      schedule[day] = [];
      const shifts = ["Morning", "Afternoon", "Evening", "Night"];
      shifts.forEach((shift) => {
        const checkbox = document.getElementById(`${day}-${shift}`);
        if (checkbox && checkbox.checked) {
          schedule[day].push(shift);
        }
      });
    });

    console.log("Saving weekly schedule:", schedule);

    await apiCall("/transporter/schedule/weekly", {
      method: "POST",
      body: JSON.stringify({ weeklySchedule: schedule }),
    });

    appState.weeklySchedule = schedule;
    showMessage("Weekly schedule saved to Firebase!", "success");
  } catch (error) {
    console.error("Error saving weekly schedule:", error);
    showMessage("Error saving weekly schedule", "error");
  }
}

// View Shipment Map
function viewShipmentMap(shipmentId, shipmentType = "customer_shipment") {
  try {
    // Find the shipment in available or assigned shipments
    let shipment = appState.availableShipments.find((s) => s.id === shipmentId);
    if (!shipment) {
      shipment = appState.myShipments.find((s) => s.id === shipmentId);
    }

    if (!shipment) {
      showMessage("Shipment not found", "error");
      return;
    }

    // Extract origin coordinates based on shipment collection type
    let originLat, originLng;

    // Default coordinates (current hardcoded values from mapsRoute.js)
    const DEFAULT_ORIGIN_LAT = 32.0853;
    const DEFAULT_ORIGIN_LNG = 34.7818;

    if (
      shipment.type === "farmer_shipment" ||
      shipment.type === "customer_shipment"
    ) {
      // For farmer_shipments and customer_shipments: use lat/lng directly
      originLat = shipment.lat || DEFAULT_ORIGIN_LAT;
      originLng = shipment.lng || DEFAULT_ORIGIN_LNG;
    } else if (shipment.deliveryAddress) {
      // For orders collection: use deliveryAddress.lat/lng
      originLat = shipment.deliveryAddress.lat || DEFAULT_ORIGIN_LAT;
      originLng = shipment.deliveryAddress.lng || DEFAULT_ORIGIN_LNG;
    } else {
      // Fallback to defaults if no coordinates found
      originLat = DEFAULT_ORIGIN_LAT;
      originLng = DEFAULT_ORIGIN_LNG;
    }

    // Build the map URL with coordinates
    const mapUrl = `mapsRoute.html?originLat=${originLat}&originLng=${originLng}&shipmentId=${shipmentId}&type=${shipmentType}`;

    // Open map in new window/tab
    window.open(
      mapUrl,
      "_blank",
      "width=1000,height=700,scrollbars=yes,resizable=yes"
    );

    showMessage(`Opening map for shipment ${shipmentId}`, "success");
  } catch (error) {
    console.error("Error opening map:", error);
    showMessage("Could not open map", "error");
  }
}

async function acceptShipment(shipmentId, shipmentType = "customer_shipment") {
  try {
    await apiCall(`/transporter/accept-shipment/${shipmentId}`, {
      method: "POST",
      body: JSON.stringify({ shipmentType }),
    });

    showMessage("Shipment accepted!", "success");
    await loadShipments();
  } catch (error) {
    showMessage("Error accepting shipment", "error");
  }
}

async function updateShipmentStatus(
  shipmentId,
  status,
  shipmentType = "customer_shipment"
) {
  try {
    await apiCall(`/transporter/shipment/${shipmentId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, shipmentType }),
    });

    // Update the local state to reflect the new status
    const shipment = appState.myShipments.find((s) => s.id === shipmentId);
    if (shipment) {
      shipment.status = status;
    }

    // Re-render the my shipments section to show/hide the Verify QR button
    renderMyShipments();

    showMessage("Status updated!", "success");
  } catch (error) {
    showMessage("Error updating status", "error");
  }
}

// Toggle standby shift selection
function toggleStandbyShift(dateString) {
  // Check if monthly schedule is locked
  if (appState.isMonthlyLocked) {
    showMessage("Schedule is locked. Contact admin to make changes.", "error");
    return;
  }

  const date = new Date(dateString);
  const today = new Date();

  // Don't allow selection of past dates
  if (date < today) {
    showMessage("Cannot select past dates", "error");
    return;
  }

  const existingIndex = appState.standbyShifts.findIndex(
    (shift) => shift.date === dateString
  );

  if (existingIndex >= 0) {
    // Remove existing standby shift
    appState.standbyShifts.splice(existingIndex, 1);
    showMessage("Standby shift removed", "info");
  } else {
    // Add new standby shift (limit to 10)
    if (appState.standbyShifts.length >= 10) {
      showMessage("Maximum 10 standby shifts allowed", "error");
      return;
    }

    appState.standbyShifts.push({
      date: dateString,
      shift: "Standby",
    });
    showMessage("Standby shift added", "success");
  }

  // Re-render calendar to update visual state
  renderMonthlyCalendar();
}

// Save standby shifts
async function saveStandbyShifts() {
  try {
    console.log("Saving standby shifts:", appState.standbyShifts);

    await apiCall("/transporter/schedule/monthly", {
      method: "POST",
      body: JSON.stringify({
        standbyShifts: appState.standbyShifts,
      }),
    });

    // After successful save, reload schedule to get updated lock status
    await loadSchedule();

    showMessage(
      "Standby shifts saved to Firebase! Schedule is now locked.",
      "success"
    );
  } catch (error) {
    console.error("Error saving standby shifts:", error);
    if (error.message && error.message.includes("already saved")) {
      // Reload to get current lock status
      await loadSchedule();
      showMessage(
        "Schedule is already saved. Contact admin to make changes.",
        "error"
      );
    } else {
      showMessage("Error saving standby shifts", "error");
    }
  }
}

// Problem reporting function
async function reportProblem(shipmentId, shipmentType = "customer_shipment") {
  console.log(
    "Report problem called for shipment:",
    shipmentId,
    "type:",
    shipmentType
  );

  // Simple prompt to get the report message
  const reportMessage = prompt("Please describe the problem:");

  if (!reportMessage || reportMessage.trim() === "") {
    showMessage("Report message is required", "error");
    return;
  }

  try {
    await apiCall(`/transporter/shipment/${shipmentId}/shipmentProblem`, {
      method: "POST",
      body: JSON.stringify({
        message: reportMessage.trim(),
        shipmentType,
      }),
    });

    showMessage("Problem report sent successfully!", "success");
  } catch (error) {
    console.error("Error reporting problem:", error);
    showMessage("Failed to send problem report", "error");
  }
}

// QR Verification functionality
let qrVerificationState = {
  currentShipmentId: null,
  currentShipmentType: null,
  scannedItems: [],
  verifiedItems: [], // Keep both for compatibility
  shipmentData: null,
};

async function verifyQR(shipmentId, shipmentType = "customer_shipment") {
  console.log(
    "Starting QR verification for shipment:",
    shipmentId,
    "type:",
    shipmentType
  );

  try {
    // Initialize QR verification state
    qrVerificationState.currentShipmentId = shipmentId;
    qrVerificationState.currentShipmentType = shipmentType;
    qrVerificationState.scannedItems = [];
    qrVerificationState.verifiedItems = [];

    // Get shipment details to show expected items
    const shipment = await getShipmentDetails(shipmentId, shipmentType);
    qrVerificationState.shipmentData = shipment;

    // Show QR verification modal
    showQRVerificationModal(shipment);
  } catch (error) {
    console.error("Error starting QR verification:", error);
    showMessage("Failed to start QR verification", "error");
  }
}

function showQRVerificationModal(shipment) {
  const modal = document.getElementById("qr-verification-modal");
  const shipmentIdSpan = document.getElementById("qr-shipment-id");
  const expectedContainersSpan = document.getElementById(
    "qr-expected-containers"
  );

  // Populate shipment information
  shipmentIdSpan.textContent = qrVerificationState.currentShipmentId;
  const containerCount = shipment.containers ? shipment.containers.length : 0;
  expectedContainersSpan.textContent = containerCount;

  // Populate QR items list
  populateQRItemsList(shipment);

  // Update verification progress
  updateVerificationProgress();

  // Clear verification result
  hideQRVerificationResult();

  // Show modal
  modal.classList.add("show");

  // Setup event listeners
  setupQRVerificationListeners();
}

function populateQRItemsList(shipment) {
  const itemsList = document.getElementById("qr-items-list");
  if (!itemsList) return;

  let html = "";

  // Add shipment QR item
  html += `
    <div class="qr-item shipment" data-id="${shipment.id}" data-type="shipment">
      <div class="qr-item-info">
        <div class="qr-item-type">Shipment</div>
        <div class="qr-item-id">${shipment.id}</div>
      </div>
      <button class="qr-item-btn" onclick="verifyQRItem('${shipment.id}', 'shipment')">
        Verify QR
      </button>
    </div>
  `;

  // Add container QR items (for farmer shipments)
  if (shipment.containers && shipment.containers.length > 0) {
    shipment.containers.forEach((container) => {
      html += `
        <div class="qr-item container" data-id="${container.code}" data-type="container">
          <div class="qr-item-info">
            <div class="qr-item-type">Container</div>
            <div class="qr-item-id">${container.code}</div>
          </div>
          <button class="qr-item-btn" onclick="verifyQRItem('${container.code}', 'container')">
            Verify QR
          </button>
        </div>
      `;
    });
  }

  // Add individual item QR codes (for new order format customer shipments)
  if (
    shipment.items &&
    shipment.items.length > 0 &&
    shipment.type === "customer_shipment"
  ) {
    shipment.items.forEach((item, index) => {
      // New order format items
      const itemId = item.itemId || `item_${index}`;
      const itemName = item.itemName || `Item ${index + 1}`;
      const quantity = item.quantity || 1;

      html += `
        <div class="qr-item item" data-id="${itemId}" data-type="item">
          <div class="qr-item-info">
            <div class="qr-item-type">Item</div>
            <div class="qr-item-id">${itemName} (${quantity} units)</div>
          </div>
          <button class="qr-item-btn" onclick="verifyQRItem('${itemId}', 'item')">
            Verify QR
          </button>
        </div>
      `;
    });
  }

  itemsList.innerHTML = html;
}

async function verifyQRItem(itemId, itemType) {
  console.log(`Verifying QR for ${itemType}:`, itemId);

  try {
    // Find the QR code for this item
    let qrCode = null;

    if (itemType === "shipment") {
      qrCode =
        qrVerificationState.shipmentData.qrcode ||
        qrVerificationState.shipmentData.qrCode;
    } else if (itemType === "container") {
      const container = qrVerificationState.shipmentData.containers?.find(
        (c) => c.code === itemId
      );
      qrCode = container?.qrcode || container?.qrCode;
    } else if (itemType === "item") {
      const item = qrVerificationState.shipmentData.items?.find(
        (i) => i.itemId === itemId
      );
      qrCode = item?.qrCode || item?.qrcode;
    }

    if (!qrCode) {
      showMessage(`No QR code found for ${itemType} ${itemId}`, "error");
      return;
    }

    // Decode QR code to get the ID
    const decodedId = await decodeQRFromDataURL(qrCode);

    // Verify the decoded ID matches the expected ID
    if (decodedId === itemId) {
      // Add to verified items
      addVerifiedItem(itemId, itemType);
      showMessage(
        `${
          itemType.charAt(0).toUpperCase() + itemType.slice(1)
        } QR verified successfully`,
        "success"
      );
    } else {
      showMessage(
        `QR code mismatch for ${itemType} ${itemId}. Expected: ${itemId}, Got: ${decodedId}`,
        "error"
      );
    }
  } catch (error) {
    console.error(`Error verifying QR for ${itemType} ${itemId}:`, error);
    showMessage(`Failed to verify QR code for ${itemType} ${itemId}`, "error");
  }
}

function addVerifiedItem(itemId, itemType) {
  // Check if already verified
  const existingIndex = qrVerificationState.scannedItems.findIndex(
    (item) => item.id === itemId && item.type === itemType
  );

  if (existingIndex === -1) {
    qrVerificationState.scannedItems.push({ id: itemId, type: itemType });
  }

  // Update UI
  markItemAsVerified(itemId, itemType);
  updateVerificationProgress();
  updateVerifyAllButton();
}

function markItemAsVerified(itemId, itemType) {
  const itemElement = document.querySelector(
    `[data-id="${itemId}"][data-type="${itemType}"]`
  );
  if (itemElement) {
    itemElement.classList.add("verified");
    const button = itemElement.querySelector(".qr-item-btn");
    button.textContent = "✓ Verified";
    button.disabled = true;
  }
}

function updateVerificationProgress() {
  const verifiedCount = qrVerificationState.scannedItems.length;
  const totalCount = getTotalExpectedItems();

  document.getElementById("verified-count").textContent = verifiedCount;
  document.getElementById("total-count").textContent = totalCount;

  // Update verified items display
  const verifiedItemsContainer = document.getElementById("verified-items");
  let html = "";

  qrVerificationState.scannedItems.forEach((item) => {
    html += `
      <div class="verified-item">
        <div class="verified-item-info">
          <div class="verified-item-type">${item.type}</div>
          <div class="verified-item-id">${item.id}</div>
        </div>
        <div class="verified-checkmark">✓</div>
      </div>
    `;
  });

  verifiedItemsContainer.innerHTML =
    html || '<p class="info-text">No items verified yet.</p>';
}

function getTotalExpectedItems() {
  let total = 1; // Shipment

  // Add containers for farmer shipments
  if (qrVerificationState.shipmentData?.containers) {
    total += qrVerificationState.shipmentData.containers.length;
  }

  // Add individual items for customer shipments (from orders collection only)
  if (
    qrVerificationState.shipmentData?.items &&
    qrVerificationState.shipmentData?.type === "customer_shipment"
  ) {
    total += qrVerificationState.shipmentData.items.length;
  }

  return total;
}

function updateVerifyAllButton() {
  const verifyAllBtn = document.getElementById("verify-all-btn");
  const verifiedCount = qrVerificationState.scannedItems.length;
  const totalCount = getTotalExpectedItems();

  verifyAllBtn.disabled = verifiedCount === 0;

  if (verifiedCount === totalCount) {
    verifyAllBtn.textContent = "All Items Verified - Submit";
    verifyAllBtn.className = "btn-primary";
  } else {
    verifyAllBtn.textContent = `Verify All Codes (${verifiedCount}/${totalCount})`;
    verifyAllBtn.className = verifiedCount > 0 ? "btn-primary" : "btn-primary";
  }
}

function setupQRVerificationListeners() {
  // Close modal
  document.getElementById("qr-modal-close").onclick = closeQRVerificationModal;

  // Clear all button
  document.getElementById("clear-verified-btn").onclick = clearAllVerified;

  // Verify all button
  document.getElementById("verify-all-btn").onclick = verifyAllQRCodes;

  // Close modal when clicking outside
  window.onclick = function (event) {
    const modal = document.getElementById("qr-verification-modal");
    if (event.target === modal) {
      closeQRVerificationModal();
    }
  };
}

function closeQRVerificationModal() {
  const modal = document.getElementById("qr-verification-modal");
  modal.classList.remove("show");
  qrVerificationState = {
    currentShipmentId: null,
    currentShipmentType: null,
    scannedItems: [],
    verifiedItems: [],
    shipmentData: null,
  };
}

function clearAllVerified() {
  qrVerificationState.scannedItems = [];
  qrVerificationState.verifiedItems = [];

  // Reset all item buttons
  document.querySelectorAll(".qr-item").forEach((item) => {
    item.classList.remove("verified");
    const button = item.querySelector(".qr-item-btn");
    button.textContent = "Verify QR";
    button.disabled = false;
  });

  updateVerificationProgress();
  updateVerifyAllButton();
  hideQRVerificationResult();
}

async function verifyAllQRCodes() {
  const verifyAllBtn = document.getElementById("verify-all-btn");

  try {
    verifyAllBtn.disabled = true;
    verifyAllBtn.textContent = "Verifying...";

    // Prepare the array of verified IDs
    const verifiedIds = qrVerificationState.scannedItems.map((item) => item.id);

    console.log("Sending verification request for IDs:", verifiedIds);

    // Send to backend for verification
    const response = await fetch(
      `/api/transporter/shipments/${qrVerificationState.currentShipmentId}/verify-qr`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          verifiedIds: verifiedIds,
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      showQRVerificationResult(result, true);
      showMessage("QR verification completed successfully!", "success");

      // Update shipment status in the UI
      if (result.message?.includes("Verified")) {
        await refreshMyShipments();
      }
    } else {
      showQRVerificationResult(result, false);
      showMessage(result.error || "QR verification failed", "error");
    }
  } catch (error) {
    console.error("Error during QR verification:", error);
    showMessage("Failed to verify QR codes", "error");
    showQRVerificationResult({ error: error.message }, false);
  } finally {
    updateVerifyAllButton();
  }
}

// Simulate QR decoding (in real implementation, this would use a QR library)
async function decodeQRFromDataURL(dataURL) {
  // For now, simulate decoding by extracting the ID from the data URL
  // In a real implementation, you would use a QR code reading library

  // This is a simulation - in reality you'd decode the actual QR image
  // For testing purposes, let's assume the QR code contains the ID we expect

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate extraction of ID from QR code
      // This is where you would use an actual QR decoder
      try {
        // For simulation, we'll use prompt to get the decoded value
        const decodedValue = prompt(
          "QR Code detected. Please enter the decoded ID from the QR code:"
        );
        if (decodedValue) {
          resolve(decodedValue.trim());
        } else {
          reject(new Error("No QR code value provided"));
        }
      } catch (error) {
        reject(error);
      }
    }, 500);
  });
}

async function decodeQRFromDataURL(dataURL) {
  // This would require a QR code reader library
  // For now, we'll simulate extraction by asking user to input the decoded value
  const decodedText = prompt(
    "QR code detected. Please enter the decoded text (shipment ID or container code):"
  );
  if (!decodedText) {
    throw new Error("No decoded text provided");
  }
  return decodedText;
}

function addScannedItem(text) {
  // Determine if it's a shipment ID or container code
  const isShipmentId =
    text === qrVerificationState.currentShipmentId ||
    text.startsWith("FARM_SHIP_") ||
    text.length > 10;

  const itemType = isShipmentId ? "shipment" : "container";

  // Check if already scanned
  const alreadyScanned = qrVerificationState.scannedItems.find(
    (item) => item.id === text
  );
  if (alreadyScanned) {
    showMessage("This item has already been scanned", "warning");
    return;
  }

  // Add to scanned items
  qrVerificationState.scannedItems.push({
    id: text,
    type: itemType,
    timestamp: new Date(),
  });

  updateScannedItemsDisplay();
  updateVerifyButton();

  showMessage(
    `${itemType === "shipment" ? "Shipment" : "Container"} scanned: ${text}`,
    "success"
  );
}

function updateScannedItemsDisplay() {
  const container = document.getElementById("scanned-items");

  if (qrVerificationState.scannedItems.length === 0) {
    container.innerHTML =
      '<p class="info-text">No items scanned yet. Scan the shipment QR code first, then container QR codes.</p>';
    return;
  }

  const itemsHTML = qrVerificationState.scannedItems
    .map(
      (item) => `
    <div class="scanned-item ${item.type}">
      <div class="scanned-item-info">
        <div class="scanned-item-type">${item.type}</div>
        <div class="scanned-item-id">${item.id}</div>
      </div>
      <button class="remove-scanned" onclick="removeScannedItem('${item.id}')">Remove</button>
    </div>
  `
    )
    .join("");

  container.innerHTML = itemsHTML;
}

function removeScannedItem(itemId) {
  qrVerificationState.scannedItems = qrVerificationState.scannedItems.filter(
    (item) => item.id !== itemId
  );
  updateScannedItemsDisplay();
  updateVerifyButton();
}

function clearAllScanned() {
  qrVerificationState.scannedItems = [];
  updateScannedItemsDisplay();
  updateVerifyButton();
  hideQRVerificationResult();
}

function updateVerifyButton() {
  const verifyBtn = document.getElementById("verify-all-btn");
  const hasShipment = qrVerificationState.scannedItems.some(
    (item) => item.type === "shipment"
  );
  const hasContainers = qrVerificationState.scannedItems.some(
    (item) => item.type === "container"
  );

  verifyBtn.disabled = !(hasShipment && hasContainers);
}

async function verifyAllQRCodes() {
  try {
    const verifyBtn = document.getElementById("verify-all-btn");
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    // Prepare data for backend
    const scannedIds = qrVerificationState.scannedItems.map((item) => item.id);

    const response = await fetch(
      `${API_BASE_URL}/transporter/shipments/${qrVerificationState.currentShipmentId}/verify-qr`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          scannedIds: scannedIds,
          shipmentType: qrVerificationState.currentShipmentType,
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      showQRVerificationResult(result);
    } else {
      throw new Error(result.error || "Verification failed");
    }
  } catch (error) {
    console.error("Error verifying QR codes:", error);
    showMessage("Failed to verify QR codes: " + error.message, "error");
  } finally {
    const verifyBtn = document.getElementById("verify-all-btn");
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify All Codes";
  }
}

function showQRVerificationResult(result) {
  const resultDiv = document.getElementById("qr-verification-result");
  const isSuccess = result.verificationPassed;

  resultDiv.className = `qr-result ${isSuccess ? "success" : "error"}`;

  let html = `
    <h4>${
      isSuccess ? "✅ Verification Successful" : "❌ Verification Failed"
    }</h4>
    <p><strong>Message:</strong> ${result.message}</p>
  `;

  if (result.summary) {
    html += `
      <div class="verification-details">
        <p><strong>Total Expected:</strong> ${result.totalExpected}</p>
        <p><strong>Total Scanned:</strong> ${result.totalScanned}</p>
        <p><strong>Valid IDs:</strong> ${result.summary.validIds}</p>
        <p><strong>Invalid IDs:</strong> ${result.summary.invalidIds}</p>
    `;

    if (result.summary.missingIds && result.summary.missingIds.length > 0) {
      html += `<p><strong>Missing IDs:</strong> ${result.summary.missingIds.join(
        ", "
      )}</p>`;
    }

    if (result.summary.extraIds && result.summary.extraIds.length > 0) {
      html += `<p><strong>Extra IDs:</strong> ${result.summary.extraIds.join(
        ", "
      )}</p>`;
    }

    html += `</div>`;
  }

  // Show verification results if available
  if (result.verificationResults && Array.isArray(result.verificationResults)) {
    html += `
      <div class="verification-details">
        <h5>Detailed Results:</h5>
        <ul>
    `;

    result.verificationResults.forEach((item) => {
      const status = item.valid ? "✅" : "❌";
      html += `<li>${status} ${item.id} (${item.type}) - ${
        item.valid ? "Valid" : "Invalid"
      }</li>`;
    });

    html += `
        </ul>
      </div>
    `;
  }

  resultDiv.innerHTML = html;
  resultDiv.classList.remove("hidden");

  if (isSuccess) {
    showMessage("QR verification completed successfully!", "success");
    // Refresh shipments to show updated status
    setTimeout(() => {
      loadMyShipments();
    }, 2000);
  }
}

function hideQRVerificationResult() {
  document.getElementById("qr-verification-result").classList.add("hidden");
}

async function getShipmentDetails(shipmentId, shipmentType) {
  try {
    // Transporters should always use the my-shipments endpoint to get shipment details
    const response = await fetch(`${API_BASE_URL}/transporter/my-shipments`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Find the specific shipment in the transporter's assigned shipments
      const shipment = data.shipments?.find((s) => s.id === shipmentId);
      return shipment || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting shipment details:", error);
    return null;
  }
}

// ========================
// VEHICLE LOADING VISUALIZATION
// ========================

// Vehicle configurations
const vehicleConfigs = {
  bicycle: {
    title: "🚲 Electric Bicycle",
    emoji: "🚲",
    color: "#28a745",
    cargoWidth: "30%",
    maxPackages: 6,
  },
  scooter: {
    title: "🛵 Scooter",
    emoji: "🛴",
    color: "#007bff",
    cargoWidth: "35%",
    maxPackages: 8,
  },
  car: {
    title: "🚗 Small Car",
    emoji: "🚙",
    color: "#dc3545",
    cargoWidth: "45%",
    maxPackages: 12,
  },
  van: {
    title: "🚐 Van",
    emoji: "🚐",
    color: "#fd7e14",
    cargoWidth: "65%",
    maxPackages: 20,
  },
  truck: {
    title: "🚛 Truck",
    emoji: "🚚",
    color: "#6f42c1",
    cargoWidth: "70%",
    maxPackages: 28,
  },
};

function setupVehicleLoadingListeners() {
  const toggleBtn = document.getElementById("toggle-loading-viz");
  const closeBtn = document.getElementById("close-loading-viz");
  const floatBox = document.getElementById("vehicle-loading-float");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      toggleVehicleLoadingVisibility();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      hideVehicleLoading();
    });
  }
}

function toggleVehicleLoadingVisibility() {
  const floatBox = document.getElementById("vehicle-loading-float");
  if (appState.vehicleLoading.isVisible) {
    hideVehicleLoading();
  } else {
    showVehicleLoading();
  }
}

function showVehicleLoading() {
  const floatBox = document.getElementById("vehicle-loading-float");
  floatBox.classList.remove("hidden");
  appState.vehicleLoading.isVisible = true;
  updateVehicleLoading();
}

function hideVehicleLoading() {
  const floatBox = document.getElementById("vehicle-loading-float");
  floatBox.classList.add("hidden");
  appState.vehicleLoading.isVisible = false;
}

async function updateVehicleLoading() {
  try {
    // Check if vehicle loading elements exist
    if (!document.getElementById("vehicle-loading-float")) {
      console.log("Vehicle loading elements not found, skipping update");
      return;
    }

    // Get vehicle capacity (both weight and volume) from deliverer profile
    await getVehicleCapacity();

    // Calculate current weight and volume from assigned shipments
    const currentWeight = calculateCurrentWeight();
    const currentVolume = calculateCurrentVolume();

    // Calculate loading percentages for both weight and volume
    const weightPercentage =
      appState.vehicleLoading.vehicleCapacity > 0
        ? Math.min(
            (currentWeight / appState.vehicleLoading.vehicleCapacity) * 100,
            100
          )
        : 0;

    const volumePercentage =
      appState.vehicleLoading.vehicleVolumeCapacity > 0
        ? Math.min(
            (currentVolume / appState.vehicleLoading.vehicleVolumeCapacity) *
              100,
            100
          )
        : 0;

    // Use the maximum percentage as the limiting factor
    const loadingPercentage = Math.max(weightPercentage, volumePercentage);

    // Update state
    appState.vehicleLoading.currentWeight = currentWeight;
    appState.vehicleLoading.currentVolume = currentVolume;
    appState.vehicleLoading.loadingPercentage = loadingPercentage;

    console.log(
      `Loading calculation - Weight: ${weightPercentage.toFixed(
        1
      )}%, Volume: ${volumePercentage.toFixed(
        1
      )}%, Final: ${loadingPercentage.toFixed(1)}%`
    );

    // Update visualization
    updateVehicleVisualization();
  } catch (error) {
    console.error("Error updating vehicle loading:", error);
  }
}

async function getVehicleCapacity() {
  try {
    // Get vehicle capacity from deliverer profile
    if (appState.profile && appState.profile.vehicleCapacity) {
      appState.vehicleLoading.vehicleCapacity =
        appState.profile.vehicleCapacity;

      // Get volume capacity from extraFields
      if (appState.profile.extraFields && appState.profile.extraFields.volume) {
        appState.vehicleLoading.vehicleVolumeCapacity =
          appState.profile.extraFields.volume;
        console.log(
          "Set vehicle volume capacity from extraFields:",
          appState.profile.extraFields.volume
        );
      }

      // Determine vehicle type
      const vehicleType = determineVehicleType(appState.profile.vehicleType);
      appState.vehicleLoading.vehicleType = vehicleType;
    } else {
      // Fallback: try to get from API
      const response = await apiCall("/transporter/profile");
      if (response.success && response.profile) {
        appState.vehicleLoading.vehicleCapacity =
          response.profile.vehicleCapacity || 0;

        // Get volume capacity from extraFields
        if (
          response.profile.extraFields &&
          response.profile.extraFields.volume
        ) {
          appState.vehicleLoading.vehicleVolumeCapacity =
            response.profile.extraFields.volume;
          console.log(
            "Set vehicle volume capacity from API extraFields:",
            response.profile.extraFields.volume
          );
        }

        const vehicleType = determineVehicleType(response.profile.vehicleType);
        appState.vehicleLoading.vehicleType = vehicleType;
      }
    }
  } catch (error) {
    console.error("Error getting vehicle capacity:", error);
    appState.vehicleLoading.vehicleCapacity = 0;
    appState.vehicleLoading.vehicleVolumeCapacity = 0;
  }
}

function determineVehicleType(profileVehicleType) {
  if (!profileVehicleType) return "bicycle";

  const vehicleType = profileVehicleType.toLowerCase();
  const availableTypes = Object.keys(vehicleConfigs);

  // Check if the profile vehicle type matches any of our available types
  for (const type of availableTypes) {
    if (vehicleType.includes(type)) {
      return type;
    }
  }

  // Check for common variations
  if (vehicleType.includes("bike") || vehicleType.includes("cycle")) {
    return "bicycle";
  }
  if (vehicleType.includes("scooter") || vehicleType.includes("moped")) {
    return "scooter";
  }
  if (vehicleType.includes("car") || vehicleType.includes("sedan")) {
    return "car";
  }
  if (vehicleType.includes("van") || vehicleType.includes("delivery")) {
    return "van";
  }
  if (vehicleType.includes("truck") || vehicleType.includes("lorry")) {
    return "truck";
  }

  // Default to bicycle if no match
  return "bicycle";
}

function calculateCurrentWeight() {
  if (!appState.myShipments || appState.myShipments.length === 0) {
    console.log("No assigned shipments found");
    return 0;
  }

  let totalWeight = 0;
  console.log(
    "Calculating weight for",
    appState.myShipments.length,
    "shipments"
  );

  appState.myShipments.forEach((shipment, index) => {
    console.log(`Shipment ${index + 1}:`, shipment);

    let shipmentWeight = 0;

    if (shipment.type === "farmer_shipment") {
      // Handle farmer shipments - use the shipment-level totalWeight
      const shipmentTotalWeight = parseFloat(shipment.totalWeight) || 0;
      shipmentWeight = shipmentTotalWeight;
      console.log(`  Farmer shipment total weight: ${shipmentTotalWeight}kg`);
    } else {
      // Handle customer shipments
      if (shipment.items && Array.isArray(shipment.items)) {
        shipment.items.forEach((item) => {
          // Just get the weight without multiplying by quantity/amount
          const weight =
            parseFloat(item.weight) ||
            parseFloat(item.totalWeight) ||
            parseFloat(item.weightKg) ||
            0;
          shipmentWeight += weight;
          console.log(
            `  Item: ${
              item.item || item.name
            } = ${weight}kg (no quantity multiplication)`
          );
        });
      }

      // Fallback to shipment-level weight
      if (shipmentWeight === 0) {
        shipmentWeight =
          parseFloat(shipment.weight) ||
          parseFloat(shipment.totalWeight) ||
          parseFloat(shipment.weightKg) ||
          0;
        if (shipmentWeight > 0) {
          console.log(`  Shipment total weight: ${shipmentWeight}kg`);
        }
      }
    }

    totalWeight += shipmentWeight;
    console.log(`  Shipment ${index + 1} total: ${shipmentWeight}kg`);
  });

  const roundedWeight = Math.round(totalWeight * 100) / 100;
  console.log("Total calculated weight:", roundedWeight, "kg");
  return roundedWeight;
}

function calculateCurrentVolume() {
  if (!appState.myShipments || appState.myShipments.length === 0) {
    console.log("No assigned shipments found for volume calculation");
    return 0;
  }

  let totalVolume = 0;
  console.log(
    "Calculating volume for",
    appState.myShipments.length,
    "shipments"
  );

  appState.myShipments.forEach((shipment, index) => {
    console.log(`Shipment ${index + 1} volume:`, shipment);

    let shipmentVolume = 0;

    if (shipment.type === "farmer_shipment") {
      // For farmer shipments, use the shipment-level totalVolume
      const shipmentTotalVolume = parseFloat(shipment.totalVolume) || 0;
      shipmentVolume = shipmentTotalVolume;
      console.log(`  Farmer shipment total volume: ${shipmentTotalVolume}`);
    } else {
      // Handle customer shipments - use the volume field
      if (shipment.volume) {
        shipmentVolume = parseFloat(shipment.volume) || 0;
        console.log(`  Customer shipment volume: ${shipmentVolume}`);
      } else if (shipment.items && Array.isArray(shipment.items)) {
        // Fallback: check if items have individual volume data
        shipment.items.forEach((item) => {
          const volume = parseFloat(item.volume) || 0;
          shipmentVolume += volume;
          console.log(`  Item: ${item.item || item.name} = ${volume} volume`);
        });
      }

      // Fallback to shipment-level volume fields
      if (shipmentVolume === 0) {
        shipmentVolume = parseFloat(shipment.totalVolume) || 0;
        if (shipmentVolume > 0) {
          console.log(`  Shipment total volume: ${shipmentVolume}`);
        }
      }
    }

    totalVolume += shipmentVolume;
    console.log(`  Shipment ${index + 1} total volume: ${shipmentVolume}`);
  });

  const roundedVolume = Math.round(totalVolume * 100) / 100;
  console.log("Total calculated volume:", roundedVolume);
  return roundedVolume;
}

function updateVehicleVisualization() {
  // Check if vehicle loading elements exist
  const vehicleTitle = document.getElementById("vehicle-title");
  const vehicleImage = document.getElementById("vehicle-image");
  const cargoArea = document.getElementById("cargo-area");
  const currentWeight = document.getElementById("current-weight");
  const vehicleCapacity = document.getElementById("vehicle-capacity");
  const currentVolume = document.getElementById("current-volume");
  const vehicleVolumeCapacity = document.getElementById(
    "vehicle-volume-capacity"
  );
  const loadingPercentage = document.getElementById("loading-percentage");

  if (
    !vehicleTitle ||
    !vehicleImage ||
    !cargoArea ||
    !currentWeight ||
    !vehicleCapacity ||
    !loadingPercentage
  ) {
    console.log("Vehicle visualization elements not found, skipping update");
    return;
  }

  const config = vehicleConfigs[appState.vehicleLoading.vehicleType];
  const percentage = appState.vehicleLoading.loadingPercentage;

  // Update vehicle title and image
  vehicleTitle.textContent = config.title;
  vehicleImage.textContent = config.emoji;
  vehicleImage.style.color = config.color;

  // Update cargo area width
  cargoArea.style.width = config.cargoWidth;

  // Update weight stats
  currentWeight.textContent = `${appState.vehicleLoading.currentWeight} kg`;
  vehicleCapacity.textContent = `${appState.vehicleLoading.vehicleCapacity} kg`;

  // Update volume stats (if elements exist)
  if (currentVolume) {
    currentVolume.textContent = `${appState.vehicleLoading.currentVolume}`;
  }
  if (vehicleVolumeCapacity) {
    vehicleVolumeCapacity.textContent = `${appState.vehicleLoading.vehicleVolumeCapacity}`;
  }

  // Update loading percentage
  loadingPercentage.textContent = `${Math.round(percentage)}%`;

  // Update packages visualization
  updatePackagesVisualization(config.maxPackages, percentage);

  // Update status
  updateLoadingStatus(percentage);
}

function updatePackagesVisualization(maxPackages, percentage) {
  const cargoArea = document.getElementById("cargo-area");
  cargoArea.innerHTML = "";

  const numPackages = Math.floor((percentage / 100) * maxPackages);

  for (let i = 0; i < numPackages; i++) {
    const packageElement = document.createElement("div");
    packageElement.className = "package";
    packageElement.style.animationDelay = `${i * 0.1}s`;
    cargoArea.appendChild(packageElement);
  }
}

function updateLoadingStatus(percentage) {
  const statusElement = document.getElementById("loading-status");

  if (!statusElement) {
    console.log("Loading status element not found, skipping status update");
    return;
  }

  // Calculate individual percentages to determine limiting factor
  const weightPercentage =
    appState.vehicleLoading.vehicleCapacity > 0
      ? (appState.vehicleLoading.currentWeight /
          appState.vehicleLoading.vehicleCapacity) *
        100
      : 0;

  const volumePercentage =
    appState.vehicleLoading.vehicleVolumeCapacity > 0
      ? (appState.vehicleLoading.currentVolume /
          appState.vehicleLoading.vehicleVolumeCapacity) *
        100
      : 0;

  // Determine limiting factor
  const limitingFactor =
    weightPercentage > volumePercentage ? "weight" : "volume";
  const isWeightLimiting = weightPercentage >= volumePercentage;

  // Remove all status classes
  statusElement.className = "status-text";

  if (percentage < 20) {
    statusElement.classList.add("status-empty");
    statusElement.textContent = "Empty - Ready for packages";
  } else if (percentage < 40) {
    statusElement.classList.add("status-little");
    statusElement.textContent = `Lightly loaded - Limited by ${limitingFactor}`;
  } else if (percentage < 60) {
    statusElement.classList.add("status-more");
    statusElement.textContent = `Moderately loaded - ${limitingFactor} constraint`;
  } else if (percentage < 80) {
    statusElement.classList.add("status-much");
    statusElement.textContent = `Well loaded - ${limitingFactor} approaching limit`;
  } else {
    statusElement.classList.add("status-full");
    if (isWeightLimiting) {
      statusElement.textContent =
        "Weight capacity reached - Ready for delivery!";
    } else {
      statusElement.textContent =
        "Volume capacity reached - Ready for delivery!";
    }
  }
}

// Real-time updates
function startRealTimeUpdates() {
  // Poll for updates every 30 seconds
  setInterval(async () => {
    try {
      if (currentTab === "shipments") {
        await loadShipments();
        // Update vehicle loading when shipments change
        await updateVehicleLoading();
      }
    } catch (error) {
      console.error("Error in real-time update:", error);
    }
  }, 30000);
}

// ===========================================
// FLOATING NOTIFICATION SYSTEM
// ===========================================

// Notification state
const notificationState = {
  isVisible: false,
  isEnabled: true,
  lastShipmentCount: 0,
  currentNotification: null,
};

// Initialize notification system
function initializeNotificationSystem() {
  const toggleBtn = document.getElementById("notification-toggle");
  const notificationBox = document.getElementById("floating-notification");
  const closeBtn = document.getElementById("notification-close");
  const viewBtn = document.getElementById("notification-view");
  const acceptBtn = document.getElementById("notification-accept");

  // Toggle button functionality
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleNotifications);
  }

  // Close button functionality
  if (closeBtn) {
    closeBtn.addEventListener("click", hideNotification);
  }

  // View details button
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      if (notificationState.currentNotification) {
        showShipmentModal(notificationState.currentNotification);
        hideNotification();
      }
    });
  }

  // Accept button functionality
  if (acceptBtn) {
    acceptBtn.addEventListener("click", async () => {
      if (notificationState.currentNotification) {
        await acceptShipment(notificationState.currentNotification.id);
        hideNotification();
        // Show success animation
        showSuccessNotification("Shipment accepted successfully!");
      }
    });
  }

  // Initialize with current shipment count
  if (appState.availableShipments) {
    notificationState.lastShipmentCount = appState.availableShipments.length;
  }
}

// Toggle notification system on/off
function toggleNotifications() {
  const toggleBtn = document.getElementById("notification-toggle");
  notificationState.isEnabled = !notificationState.isEnabled;

  if (notificationState.isEnabled) {
    toggleBtn.classList.add("active");
    toggleBtn.innerHTML = "🔔 Notifications ON";
    showInfoNotification("Notifications enabled!");
  } else {
    toggleBtn.classList.remove("active");
    toggleBtn.innerHTML = "🔕 Notifications OFF";
    hideNotification();
    showInfoNotification("Notifications disabled!");
  }
}

// Show notification with shipment data
function showNewShipmentNotification(shipment) {
  if (!notificationState.isEnabled) return;

  const notificationBox = document.getElementById("floating-notification");
  if (!notificationBox) return;

  // Store current notification data
  notificationState.currentNotification = shipment;

  // Update notification content
  updateNotificationContent(shipment);

  // Show notification with animation
  notificationBox.classList.remove("hidden");
  notificationBox.classList.add("pulse");

  setTimeout(() => {
    notificationBox.classList.add("show");
  }, 100);

  // Remove pulse animation after completion
  setTimeout(() => {
    notificationBox.classList.remove("pulse");
  }, 1000);

  notificationState.isVisible = true;

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (notificationState.isVisible) {
      hideNotification();
    }
  }, 10000);
}

// Update notification content with shipment data
function updateNotificationContent(shipment) {
  const shipmentId = document.getElementById("notif-shipment-id");
  const shipmentType = document.getElementById("notif-shipment-type");
  const shipmentDistance = document.getElementById("notif-shipment-distance");

  if (shipmentId) {
    shipmentId.textContent = shipment.id || "N/A";
  }

  if (shipmentType) {
    const type = shipment.type || "Standard";
    shipmentType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  }

  if (shipmentDistance) {
    // Calculate or use provided distance
    const distance =
      shipment.distance || calculateDistance(shipment) || "Unknown";
    shipmentDistance.textContent =
      typeof distance === "number" ? `${distance} km` : distance;
  }
}

// Calculate distance (placeholder function)
function calculateDistance(shipment) {
  // This would normally calculate distance based on pickup/delivery locations
  // For now, return a random distance for demonstration
  return Math.floor(Math.random() * 50) + 5;
}

// Hide notification
function hideNotification() {
  const notificationBox = document.getElementById("floating-notification");
  if (!notificationBox) return;

  notificationBox.classList.remove("show");
  notificationBox.classList.remove("pulse");

  setTimeout(() => {
    notificationBox.classList.add("hidden");
    notificationState.isVisible = false;
    notificationState.currentNotification = null;
  }, 400);
}

// Show success notification
function showSuccessNotification(message) {
  const notificationBox = document.getElementById("floating-notification");
  if (!notificationBox) return;

  // Temporarily change content for success message
  const title = notificationBox.querySelector(".notification-title h4");
  const subtitle = notificationBox.querySelector(".notification-subtitle");
  const originalTitle = title.textContent;
  const originalSubtitle = subtitle.textContent;

  title.textContent = "Success!";
  subtitle.textContent = message;

  notificationBox.classList.add("success");
  notificationBox.classList.remove("hidden");
  notificationBox.classList.add("show");

  setTimeout(() => {
    notificationBox.classList.remove("show");
    notificationBox.classList.remove("success");
    setTimeout(() => {
      notificationBox.classList.add("hidden");
      // Restore original content
      title.textContent = originalTitle;
      subtitle.textContent = originalSubtitle;
    }, 400);
  }, 3000);
}

// Show info notification
function showInfoNotification(message) {
  // Create temporary notification element
  const infoNotification = document.createElement("div");
  infoNotification.className = "floating-notification show";
  infoNotification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 300px;
    z-index: 1001;
    transition: all 0.3s ease;
  `;

  infoNotification.innerHTML = `
    <div class="notification-container">
      <div class="notification-header">
        <div class="notification-icon">ℹ️</div>
        <div class="notification-title">
          <h4>Info</h4>
          <span class="notification-subtitle">${message}</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(infoNotification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    infoNotification.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(infoNotification);
    }, 300);
  }, 3000);
}

// Check for new shipments and trigger notifications
function checkForNewShipments() {
  if (!notificationState.isEnabled) return;

  const currentCount = appState.availableShipments.length;

  // If there are more shipments than before, show notification for the newest one
  if (currentCount > notificationState.lastShipmentCount && currentCount > 0) {
    const newestShipment = appState.availableShipments[0]; // Assuming newest is first
    showNewShipmentNotification(newestShipment);
  }

  notificationState.lastShipmentCount = currentCount;
}

// Enhanced loadShipments function to include notification checking
const originalLoadShipments = loadShipments;
loadShipments = async function () {
  const previousCount = appState.availableShipments.length;

  // Call original function
  await originalLoadShipments();

  // Check for new shipments only if we had data before
  if (previousCount >= 0) {
    checkForNewShipments();
  }
};

// Make functions globally available
window.showTab = showTab;
window.acceptShipment = acceptShipment;
window.updateShipmentStatus = updateShipmentStatus;
window.toggleStandbyShift = toggleStandbyShift;
window.showShipmentModal = showShipmentModal;
window.acceptShipmentFromModal = acceptShipmentFromModal;
window.updateShipmentStatusFromModal = updateShipmentStatusFromModal;
window.closeShipmentModal = closeShipmentModal;
window.verifyQR = verifyQR;
window.verifyQRItem = verifyQRItem;
window.reportProblem = reportProblem;

// Notification system functions
window.toggleNotifications = toggleNotifications;
window.showNewShipmentNotification = showNewShipmentNotification;
window.hideNotification = hideNotification;
