// employmentApplication.js
// -------------------------
// Builds a dynamic form based on role, with extra HTML injected.
// Now includes HTML5 validation: phone pattern, numeric-only patterns, etc.

import { initSchedule, getScheduleData } from './schedule.js';

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
  {
    name: "picker",
    description: "Selects produce items according to quality standards.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
];

// Utility to get query-string param
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
  const roleParam = getQueryParam("role");
  const container = document.getElementById("application-form-container");
  if (!roleParam) {
    container.innerHTML = "<p>No role specified in URL.</p>";
    return;
  }

  // Find the matching mock role
  const roleObj = mockRoles.find(
    (r) => r.name.toLowerCase() === roleParam.toLowerCase()
  );
  if (!roleObj) {
    container.innerHTML = `<p>Role "${roleParam}" not found.</p>`;
    return;
  }

  // Create the <form>
  const form = document.createElement("form");
  form.id = "application-form";

  // 1) Common fields (Full Name, Email, Phone)
  roleObj.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";

    const labelEl = document.createElement("label");
    labelEl.textContent = field.label;

    const inputEl = document.createElement("input");
    inputEl.type = field.type;
    inputEl.name = field.label.replace(/\s+/g, "").toLowerCase();
    inputEl.id = inputEl.name;
    inputEl.required = true;

    // If this is the Phone field, add a simple regex pattern
    if (field.label === "Phone") {
      // Allows optional '+' followed by 7 to 15 digits
      inputEl.pattern = "^\\+?\\d{7,15}$";
      inputEl.title =
        "Enter a valid phone number (7 to 15 digits, optional leading +).";
      inputEl.placeholder = "+1234567890";
    }

    wrapper.appendChild(labelEl);
    wrapper.appendChild(inputEl);
    form.appendChild(wrapper);
  });

  // Hidden role input
  const hiddenRole = document.createElement("input");
  hiddenRole.type = "hidden";
  hiddenRole.name = "role";
  hiddenRole.value = roleObj.name;
  form.appendChild(hiddenRole);

  // 2) Placeholder for role-specific fields
  const extraFields = document.createElement("div");
  extraFields.id = "extra-fields";
  form.appendChild(extraFields);

  // 3) Submit button
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Submit Application";
  form.appendChild(submitBtn);

  // Append form to container
  container.appendChild(form);

  // 4) Inject role-specific HTML (with patterns for numeric-only fields)
  const roleKey = capitalize(roleParam.toLowerCase());
  let html = "";

  switch (roleKey) {
    case "Farmer":
      html = `
        <h3>Additional Information (Farmer)</h3>
        <label>
          <input type="checkbox" name="agriculturalInsurance" required />
          Agricultural Insurance
        </label>
        <label>
          Field Area (hectares)
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
        <h3>Additional Information (Driver)</h3>
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
          Vehicle Capacity (tons)
          <input type="number" name="vehicleCapacity" min="0" step="0.1" placeholder="Enter capacity" required />
        </label>
        <label>
          Driver License Number
          <input type="text" name="driverLicenseNumber" required />
        </label>
        <label>
          Vehicle Registration Number
          <input
            type="text"
            name="vehicleRegistrationNumber"
            required
            pattern="^\\d+$"
            title="Digits only"
            placeholder="Numbers only"
          />
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
            <tbody>
              <!-- initSchedule(...) will fill these rows -->
            </tbody>
          </table>
        </div>
      `;
      break;

    case "Industrial":
      html = `
        <h3>Additional Information (Industrial Driver)</h3>
        <label>
          License Type
          <input type="text" name="licenseType" required />
        </label>
        <label>
          Vehicle Type
          <input type="text" name="vehicleType" required />
        </label>
        <label>
          Vehicle Capacity (tons)
          <input type="number" name="vehicleCapacity" min="0" step="0.1" required />
        </label>
        <label>
          Vehicle Extra Capacity (optional, tons)
          <input type="number" name="vehicleExtraCapacity" min="0" step="0.1" />
        </label>
        <label>
          Driver License Number
          <input type="text" name="driverLicenseNumber" required />
        </label>
        <label>
          Vehicle Registration Number
          <input
            type="text"
            name="vehicleRegistrationNumber"
            required
            pattern="^\\d+$"
            title="Digits only"
            placeholder="Numbers only"
          />
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
            <tbody>
              <!-- initSchedule(...) will fill these rows -->
            </tbody>
          </table>
        </div>
      `;
      break;

    case "Warehouseworker":
    case "Picker":
      html = `
        <h3>Additional Information</h3>
        <p>No extra information is required for this role.</p>
      `;
      break;

    default:
      html = `
        <h3>Additional Information</h3>
        <p>Please select a valid position.</p>
      `;
  }

  // Append the agreement checkbox for every role
  html += `
    <div class="agreement">
      <label>
        <input type="checkbox" name="agreement" required />
        I certify that all information I have submitted is accurate and reliable.
      </label>
    </div>
  `;

  // Inject into the form
  extraFields.innerHTML = html;

  // Initialize schedule table if present
  const schedEl = document.getElementById("schedule-container");
  if (schedEl && typeof initSchedule === "function") {
    initSchedule(schedEl);
  }

  // 5) Handle form submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Collect all form fields + files
    const formData = new FormData(form);

    // If schedule is present, append JSON-encoded schedule
    if (schedEl && typeof getScheduleData === "function") {
      const scheduleObj = getScheduleData(schedEl);
      formData.append("schedule", JSON.stringify(scheduleObj));
    }

    // DEBUG: log all entries to the console
    for (let [key, value] of formData.entries()) {
      console.log(key, "→", value);
    }

    // TODO: retrieve user token, then send to backend as FormData
    /*
    const token = localStorage.getItem("userToken") || "";
    fetch("/api/apply", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token
        // Don't set Content-Type manually when sending FormData
      },
      body: formData
    })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        container.innerHTML = `<p class="success-message">${response.message}</p>`;
      } else {
        container.innerHTML = `<p>${response.error || "Submission failed."}</p>`;
      }
    })
    .catch(err => {
      container.innerHTML = `<p>Error: ${err.message}</p>`;
    });
    */

    // Mock response
    const mockResponse = {
      success: true,
      message: "Application submitted successfully. We will contact you shortly.",
    };
    if (mockResponse.success) {
      container.innerHTML = `<p class="success-message">${mockResponse.message}</p>
       <button><a herf="index.html">Home</a></button>`;
    } else {
      container.innerHTML = `<p>${mockResponse.message || "Submission failed."}</p>`;
    }
  });
});

