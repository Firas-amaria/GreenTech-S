// employmentApplication.js
// -------------------------
// Builds a dynamic form based on role, with extra HTML injected.
// All backend calls are commented out and replaced with mock data.

import { initSchedule, getScheduleData } from './schedule.js';
import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut
} from './firebase-init.js';

console.log("employmentApplication.js loaded");

// Log out link
document.getElementById("logout-link").addEventListener("click", () => {
  signOut(auth);
  alert('Logged out');
  window.location.href = 'login.html';
});

// Mock roles definition
const mockRoles = [
  {
    name: "driver",
    description: "Responsible for transporting shipments.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" }
    ],
  },
  {
    name: "picker",
    description: "Packages and labels containers before shipping.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
  {
    name: "supervisor",
    description: "Oversees operations and staff.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
  {
    name: "farmer",
    description: "Supplies produce and quality reports.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
  {
    name: "industrial",
    description: "Operates heavy-duty vehicles and equipment.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
  {
    name: "warehouseworker",
    description: "Manages inventory in the warehouse.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
];

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function capitalize(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : '';
}

onAuthStateChanged(auth, async (user) => {
  const container = document.getElementById("application-form-container");

  // 1) Not logged in → redirect to login
  if (!user) {
    alert("You need to log in first!");
    return window.location.href = 'login.html';
  }

  // 2) Fetch user profile from backend
  // const token = await getCurrentUserToken();
  // const res = await fetch('/api/user-profile', {
  //   method: 'GET',
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // const profile = await res.json();

  // Mock profile data from backend:
  const profile = {
    fullName: "John Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    role: "customer"  // the only role allowed to apply
  };

  // 3) If they already have a role ≠ "customer", block them
  if (profile.role && (profile.role !== "customer")) {
    alert("You already submitted for a role, you can’t have different roles");
    return window.location.href = 'index.html';
  }

  // 4) Determine which role they're applying for
  const roleParam = getQueryParam("role");
  if (!roleParam) {
    container.innerHTML = "<p>No role specified in URL.</p>";
    return;
  }
  const roleObj = mockRoles.find(r => r.name === roleParam.toLowerCase());
  if (!roleObj) {
    container.innerHTML = `<p>Role "${roleParam}" not found.</p>`;
    return;
  }

    // Clear any existing content
  container.innerHTML = "";

  // 1️⃣ Insert the info paragraphs
  const info = document.createElement("div");
  info.innerHTML = `
    <p>Please check that your personal details we already have are up to date. 
      If not, sign up with the up-to-date information.</p>
    <p>This is the mail and phone number we will be using to contact you.</p>
  `;
  container.appendChild(info);



  // 5) Build the form
  const form = document.createElement("form");
  form.id = "application-form";

  // 5a) Display static user info + hidden inputs
  [["Full Name", profile.fullName], ["Email", profile.email], ["Phone", profile.phone]]
    .forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "form-group";

      const lab = document.createElement("label");
      lab.textContent = label;
      wrapper.appendChild(lab);

      const span = document.createElement("div");
      span.className = "static-field";
      span.textContent = value;
      wrapper.appendChild(span);

      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = label.replace(/\s+/g, "").toLowerCase();
      hidden.value = value;
      wrapper.appendChild(hidden);

      form.appendChild(wrapper);
    });

  // Then append the form
  container.appendChild(form);
  // 5b) Hidden input for the role being applied to
  const hiddenRole = document.createElement("input");
  hiddenRole.type = "hidden";
  hiddenRole.name = "role";
  hiddenRole.value = roleObj.name;
  form.appendChild(hiddenRole);

  // 5c) Placeholder for extra fields
  const extraFields = document.createElement("div");
  extraFields.id = "extra-fields";
  form.appendChild(extraFields);

  // 5d) Submit button
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Submit Application";
  form.appendChild(submitBtn);

  container.innerHTML = "";
  container.appendChild(form);

  // 6) Inject role-specific HTML
  const roleKey = capitalize(roleParam.toLowerCase());
  let html = "";

  switch (roleKey) {
    case "Farmer":
      html = `
        <h3>Additional Information (Farmer)</h3>
        <label><input type="checkbox" name="agriculturalInsurance" required /> Agricultural Insurance</label>
        <label>Field Area (ha)<input type="number" name="fieldArea" min="0" step="0.1" required /></label>
        <label>Crops<input type="text" name="crops" placeholder="e.g. wheat, corn" required /></label>
        <label>Pick-Up Address<input type="text" name="pickupAddress" required /></label>
      `;
      break;

    case "Deliverer":
      html = `
        <h3>Additional Information (Deliverer)</h3>
        <label>License Type<input type="text" name="licenseType" required /></label>
        <label>Vehicle Type
          <select name="vehicleType" required>
            <option value="" disabled selected>Select…</option>
            <option value="truck">Truck</option>
            <option value="tempo">Tempo</option>
            <option value="car">Car</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="auto-rickshaw">Auto Rickshaw</option>
          </select>
        </label>
        <label>Vehicle Capacity (t)<input type="number" name="vehicleCapacity" min="0" step="0.1" required /></label>
        <label>Driver License #<input type="text" name="driverLicenseNumber" required /></label>
        <label>Vehicle Reg. #<input type="text" name="vehicleRegistrationNumber" required pattern="^\\d+$" title="Digits only" /></label>
        <label><input type="checkbox" name="vehicleInsurance" required /> Insurance</label>
        <div id="schedule-container">
          <table>
            <thead>
              <tr><th>Shift/Day</th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      break;

    case "Industrial-driver":
      html = `
        <h3>Additional Info (Industrial-driver)</h3>
        <label>License Type<input type="text" name="licenseType" required /></label>
        <label>Vehicle Type<input type="text" name="vehicleType" required /></label>
        <label>Capacity (t)<input type="number" name="vehicleCapacity" min="0" step="0.1" required /></label>
        <label>Extra Capacity (opt)<input type="number" name="vehicleExtraCapacity" min="0" step="0.1" /></label>
        <label>Driver License #<input type="text" name="driverLicenseNumber" required /></label>
        <label>Vehicle Reg. #<input type="text" name="vehicleRegistrationNumber" required pattern="^\\d+$" title="Digits only" /></label>
        <label><input type="checkbox" name="vehicleInsurance" required /> Insurance</label>
        <label><input type="checkbox" name="refrigerated" required /> Refrigerated</label>
        <div id="schedule-container">
          <table>
            <thead>
              <tr><th>Shift/Day</th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      break;

    default:
      html = `<h3>Additional Information</h3><p>No extra info required.</p>`;
  }

  // agreement checkbox (for all roles)
  html += `
    <div class="agreement">
      <label><input type="checkbox" name="agreement" required /> I certify that all information is accurate.</label>
    </div>
  `;

  extraFields.innerHTML = html;

  // 7) Initialize schedule widget if needed
  const schedEl = document.getElementById("schedule-container");
  if (schedEl) initSchedule(schedEl);

  // 8) Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    if (schedEl) {
      formData.append("schedule", JSON.stringify(getScheduleData(schedEl)));
    }

    // Real API call commented out:
    // const token = await getCurrentUserToken();
    // const applyRes = await fetch('/api/apply', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${token}` },
    //   body: formData
    // });
    // const applyResult = await applyRes.json();

    // Mock response from backend:
    const applyResult = {
      success: true,
      message: "Application submitted successfully. We will contact you shortly."
    };

    if (applyResult.success) {
      container.innerHTML = `<p class="success-message">${applyResult.message}</p>
        <button onclick="window.location.href='index.html'">Home</button>`;
    } else {
      container.innerHTML = `<p>${applyResult.message || "Submission failed."}</p>`;
    }
  });
});
