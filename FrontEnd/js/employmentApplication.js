
// employmentApplication.js



let landCount = 0;
window.addLand = function () {
  const container = document.getElementById("lands-section");
  const index = landCount++;

  const landDiv = document.createElement("div");
  landDiv.className = "land-block";

  const content = document.createElement("div");
  content.className = "land-form";

  content.innerHTML = `
    <label>Land Name (optional):
      <input type="text" name="land[${index}][customName]" />
    </label>
    <label>Ownership:
      <select name="land[${index}][ownership]" required>
        <option value="">--Select--</option>
        <option value="owner">Owner</option>
        <option value="renter">Renter</option>
      </select>
    </label>
    <label>Land Acres:
      <input type="number" name="land[${index}][acres]" min="0.1" step="0.1" required />
    </label>
    <label>Pick-Up Address:
      <input type="text" name="land[${index}][pickupAddress]" required />
    </label>
    <label>Location:
      <input type="text" id="landLocation-${index}" name="land[${index}][location]" placeholder="Click to pick location on map" readonly required />
    </label>
  `;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save Land";
  saveBtn.addEventListener("click", () => {
  const inputs = content.querySelectorAll("input, select");
  let valid = true;

  inputs.forEach((input) => {
    if (input.name.includes("customName")) return; // Skip optional name field
    if (!input.checkValidity()) {
      input.reportValidity();
      valid = false;
    }
  });

  if (!valid) return;

  content.style.display = "none";
  summaryBlock.style.display = "flex";

  const nameVal = content.querySelector(`input[name="land[${index}][customName]"]`).value.trim();
  const acresVal = content.querySelector(`input[name="land[${index}][acres]"]`).value.trim();

  let summary = `Land #${index + 1}`;
  if (nameVal) summary += ` – ${nameVal}`;
  if (acresVal) summary += `, ${acresVal} acres`;

  summaryText.textContent = summary;
});


  content.appendChild(saveBtn);

  const summaryBlock = document.createElement("div");
  summaryBlock.className = "land-summary collapsed";
  summaryBlock.style.display = "none";

  const summaryText = document.createElement("div");
  summaryText.textContent = `Land #${index + 1}`;
  const arrow = document.createElement("span");
  arrow.textContent = "▾";
  arrow.className = "arrow";

  summaryBlock.appendChild(summaryText);
  summaryBlock.appendChild(arrow);

  summaryBlock.addEventListener("click", () => {
    const visible = content.style.display === "block";
    content.style.display = visible ? "none" : "block";
    summaryBlock.classList.toggle("collapsed", !visible);
    arrow.textContent = visible ? "▾" : "▸";
  });

  landDiv.appendChild(summaryBlock);
  landDiv.appendChild(content);
  container.appendChild(landDiv);
};





//google maps version to be updated once we get the approval for creating an api 
/*

import { createMapPicker, openMapPicker } from "./mapPicker.js";
window.addLand = function () {
  const container = document.getElementById("lands-section");
  const index = landCount++;

  const landContent = `
    <label>Land Name (optional):
      <input type="text" name="land[${index}][name]" placeholder="e.g., North Field" />
    </label>
    <label>Ownership:
      <select name="land[${index}][ownership]" required>
        <option value="">--Select--</option>
        <option value="owner">Owner</option>
        <option value="renter">Renter</option>
      </select>
    </label>
    <label>Land Acres:
      <input type="number" name="land[${index}][acres]" min="0.1" step="0.1" required />
    </label>
    <label>Pick-Up Address:
      <input type="text" id="landLocation-${index}" name="land[${index}][location]" placeholder="Click to pick location from map" readonly required />
    </label>
  `;

  const section = createToggleableSection(`Land #${index + 1}`, landContent, (containerEl) => {
    const name = containerEl.querySelector(`[name='land[${index}][name]']`).value || "(no name)";
    const acres = containerEl.querySelector(`[name='land[${index}][acres]']`).value;
    const summary = document.createElement("div");
    summary.className = "land-summary";
    summary.textContent = `Land #${index + 1} - ${name} (${acres} acres)`;
    const arrow = document.createElement("span");
    arrow.textContent = " ▾";
    summary.appendChild(arrow);
    const details = containerEl.querySelector(".toggle-content");
    details.style.display = "none";
    summary.addEventListener("click", () => {
      const isVisible = details.style.display === "block";
      details.style.display = isVisible ? "none" : "block";
      arrow.textContent = isVisible ? " ▾" : " ▸";
    });
    containerEl.querySelector(".toggle-header").innerHTML = "";
    containerEl.querySelector(".toggle-header").appendChild(summary);
  });

  container.appendChild(section);

  // 🔁 After the section is in the DOM, hook up the map logic
  setTimeout(() => {
    const locationInput = document.getElementById(`landLocation-${index}`);
    if (locationInput) {
      const latInput = document.createElement("input");
      latInput.type = "hidden";
      latInput.name = `land[${index}][latitude]`;

      const lngInput = document.createElement("input");
      lngInput.type = "hidden";
      lngInput.name = `land[${index}][longitude]`;

      locationInput.parentElement.appendChild(latInput);
      locationInput.parentElement.appendChild(lngInput);

      locationInput.addEventListener("focus", () => {
        openMapPicker(({ address, latitude, longitude }) => {
          locationInput.value = address;
          latInput.value = latitude;
          lngInput.value = longitude;
        });
      });
    }
  }, 0);
};
*/

// -------------------------
// Builds a dynamic form based on role, with extra HTML injected.
// All backend calls are commented out and replaced with mock data.

import { initSchedule, getScheduleData } from "./schedule.js";
import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";

console.log("employmentApplication.js loaded");

// Log out link
document.getElementById("logout-link").addEventListener("click", () => {
  signOut(auth);
  alert("Logged out");
  window.location.href = "login.html";
});


const mockRoles = [
  { name: "deliverer", description: "Responsible for transporting shipments.", fields: [ { label: "Full Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, ], },
  { name: "picker", description: "Packages and labels containers before shipping.", fields: [ { label: "Full Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, ], },
  { name: "industrial-driver", description: "delivering goods from farms to logistic center", fields: [ { label: "Full Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, ], },
  { name: "farmer", description: "Supplies produce and quality reports.", fields: [ { label: "Full Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, ], },
  { name: "warehouse-worker", description: "Operates heavy-duty vehicles and equipment.", fields: [ { label: "Full Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, ], },
  { name: "sorting", description: "general worker in the logistics center , sorting employee.", fields: [ { label: "Full Name", type: "text" }, { label: "Email", type: "email" }, { label: "Phone", type: "tel" }, ], },
];

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function capitalize(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : "";
}

onAuthStateChanged(auth, async (user) => {
  const container = document.getElementById("application-form-container");
  if (!user) {
    alert("You need to log in first!");
    return (window.location.href = "login.html");
  }
///2) Fetch user profile from backend
 

  // const token = await getCurrentUserToken();
  // const res = await fetch('/api/user-profile', {
  //   method: 'GET',
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // const profile = await res.json();


  // Mock profile data from backend:

  
  const profile = {
    fisrtName: "John",
    lasttName: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    role: "customer",
    birthdate: "17-07-1997",
    address: "hunalulu"
  };
// 3) If they already have a role ≠ "customer", block them
  if (profile.role && profile.role !== "customer") {
    alert("You already submitted for a role, you can’t have different roles");
    return (window.location.href = "index.html");
  }
// 4) Determine which role they're applying for
  const roleParam = getQueryParam("role");
  if (!roleParam) {
    container.innerHTML = "<p>No role specified in URL.</p>";
    return;
  }
  const roleObj = mockRoles.find((r) => r.name === roleParam.toLowerCase());
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
  [
    ["first name", profile.fisrtName],
    ["last name", profile.lasttName],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Address", profile.address],
    ["Birth-date", profile.birthdate],
  ].forEach(([label, value]) => {
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

  container.appendChild(form);

  // 6) Inject role-specific HTML
  const roleKey = roleParam.toLowerCase();
  let html = "";

///farmer extra fields 
let landCount = 0;
window.addLand = function () {
  const container = document.getElementById("lands-section");
  const index = landCount++;

  const landDiv = document.createElement("div");
  landDiv.className = "land-block";

  const content = document.createElement("div");
  content.className = "land-form";

  content.innerHTML = `
    <label>Land Name (optional):
      <input type="text" name="land[${index}][customName]" />
    </label>
    <label>Ownership:
      <select name="land[${index}][ownership]" required>
        <option value="">--Select--</option>
        <option value="owner">Owner</option>
        <option value="renter">Renter</option>
      </select>
    </label>
    <label>Land Acres:
      <input type="number" name="land[${index}][acres]" min="0.1" step="0.1" required />
    </label>
    <label>Pick-Up Address:
      <input type="text" name="land[${index}][pickupAddress]" required />
    </label>
    <label>Location:
      <input type="text" id="landLocation-${index}" name="land[${index}][location]" placeholder="Click to pick location on map" readonly required />
    </label>
  `;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save Land";
  saveBtn.addEventListener("click", () => {
  const inputs = content.querySelectorAll("input, select");
  let valid = true;

  inputs.forEach((input) => {
    if (input.name.includes("customName")) return; // Skip optional name field
    if (!input.checkValidity()) {
      input.reportValidity();
      valid = false;
    }
  });

  if (!valid) return;

  content.style.display = "none";
  summaryBlock.style.display = "flex";

  const nameVal = content.querySelector(`input[name="land[${index}][customName]"]`).value.trim();
  const acresVal = content.querySelector(`input[name="land[${index}][acres]"]`).value.trim();

  let summary = `Land #${index + 1}`;
  if (nameVal) summary += ` – ${nameVal}`;
  if (acresVal) summary += `, ${acresVal} acres`;

  summaryText.textContent = summary;
});


  content.appendChild(saveBtn);

  const summaryBlock = document.createElement("div");
  summaryBlock.className = "land-summary collapsed";
  summaryBlock.style.display = "none";

  const summaryText = document.createElement("div");
  summaryText.textContent = `Land #${index + 1}`;
  const arrow = document.createElement("span");
  arrow.textContent = "▾";
  arrow.className = "arrow";

  summaryBlock.appendChild(summaryText);
  summaryBlock.appendChild(arrow);

  summaryBlock.addEventListener("click", () => {
    const visible = content.style.display === "block";
    content.style.display = visible ? "none" : "block";
    summaryBlock.classList.toggle("collapsed", !visible);
    arrow.textContent = visible ? "▾" : "▸";
  });

  landDiv.appendChild(summaryBlock);
  landDiv.appendChild(content);
  container.appendChild(landDiv);
};






  switch (roleKey) {
    case "farmer":
      html = `
        <h3>Additional Information (Farmer)</h3>
        <label><input type="checkbox" name="agriculturalInsurance" required /> Agricultural Insurance</label>
        <label>Farm Name<input type="text" name="farmName" required /></label>
        <div id="lands-section">
          <h4>Lands</h4>
        </div>
        <button type="button" id="add-land-btn">Add Land</button>
      `;
      break;
    case "deliverer":
      html = `
        <h3>Additional Information (Deliverer)</h3>
        <label>License Type<input type="text" name="licenseType" required /></label>
        <label>Vehicle Make:
  <input type="text" name="vehicleMake" required placeholder="e.g., Toyota" />
</label>

<label>Vehicle Model:
  <input type="text" name="vehicleModel" required placeholder="e.g., Hilux" />
</label>

<label>Vehicle Type:
  <input type="text" name="vehicleType" required placeholder="e.g., Pickup/motor/truck" />
</label>
<label>Year:
  <input type="number" name="vehicleYear" required  />
</label>

        <label>Vehicle Capacity (t)<input type="number" name="vehicleCapacity" min="0" step="0.1" required /></label>
        <label>Driver License #<input type="text" name="driverLicenseNumber" required /></label>
        <label>Vehicle Reg. #
         <input type="text" name="vehicleRegistrationNumber" required pattern="[0-9]+" title="Digits only" />
        </label>
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
    case "industrial-driver":
      html = `
        <h3>Additional Info (Industrial-driver)</h3>
        <label>License Type<input type="text" name="licenseType" required /></label>
               <label>Vehicle Make:
  <input type="text" name="vehicleMake" required placeholder="e.g., Toyota" />
</label>

<label>Vehicle Model:
  <input type="text" name="vehicleModel" required placeholder="e.g., Hilux" />
</label>
<label>Year:
  <input type="number" name="vehicleYear" required  />
</label>
<label>Vehicle Type:
  <input type="text" name="vehicleType" required placeholder="e.g., Pickup/motor/truck" />
</label>
        <label>Capacity (t)<input type="number" name="vehicleCapacity" min="0" step="0.1" required /></label>
        <label>Driver License #<input type="text" name="driverLicenseNumber" required /></label>
        <label>Vehicle Reg. #
         <input type="text" name="vehicleRegistrationNumber" required pattern="[0-9]+" title="Digits only" />
        </label>
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

  html += `
    <div class="agreement">
      <label><input type="checkbox" name="agreement" required /> I certify that all information is accurate.</label>
    </div>
  `;

  extraFields.innerHTML = html;

  if (roleKey === "farmer") {
    setTimeout(() => {
      const addLandBtn = document.getElementById("add-land-btn");
      if (addLandBtn) {
        addLandBtn.addEventListener("click", addLand);
      } else {
        console.warn("Add Land button not found in DOM.");
      }
    }, 0);
  }

  
// 7) Initialize schedule widget if needed
  const schedEl = document.getElementById("schedule-container");
  if (schedEl) initSchedule(schedEl);


   // 8) Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const timestamp = new Date().toISOString();
  formData.append("submittedAt", timestamp);

    if (schedEl) {
      formData.append("schedule", JSON.stringify(getScheduleData(schedEl)));
    }


    // ✅ Only gather land data if the role is Farmer
  if (roleKey === "farmer") {
    const lands = [];
const landBlocks = document.querySelectorAll(".land-block");

landBlocks.forEach((block, index) => {
  const name = block.querySelector(`[name="land[${index}][customName]"]`)?.value || `Land #${index + 1}`;
  const ownership = block.querySelector(`[name="land[${index}][ownership]"]`)?.value;
  const acres = block.querySelector(`[name="land[${index}][acres]"]`)?.value;
  const pickupAddress = block.querySelector(`[name="land[${index}][pickupAddress]"]`)?.value;
  const locationInput = block.querySelector(`[name="land[${index}][location]"]`)?.value;

  const lat = block.querySelector(`[name="land[${index}][pickupLat]"]`)?.value || 0;
  const lng = block.querySelector(`[name="land[${index}][pickupLng]"]`)?.value || 0;
  const locLat = block.querySelector(`[name="land[${index}][locLat]"]`)?.value || 0;
  const locLng = block.querySelector(`[name="land[${index}][locLng]"]`)?.value || 0;

  lands.push({
    name,
    ownership,
    acres,
    pickupAddress: {
      address: pickupAddress,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    },
    location: {
      address: locationInput,
      latitude: parseFloat(locLat),
      longitude: parseFloat(locLng),
    },
  });
});

// ✅ Append it as a string
formData.append("lands", JSON.stringify(lands));

// ✅ Clean up individual land[x][...] fields
[...formData.keys()].forEach((key) => {
  if (key.startsWith("land[")) formData.delete(key);
});
  }


  const mockReqBody = {};
// Simulate server-side req.body logging
    console.log("==== Mock Backend req.body ====");
  ///input check
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
      mockReqBody[key] = value;
    }
    console.log(JSON.stringify(mockReqBody, null, 2));

  //  // Real API call commented out:
  //   const token = await getCurrentUserToken();
  //   const applyRes = await fetch('http://localhost:4000/api/auth/register-employee', {
  //     method: 'POST',
  //     headers: { 'Authorization': `Bearer ${token}` },
  //     body: formData
  //   });
  //   const applyResult = await applyRes.json();

    

    
    // const applyResult = {
    //   success: true,
    //   message: "Application submitted successfully. We will contact you shortly.",
    // };
    // if (applyResult.success) {
    //   container.innerHTML = `<p class="success-message">${applyResult.message}</p>
    //     <button onclick="window.location.href='index.html'">Home</button>`;
    // } else {
    //   container.innerHTML = `<p>${applyResult.message || "Submission failed."}</p>`;
    // }
  });
});
