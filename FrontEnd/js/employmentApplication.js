/* employmentApplication.js - Optimized Version */

import { initSchedule, getScheduleBitmaskArray } from "./schedule.js";
import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";

import { initMapPicker, openMapPicker } from "./mapPicker.js";

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("You need to log in first!");
      window.location.href = "login.html";
    } else {
      renderApplicationForm();
    }
  });
});

const RolesTable = [
  {
    name: "deliverer",
    description: "Responsible for transporting shipments.",
    includeSchedule: true,
      includeDimensions: true,
    includeLand: false,
    fields: [
      { label: "Vechile Type", type: "text" },
      { label: "Vehicle Model", type: "text" },
      { label: "Vehicle Year", type: "number" },
      { label: "Vehicle payload Capacity (t)", type: "number", step: "0.1", min: "0" },
      { label: "Driver License Number", type: "text" },
      { label: "Vehicle Registration Number", type: "text", pattern: "[0-9]+" },
      { label: "Vehicle Insurance", type: "checkbox" },
    ],
  },
  {
    name: "industrialDriver",
    description: "Delivers goods from farms to the logistics center.",
    includeSchedule: true,
    includeDimensions: true,
    includeLand: false,
    fields: [
      { label: "License Type", type: "text" },
      { label: "Vehicle Make", type: "text" },
      { label: "Vehicle Model", type: "text" },
      { label: "Vehicle Type", type: "text" },
      { label: "Vehicle Year", type: "number" },
      { label: "Vehicle Capacity (t)", type: "number", step: "0.1", min: "0" },
      { label: "Driver License Number", type: "text" },
      { label: "Vehicle Registration Number", type: "text", pattern: "[0-9]+" },
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

const getQueryParam = (name) =>
  new URLSearchParams(window.location.search).get(name);

async function renderApplicationForm() {
  const container = document.getElementById("application-form-container");
  const token = await getCurrentUserToken();

  const userRaw = localStorage.getItem("user");
  if (userRaw) {
    const user = JSON.parse(userRaw); // convert back to object
    const Urole = user.role;
    if (Urole !== "customer") {
      alert("You already submitted for a role.");
      return (window.location.href = "index.html");
    }
  }

  const roleName = getQueryParam("role")?.toLowerCase();
  const role = RolesTable.find((r) => r.name === roleName);
  if (!role) {
    container.innerHTML = `<p>Invalid role: ${roleName}</p>`;
    return;
  }

  container.innerHTML = "";
  container.innerHTML += `
    <h2>Employment Application for ${role.name}</h2>
    <p>Ensure your personal details are up to date. If not, sign up again with correct information.</p>
    <p>We will contact you using the details below.</p>
  `;
  // Load Google Maps only if farmer
  if (role.name === "farmer") {
    fetch("http://localhost:4000/api/maps/google-maps-script")
      .then((res) => res.json())
      .then((data) => {
        const script = document.createElement("script");
        script.src = data.scriptUrl + "&language=en&callback=initMap";
        script.async = true;
        document.head.appendChild(script);
        console.log("✅ Google Maps script appended for farmer");
      })
      .catch((err) => console.error("Failed to load Google Maps script", err));

    // Make window callback for Google Maps to call
    window.initMap = () => {
      console.log("✅ Google Maps callback fired on farmer application");
      initMapPicker(); // safely initializes your mapPicker.js
    };
  }

  const form = document.createElement("form");
  form.id = "application-form";

  form.innerHTML += `<input type="hidden" name="role" value="${role.name}" />`;
  const extraFields = document.createElement("div");
  extraFields.id = "extra-fields";
  form.appendChild(extraFields);

  // Role-specific fields
  role.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";

    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.type = field.type;
    input.name = toCamelCase(field.label);
    input.required = true;

    if (field.step) input.step = field.step;
    if (field.min) input.min = field.min;
    if (field.pattern) input.pattern = field.pattern;

    field.type === "checkbox" ? label.prepend(input) : label.appendChild(input);
    wrapper.appendChild(label);
    extraFields.appendChild(wrapper);
  });

  // Land section
  if (role.includeLand) {
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "add-land-btn";
    addBtn.textContent = "Add Land";
    addBtn.style.cssText = "background-color : #28a745;";

    // Create section first
    const landsSection = document.createElement("div");
    landsSection.id = "lands-section";
    landsSection.innerHTML = `<h4>Lands</h4>`;
    extraFields.appendChild(landsSection);

    // Append button after section
    extraFields.appendChild(addBtn);

    //  Attach event listener after DOM is fully updated
    setTimeout(() => {
      const section = document.getElementById("lands-section");
      const button = document.getElementById("add-land-btn");
      if (section && button) {
        button.addEventListener("click", () => addLand(section));
      } else {
        console.warn("❌ Button or section not found at timeout");
      }
    }, 0);
  }
if (role.includeDimensions) {
    const dimensionsWrapper = document.createElement("div");
    dimensionsWrapper.id = "cargo-dimensions";
    dimensionsWrapper.innerHTML = `
      <label>Cargo dimensions (m):</label>
      <div>
        <label>Height: <input type="number" style="width:30%" name="cargoDimensionsHeight" step="0.01" min="0" required /></label>
        <label>Width: <input type="number"  style="width:30%" name="cargoDimensionsWidth" step="0.01" min="0" required /></label>
        <label>Length: <input type="number"  style="width:30%" name="cargoDimensionsLength" step="0.01" min="0" required /></label>
      </div>
    `;
    extraFields.appendChild(dimensionsWrapper);
  }
  // Schedule
  if (role.includeSchedule) {
    const sched = document.createElement("div");
    sched.id = "schedule-container";
    sched.innerHTML = `
      <table><thead><tr>
        <th>Shift/Day</th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
      </tr></thead><tbody></tbody></table>
    `;
    extraFields.appendChild(sched);
    await initSchedule(sched);
  }

  
  extraFields.innerHTML += `
    <div class="agreement">
      <label><input type="checkbox" name="agreement" required /> I certify that all information is accurate.</label>
    </div>
  `;

  form.innerHTML += `<button type="submit" style= "background-color :rgb(46, 164, 73);";>Submit Application</button>`;
  container.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const reserved = ["role", "submittedAt", "agreement"];

    const ReqBody = {
      certifyAccuracy: formData.get("agreement") === "on",
      submittedAt: new Date().toISOString(),
      role: roleName,
      extraFields: {},
    };

    if (document.getElementById("schedule-container")) {
      ReqBody.extraFields.scheduleBitmask = await getScheduleBitmaskArray(
        document.getElementById("schedule-container")
      );
    }
    if (document.getElementById("cargo-dimensions")) {
      ReqBody.extraFields.cargoDimensions = {
        height: formData.get("cargoDimensionsHeight"),
        width: formData.get("cargoDimensionsWidth"),
        length: formData.get("cargoDimensionsLength"),

      };
      ReqBody.extraFields.cargoDimensionsHeight = formData.get("cargoDimensionsHeight");
      ReqBody.extraFields.cargoDimensionsWidth = formData.get("cargoDimensionsWidth");
      ReqBody.extraFields.cargoDimensionsLength = formData.get("cargoDimensionsLength");
    }

    if (role.includeLand) {
      const lands = [];

      document.querySelectorAll(".land-block").forEach((block, i) => {
        const get = (name) =>
          block.querySelector(`[name="land[${i}][${name}]"]`)?.value;
        lands.push({
          landName: get("customName") || `Land ${i + 1}`,
          ownership: get("ownership"),
          acres: get("acres"),
          pickupAddress: get("pickupAddress"),
          pickupLat: get("pickupLat"),
          pickupLng: get("pickupLng"),
          location: get("location"),
          locLat: get("locLat"),
          locLng: get("locLng"),
        });
      });
      ReqBody.extraFields.lands = lands;
      ReqBody.extraFields.agreementPercentage = 60;
    }

    for (let [key, val] of formData.entries()) {
      if (!reserved.includes(key) && !key.startsWith("land[")) {
        if (val === "on") ReqBody.extraFields[key] = true;
        else if (!isNaN(val) && val.trim() !== "")
          ReqBody.extraFields[key] = Number(val);
        else if (val.startsWith("{") || val.startsWith("[")) {
          try {
            ReqBody.extraFields[key] = JSON.parse(val);
          } catch {
            ReqBody.extraFields[key] = val;
          }
        } else {
          ReqBody.extraFields[key] = val;
        }
      }
    }

    // Optional renaming
    const mapKeys = {
      "Vehicle_Capacity_(t)": "vehicleCapacity",
    };

    Object.entries(mapKeys).forEach(([oldK, newK]) => {
      if (oldK in ReqBody.extraFields) {
        ReqBody.extraFields[newK] = ReqBody.extraFields[oldK];
        delete ReqBody.extraFields[oldK];
      }
    });

    // Remove leftover raw weekday shift fields from extraFields
    const rawDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    rawDays.forEach((day) => {
      delete ReqBody.extraFields[day];
    });

    const response = await fetch(
      "http://localhost:4000/api/auth/register-employee",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ReqBody),
      }
    );

    const resData = await response.json();
    if (response.ok) {
      alert(resData.message || "Application submitted!");
      window.location.href = "market.html";
    } else {
      alert("Error: " + (resData.error || "Unknown"));
    }
  });
}

function toCamelCase(label) {
  return label
    .replace(/\(.*?\)/g, "") // Remove anything in parentheses (e.g., "(t)")
    .replace(/[^a-zA-Z0-9 ]/g, "") // Remove special characters (keep letters/numbers/spaces)
    .trim()
    .split(/\s+/) // Split by space
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

let landIndex = 0;
window.addLand = function (landsSection) {
  if (!landsSection) return;

  const index = landIndex++; // use current index, then increment
  const block = document.createElement("div");
  block.className = "land-block";

  block.innerHTML = `
    <h5>Land ${index + 1}</h5>

    <!-- Custom Name -->
    <label>Custom Name:
      <input type="text" name="land[${index}][customName]" placeholder="Land ${
    index + 1
  }" />
    </label><br/>

    <!-- Ownership Dropdown -->
    <label>Ownership:
      <select name="land[${index}][ownership]">
        <option value="Owned">Owned</option>
        <option value="Rented">Rented</option>
      </select>
    </label><br/>

    <!-- Acres -->
    <label>Acres:
      <input type="number" step="any" name="land[${index}][acres]" />
    </label><br/>

    <!-- Pickup Address -->
    <label>Pickup Address:
      <input type="text" name="land[${index}][pickupAddress]" placeholder="Click to pick on map" readonly style="cursor:pointer; background:#f9f9f9;" />
    </label>
    <input type="hidden" name="land[${index}][pickupLat]" />
    <input type="hidden" name="land[${index}][pickupLng]" /><br/>

    <!-- Location -->
    <label>Location:
      <input type="text" name="land[${index}][location]" placeholder="Click to pick on map" readonly style="cursor:pointer; background:#f9f9f9;" />
    </label>
    <input type="hidden" name="land[${index}][locLat]" />
    <input type="hidden" name="land[${index}][locLng]" /><br/>

    <!-- Delete button -->
    <button type="button" class="delete-land-btn" style="margin-top:5px; background:#d9534f; color:white; border:none; padding:5px 10px; cursor:pointer;">Delete Land</button>
    <hr/>
  `;

  landsSection.appendChild(block);

  // Bind delete button
  block.querySelector(".delete-land-btn").addEventListener("click", () => {
    landsSection.removeChild(block);
  });

  // === MAP BINDINGS ===
  // Pickup address click
  const pickupInput = block.querySelector(
    `[name="land[${index}][pickupAddress]"]`
  );
  const pickupLatInput = block.querySelector(
    `[name="land[${index}][pickupLat]"]`
  );
  const pickupLngInput = block.querySelector(
    `[name="land[${index}][pickupLng]"]`
  );

  pickupInput.addEventListener("click", () => {
    openMapPicker((location) => {
      pickupInput.value = location.address;
      pickupLatInput.value = location.latitude;
      pickupLngInput.value = location.longitude;
    });
  });

  // Location click
  const locInput = block.querySelector(`[name="land[${index}][location]"]`);
  const locLatInput = block.querySelector(`[name="land[${index}][locLat]"]`);
  const locLngInput = block.querySelector(`[name="land[${index}][locLng]"]`);

  locInput.addEventListener("click", () => {
    openMapPicker((location) => {
      locInput.value = location.address;
      locLatInput.value = location.latitude;
      locLngInput.value = location.longitude;
    });
  });
};

const capitalize = (w) => w && w[0].toUpperCase() + w.slice(1);
