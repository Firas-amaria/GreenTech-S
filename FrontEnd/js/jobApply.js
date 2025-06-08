
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initSchedule, getScheduleData } from "./schedule.js"; // schedule widget helpers
import { auth, getCurrentUserToken  } from "./firebase-init.js";




async function getCurrentUserProfile() {
  const token = await getCurrentUserToken();
  if (!token) return null;

  console.log(token)

  try {
    const res = await fetch("http://localhost:4000/api/user/profile", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Not authenticated");
    console.log(res)
    return await res.json();
  } catch (err) {
    console.warn("getCurrentUserProfile error:", err);
    return null;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  // --- Prefill name/email if logged in via backend API ---
  const userProfile = await getCurrentUserProfile();
  if (userProfile) {
    document.querySelectorAll(".panel").forEach((panel) => {
      const nameInput = panel.querySelector('input[name="fullName"]');
      if (nameInput) nameInput.value = userProfile.fullName || "";

      const emailInput = panel.querySelector('input[name="email"]');
      if (emailInput) emailInput.value = userProfile.email || "";
    });
  }

  // --- DOM references ---
  const positionList = document.getElementById("positionList");
  const jobInfo = document.getElementById("job-info");
  const jobTitle = document.getElementById("job-info-title");
  const jobDesc = document.getElementById("job-info-desc");
  const applyBtn = document.getElementById("apply-btn");
  const authModal = document.getElementById("auth-modal");
  const jobForm = document.getElementById("job-form");
  const positionSel = document.getElementById("position");
  const extraFields = document.getElementById("extra-fields");
  const errorMsg = document.getElementById("job-error-message");

  let selectedRole = null;

  // --- List of positions ---
  const positions = [
    {
      displayName: "Farmer",
      role: "Farmer",
      description: "Grow crops and raise livestock on our partner farms.",
    },
    {
      displayName: "Delivery Driver",
      role: "Driver",
      description: "Transport fresh produce to customers safely and on time.",
    },
    {
      displayName: "Industrial Truck Driver",
      role: "Industrial",
      description: "Operate and maintain heavy-duty delivery vehicles.",
    },
    {
      displayName: "Warehouse Worker",
      role: "WarehouseWorker",
      description: "Manage inventory, sorting and storing incoming goods.",
    },
    {
      displayName: "Picker",
      role: "Picker",
      description: "Select produce items according to quality standards.",
    },
  ];

  // --- 1) Populate the list of jobs ---
  positions.forEach(({ displayName, role }) => {
    const li = document.createElement("li");
    li.textContent = displayName;
    li.dataset.role = role;
    li.addEventListener("click", () => {
      // Highlight selected item
      document
        .querySelectorAll("#position-list li")
        .forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      jobDescription(role);
    });
    positionList.appendChild(li);
  });


  // --- 2) Show description + Apply button ---
  function jobDescription(role) {
    const pos = positions.find((p) => p.role === role);
    if (!pos) return;
    selectedRole = role;

    jobTitle.textContent = pos.displayName;
    jobDesc.textContent = pos.description;

    // Pre-select this role in the hidden form
    positionSel.innerHTML = `
      <option value="">Select…</option>
      <option value="${role}" selected>${pos.displayName}</option>
    `;

    jobInfo.classList.remove("hidden");
    authModal.classList.add("hidden");
    jobForm.classList.add("hidden");
    applyBtn.classList.remove("hidden");
  }

  // --- 3) "Apply Now" click handler ---
  applyBtn.addEventListener("click", () => {
    if (!auth.currentUser) {
      authModal.classList.remove("hidden");
    } else {
      jobForm.classList.remove("hidden");
      applyBtn.classList.add("hidden");
    }
  });

  // --- 4) Inject extra fields based on selectedRole ---
  positionSel.addEventListener("change", async () => {
    extraFields.innerHTML = "";
    let html = "";

    switch (selectedRole) {
      case "Farmer":
        html = `
          <label>
            <input type="checkbox" name="agriculturalInsurance" required />
            Agricultural Insurance
          </label>
          <label>
            Field Area (aceres)
            <input type="number" name="fieldArea" min="0" step="0.1" required />
          </label>
          <label>
            Crops (comma-separated)
            <input type="text" name="crops" placeholder="e.g. wheat, corn" required />
          </label>
          <label>
            Pick-Up Address
            <input type="text" name="pickupAddress" placeholder="Enter address" required />
          </label>
        `;
        break;

      case "Driver":
        html = `
          <label>
            License Type
            <input type="text" name="licenseType" placeholder="e.g. CDL Class A" required />
          </label>
          <label>
            Vehicle Type
            <select name="vehicleType" required>
              <option value="" disabled selected>Select…</option>
              <option value="truck">Truck</option>
              <option value="tempo">Tempo</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="auto-rickshaw">Auto Rickshaw</option>
            </select>
          </label>
          <label>
            Vehicle Capacity
            <input type="number" name="vehicleCapacity" min="0" step="0.1" placeholder="Enter capacity" required />
          </label>
          <label>
            Driver License Number
            <input type="text" name="driverLicenseNumber" required />
          </label>
          <label>
            Vehicle Registration Number
            <input type="text" name="vehicleRegistrationNumber" required />
          </label>
          <label>
            <input type="checkbox" name="vehicleInsurance" required />
            Insurance
          </label>
          <div id="schedule-container">
            <table>
              <thead>
                <tr>
                  <th>Shift / Day</th>
                  <th>Sunday</th><th>Monday</th><th>Tuesday</th>
                  <th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        `;
        break;

      case "Industrial":
        html = `
          <label>
            License Type
            <input type="text" name="licenseType" required />
          </label>
          <label>
            Vehicle Type
            <input type="text" name="vehicleType" required />
          </label>
          <label>
            Vehicle Capacity
            <input type="number" name="vehicleCapacity" min="0" step="0.1" required />
          </label>
          <label>
            Vehicle Extra Capacity (optional)
            <input type="number" name="vehicleExtraCapacity" min="0" step="0.1" />
          </label>
          <label>
            Driver License Number
            <input type="text" name="driverLicenseNumber" required />
          </label>
          <label>
            Vehicle Registration Number
            <input type="text" name="vehicleRegistrationNumber" required />
          </label>
          <label>
            <input type="checkbox" name="vehicleInsurance" required />
            Insurance
          </label>
          <label>
            <input type="checkbox" name="refrigerated" required />
            Refrigerated
          </label>
          <div id="schedule-container">
            <table>
              <thead>
                <tr>
                  <th>Shift / Day</th>
                  <th>Sunday</th><th>Monday</th><th>Tuesday</th>
                  <th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        `;
        break;

      case "WarehouseWorker":
      case "Picker":
        html = `<p>No additional information required for this role.</p>`;
        break;

      default:
        html = `<p>Please select a valid position.</p>`;
    }

    // Employment agreement appended for every role
    html += `
      <div class="agreement">
        <label>
          <input type="checkbox" name="agreement" required />
          I certify that all information I have submitted is accurate and reliable.
        </label>
      </div>
    `;

    extraFields.innerHTML = `<h3>Additional Information</h3>${html}`;

    // If schedule widget exists, initialize it
    const schedEl = document.getElementById("schedule-container");
    if (schedEl) initSchedule(schedEl);
  });

  // --- 5) Handle form submission for all roles ---
  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const formData = new FormData(jobForm);

    // Ensure agreement box was checked
    if (!formData.get("agreement")) {
      errorMsg.textContent = "You must accept the employment agreement.";
      return;
    }

    // Build payload from form entries
    const payload = {};
    for (let [key, value] of formData.entries()) {
      if (payload[key]) {
        payload[key] = Array.isArray(payload[key])
          ? [...payload[key], value]
          : [payload[key], value];
      } else {
        payload[key] = value;
      }
    }

    // Attach schedule data if present
    const schedEl = document.getElementById("schedule-container");
    if (schedEl) payload.schedule = getScheduleData(schedEl);
console.log(paylload);
    // Choose endpoint based on role
    let endpoint;
    switch (selectedRole) {
      case "Farmer":
        endpoint = "/api/apply-farmer";
        break;
      case "Driver":
        endpoint = "/api/apply-delivery";
        break;
      case "Industrial":
        endpoint = "/api/apply-truckdriver";
        break;
      case "WarehouseWorker":
        endpoint = "/api/apply-warehouseworker";
        break;
      case "Picker":
        endpoint = "/api/apply-picker";
        break;
      default:
        errorMsg.textContent = "Invalid position selected.";
        return;
    }

    try {
      // Get Firebase ID token for Authorization
      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Submission failed");

      alert("Your application is now pending.");
      jobForm.reset();
      jobInfo.classList.add("hidden");
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });

  // --- 6) Auto‐open form if redirected after login/register ---
  onAuthStateChanged(auth, (user) => {
    const params = new URLSearchParams(location.search);
    if (user && params.get("returnTo") === "job.html") {
      jobForm.classList.remove("hidden");
      applyBtn.classList.add("hidden");
    }
  });
});