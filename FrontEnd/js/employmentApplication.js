import { initSchedule, getScheduleBitmaskArray } from "./schedule.js";
import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";

// console.log("employmentApplication.js loaded");

document.getElementById("logout-link").addEventListener("click", (event) => {
  event.preventDefault(); // Prevent the default link action

  signOut(auth)
    .then(() => {
      console.log("User signed out successfully.");
      window.location.href = "index.html"; // Redirect after logout
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
});

window.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus(); // Just checks if user is logged in
  renderApplicationForm(); // Always tries to build the form
});

const RolesTable = [
  {
    name: "deliverer",
    description: "Responsible for transporting shipments.",
    includeSchedule: true,
    includeLand: false,
    fields: [
      { label: "License Type", type: "text" },
      { label: "Vehicle Make", type: "text" },
      { label: "Vehicle Model", type: "text" },
      { label: "Vehicle Type", type: "text" },
      { label: "Year", type: "number" },
      { label: "Vehicle Capacity (t)", type: "number", step: "0.1", min: "0" },
      { label: "Driver License #", type: "text" },
      { label: "Vehicle Reg. #", type: "text", pattern: "[0-9]+" },
      { label: "Vehicle Insurance", type: "checkbox" },
    ],
  },
  {
    name: "industrial-driver",
    description: "Delivers goods from farms to the logistics center.",
    includeSchedule: true,
    includeLand: false,
    fields: [
      { label: "License Type", type: "text" },
      { label: "Vehicle Make", type: "text" },
      { label: "Vehicle Model", type: "text" },
      { label: "Vehicle Type", type: "text" },
      { label: "Year", type: "number" },
      { label: "Vehicle Capacity (t)", type: "number", step: "0.1", min: "0" },
      { label: "Driver License #", type: "text" },
      { label: "Vehicle Reg. #", type: "text", pattern: "[0-9]+" },
      { label: "Vehicle Insurance", type: "checkbox" },
      { label: "Refrigerated", type: "checkbox" },
    ],
  },
  {
    name: "farmer",
    description: "Supplies produce and quality reports.",
    includeSchedule: false,
    includeLand: true,
    fields: [
      { label: "Agricultural Insurance", type: "checkbox" },
      { label: "Farm Name", type: "text" },
    ],
  },
  {
    name: "picker",
    description: "Packages and labels containers before shipping.",
    includeSchedule: false,
    includeLand: false,
    fields: [{ label: "Years of Experience", type: "text" }],
  },
  {
    name: "warehouse-worker",
    description: "Operates heavy-duty vehicles and equipment.",
    includeSchedule: false,
    includeLand: false,
    fields: [],
  },
  {
    name: "sorting",
    description: "General worker in the logistics center, sorting employee.",
    includeSchedule: false,
    includeLand: false,
    fields: [],
  },
];

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function checkAuthStatus() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("You need to log in first!");
      window.location.href = "login.html";
    }
  });
}

async function renderApplicationForm() {
  const container = document.getElementById("application-form-container");

  //get current user token and profile
  const token = await getCurrentUserToken();

  const res = await fetch("http://localhost:4000/api/user/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  //mockget progile
  const profile = {
    fisrtName: data.firstName,
    lasttName: data.lastName,
    email: data.email,
    phone: data.phone,
    role: data.role,
    birthdate: data.birthDate,
    address: data.address,
  };

  if (profile.role && profile.role !== "customer") {
    alert("You already submitted for a role, you can’t have different roles");
    return (window.location.href = "index.html");
  }

  const roleParam = getQueryParam("role");
  if (!roleParam) {
    container.innerHTML = "<p>No role specified in URL.</p>";
    return;
  }

  const roleObj = RolesTable.find((r) => r.name === roleParam.toLowerCase());
  if (!roleObj) {
    container.innerHTML = `<p>Role "${roleParam}" not found.</p>`;
    return;
  }

  container.innerHTML = "";

  const info = document.createElement("div");
  info.innerHTML = `
    <p>Please check that your personal details we already have are up to date. 
      If not, sign up with the up-to-date information.</p>
    <p>This is the mail and phone number we will be using to contact you.</p>
  `;
  container.appendChild(info);

  const form = document.createElement("form");
  form.id = "application-form";

  // Add hidden profile fields
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

  const hiddenRole = document.createElement("input");
  hiddenRole.type = "hidden";
  hiddenRole.name = "role";
  hiddenRole.value = roleObj.name;
  form.appendChild(hiddenRole);

  const extraFields = document.createElement("div");
  extraFields.id = "extra-fields";
  form.appendChild(extraFields);

  // === Dynamically add role-specific fields ===
  if (roleObj.fields && Array.isArray(roleObj.fields)) {
    roleObj.fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("form-group");

      const label = document.createElement("label");
      label.textContent = field.label;

      const input = document.createElement("input");
      input.type = field.type;
      input.name = field.label.replace(/\s+/g, "").toLowerCase();
      input.required = true;

      // Optional field attributes (step, min, pattern)
      if (field.step) input.step = field.step;
      if (field.min) input.min = field.min;
      if (field.pattern) input.pattern = field.pattern;

      if (field.type === "checkbox") {
        label.prepend(input); // checkbox goes before label text
        wrapper.appendChild(label);
      } else {
        label.appendChild(input);
        wrapper.appendChild(label);
      }

      extraFields.appendChild(wrapper);
    });
  }

  // === Add land section if needed ===
  if (roleObj.includeLand) {
    const landsSection = document.createElement("div");
    landsSection.id = "lands-section";
    landsSection.innerHTML = `<h4>Lands</h4>`;
    extraFields.appendChild(landsSection);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "add-land-btn";
    addBtn.textContent = "Add Land";
    extraFields.appendChild(addBtn);

    setTimeout(() => {
      document
        .getElementById("add-land-btn")
        ?.addEventListener("click", window.addLand);
    }, 0);
  }

  // === Add schedule if needed ===
  let schedEl = null;
  if (roleObj.includeSchedule) {
    schedEl = document.createElement("div");
    schedEl.id = "schedule-container";
    schedEl.innerHTML = `
      <table>
        <thead>
          <tr><th>Shift/Day</th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    extraFields.appendChild(schedEl);
    await initSchedule(schedEl);
  }

  // === Add agreement checkbox ===
  const agreementWrapper = document.createElement("div");
  agreementWrapper.className = "agreement";
  agreementWrapper.innerHTML = `
    <label><input type="checkbox" name="agreement" required /> I certify that all information is accurate.</label>
  `;
  extraFields.appendChild(agreementWrapper);

  // === Submit button ===
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Submit Application";
  form.appendChild(submitBtn);
  container.appendChild(form);

  // === Submit handler ===
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    formData.append("submittedAt", new Date().toISOString());

    // Clean out any leftover schedule fields
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    dayNames.forEach((day) => formData.delete(day));

    // Append schedule bitmask
    if (schedEl) {
      const bitmaskArray = await getScheduleBitmaskArray(schedEl);
      formData.append("scheduleBitmask", JSON.stringify(bitmaskArray));
    }

    // Append land data if present
    if (roleObj.includeLand) {
      const lands = [];
      const landBlocks = document.querySelectorAll(".land-block");
      landBlocks.forEach((block, index) => {
        const name =
          block.querySelector(`[name="land[${index}][customName]"]`)?.value ||
          `Land #${index + 1}`;
        const ownership = block.querySelector(
          `[name="land[${index}][ownership]"]`
        )?.value;
        const acres = block.querySelector(
          `[name="land[${index}][acres]"]`
        )?.value;
        const pickupAddress = block.querySelector(
          `[name="land[${index}][pickupAddress]"]`
        )?.value;
        const pickupLat = block.querySelector(
          `[name="land[${index}][pickupLat]"]`
        )?.value;
        const pickupLng = block.querySelector(
          `[name="land[${index}][pickupLng]"]`
        )?.value;
        const location = block.querySelector(
          `[name="land[${index}][location]"]`
        )?.value;
        const locLat = block.querySelector(
          `[name="land[${index}][locLat]"]`
        )?.value;
        const locLng = block.querySelector(
          `[name="land[${index}][locLng]"]`
        )?.value;

        lands.push({
          name,
          ownership,
          acres,
          pickupAddress,
          pickupLat,
          pickupLng,
          location,
          locLat,
          locLng,
        });
      });

      formData.append("lands", JSON.stringify(lands));
      [...formData.keys()].forEach((key) => {
        if (key.startsWith("land[")) formData.delete(key);
      });
    }

    // Log final output
    console.log("==== Mock Backend req.body ====");
    const mockReqBody = {};
    mockReqBody.uid = auth.currentUser?.uid || "mock-uid";
    for (let [key, value] of formData.entries()) {
      mockReqBody[key] = value;
    }
    console.log(JSON.stringify(mockReqBody));

    try {
      await fetch("http://localhost:4000/api/auth/register-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mockReqBody),
      });
      alert("Application submitted! (mocked)");
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Check console for details.");
    }
  });
}

let landIndex = 0;

window.addLand = function () {
  const landsSection = document.getElementById("lands-section");
  if (!landsSection) return;

  const block = document.createElement("div");
  block.className = "land-block";

  block.innerHTML = `
    <h5>Land #${landIndex + 1}</h5>
    <label>land Name: <input type="text" name="land[${landIndex}][customName]" /></label>
    <label>Ownership Type: <input type="text" name="land[${landIndex}][ownership]" /></label>
    <label>Acres: <input type="number" name="land[${landIndex}][acres]" /></label>
    <label>Pickup Address: <input type="text" name="land[${landIndex}][pickupAddress]" /></label>
    <label>Pickup Lat: <input type="number" name="land[${landIndex}][pickupLat]" step="any" /></label>
    <label>Pickup Lng: <input type="number" name="land[${landIndex}][pickupLng]" step="any" /></label>
    <label>Location Address: <input type="text" name="land[${landIndex}][location]" /></label>
    <label>Location Lat: <input type="number" name="land[${landIndex}][locLat]" step="any" /></label>
    <label>Location Lng: <input type="number" name="land[${landIndex}][locLng]" step="any" /></label>
    <hr/>
  `;

  landsSection.appendChild(block);
  landIndex++;
};

function capitalize(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : "";
}
