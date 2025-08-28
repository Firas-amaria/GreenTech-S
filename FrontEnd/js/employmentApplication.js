/* employmentApplication.js — Updated for deliverer nested fields & schedule */

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

/** ========= ROLE DEFINITIONS =========
 *  - deliverer & industrialDriver now collect:
 *      vehicle.* , cargoDimensionsCm(width/height/length in cm),
 *      limitKg, speedKmH, optional cost(fixed/perKm/perStop), notes
 *  - cost is OPTIONAL; backend will default when omitted
 */
const RolesTable = [
  {
    name: "deliverer",
    description: "Responsible for transporting shipments.",
    includeSchedule: true,
    includeLand: false,
    fields: [
      // Identity / legal
      { label: "License Type", type: "text", required: true },
      { label: "Driver License Number", type: "text", required: true },
      {
        label: "Vehicle Registration Number",
        type: "text",
        pattern: "[0-9]+",
        required: true,
      },

      // Vehicle details
      { label: "Vehicle Make", type: "text", required: true },
      { label: "Vehicle Model", type: "text", required: true },
      { label: "Vehicle Type", type: "text", required: true }, // e.g. Hatchback, Small Van
      { label: "Vehicle Year", type: "number", required: true },
      { label: "Vehicle Insurance", type: "checkbox", required: true },

      // Cargo dimensions (cm)
      {
        label: "Cargo Width (cm)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },
      {
        label: "Cargo Height (cm)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },
      {
        label: "Cargo Length (cm)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },

      // Limits & speed
      {
        label: "Payload Limit (kg)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },
      {
        label: "Speed (km/h)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },

      // Pricing (optional — leave blank to use backend defaults)
      {
        label: "Cost Fixed",
        type: "number",
        step: "0.01",
        min: "0",
        required: false,
      },
      {
        label: "Cost per Km",
        type: "number",
        step: "0.01",
        min: "0",
        required: false,
      },
      {
        label: "Cost per Stop",
        type: "number",
        step: "0.01",
        min: "0",
        required: false,
      },

      // Notes (optional)
      { label: "Notes", type: "text", required: false },
    ],
  },
  {
    name: "industrialDriver",
    description: "Delivers goods from farms to the logistics center.",
    includeSchedule: true,
    includeLand: false,
    fields: [
      { label: "License Type", type: "text", required: true },
      { label: "Driver License Number", type: "text", required: true },
      {
        label: "Vehicle Registration Number",
        type: "text",
        pattern: "[0-9]+",
        required: true,
      },

      { label: "Vehicle Make", type: "text", required: true },
      { label: "Vehicle Model", type: "text", required: true },
      { label: "Vehicle Type", type: "text", required: true },
      { label: "Vehicle Year", type: "number", required: true },
      { label: "Vehicle Insurance", type: "checkbox", required: true },

      {
        label: "Cargo Width (cm)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },
      {
        label: "Cargo Height (cm)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },
      {
        label: "Cargo Length (cm)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },

      {
        label: "Payload Limit (kg)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },
      {
        label: "Speed (km/h)",
        type: "number",
        step: "1",
        min: "1",
        required: true,
      },

      {
        label: "Cost Fixed",
        type: "number",
        step: "0.01",
        min: "0",
        required: false,
      },
      {
        label: "Cost per Km",
        type: "number",
        step: "0.01",
        min: "0",
        required: false,
      },
      {
        label: "Cost per Stop",
        type: "number",
        step: "0.01",
        min: "0",
        required: false,
      },

      { label: "Notes", type: "text", required: false },
      // If you still want “Refrigerated”, add it back here; schedule snapshot won’t store it.
      // { label: "Refrigerated", type: "checkbox", required: false },
    ],
  },
  {
    name: "farmer",
    description: "Supplies produce and quality reports.",
    includeSchedule: false,
    includeLand: true,
    fields: [
      { label: "Agricultural Insurance", type: "checkbox", required: true },
      { label: "Farm Name", type: "text", required: true },
    ],
  },
  {
    name: "picker",
    description: "Packages and labels containers before shipping.",
    includeSchedule: false,
    includeLand: false,
    fields: [{ label: "Years of Experience", type: "text", required: true }],
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
    const user = JSON.parse(userRaw);
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

    window.initMap = () => {
      console.log("✅ Google Maps callback fired on farmer application");
      initMapPicker();
    };
  }

  const form = document.createElement("form");
  form.id = "application-form";
  form.innerHTML += `<input type="hidden" name="role" value="${role.name}" />`;

  const extraFields = document.createElement("div");
  extraFields.id = "extra-fields";
  form.appendChild(extraFields);

  // Render role-specific fields
  role.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";

    const label = document.createElement("label");
    label.textContent = field.label;

    const input = document.createElement("input");
    input.type = field.type;
    input.name = toCamelCase(field.label);
    if (field.required !== false) input.required = true; // default required=true unless explicitly false
    if (field.step) input.step = field.step;
    if (field.min) input.min = field.min;
    if (field.pattern) input.pattern = field.pattern;

    if (field.type === "checkbox") label.prepend(input);
    else label.appendChild(input);

    wrapper.appendChild(label);
    extraFields.appendChild(wrapper);
  });

  // Land section (farmer only)
  if (role.includeLand) {
    const landsSection = document.createElement("div");
    landsSection.id = "lands-section";
    landsSection.innerHTML = `<h4>Lands</h4>`;
    extraFields.appendChild(landsSection);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "add-land-btn";
    addBtn.textContent = "Add Land";
    addBtn.style.cssText = "background-color:#28a745;";
    extraFields.appendChild(addBtn);

    setTimeout(() => {
      const section = document.getElementById("lands-section");
      const button = document.getElementById("add-land-btn");
      if (section && button) {
        button.addEventListener("click", () => addLand(section));
      }
    }, 0);
  }

  // Schedule (for roles with includeSchedule)
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

  // Agreement
  extraFields.innerHTML += `
    <div class="agreement">
      <label><input type="checkbox" name="agreement" required /> I certify that all information is accurate.</label>
    </div>
  `;

  form.innerHTML += `<button type="submit" style="background-color:rgb(46, 164, 73);">Submit Application</button>`;
  container.appendChild(form);

  // ===== Submit =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = await getCurrentUserToken();
    const formData = new FormData(form);

    const reserved = ["role", "submittedAt", "agreement"];

    // Base request body
    const ReqBody = {
      certifyAccuracy: formData.get("agreement") === "on",
      submittedAt: new Date().toISOString(),
      role: roleName,
      extraFields: {},
    };

    // ScheduleBitmask if present
    if (document.getElementById("schedule-container")) {
      ReqBody.extraFields.scheduleBitmask = await getScheduleBitmaskArray(
        document.getElementById("schedule-container")
      );
    }

    // Farmer lands
    if (role.includeLand) {
      const lands = [];
      document.querySelectorAll(".land-block").forEach((block, i) => {
        const get = (name) =>
          block.querySelector(`[name="land[${i}][${name}]"]`)?.value;
        lands.push({
          landName: get("customName") || `Land ${i + 1}`,
          ownership: get("ownership"),
          acres: numOrNull(get("acres")),
          pickupAddress: get("pickupAddress"),
          pickupLat: numOrNull(get("pickupLat")),
          pickupLng: numOrNull(get("pickupLng")),
          location: get("location"),
          locLat: numOrNull(get("locLat")),
          locLng: numOrNull(get("locLng")),
        });
      });
      ReqBody.extraFields.lands = lands;
      ReqBody.extraFields.agreementPercentage = 60;
    }

    // === Gather ALL inputs into a temp flat object ===
    const flat = {};
    for (let [key, val] of formData.entries()) {
      if (reserved.includes(key) || key.startsWith("land[")) continue;
      if (val === "on") flat[key] = true;
      else if (val.trim() === "")
        flat[key] = ""; // keep empty for optional handling
      else if (!isNaN(val)) flat[key] = Number(val);
      else if (val.startsWith("{") || val.startsWith("[")) {
        try {
          flat[key] = JSON.parse(val);
        } catch {
          flat[key] = val;
        }
      } else {
        flat[key] = val;
      }
    }

    // === Build NESTED extraFields for deliverer-like roles ===
    if (
      role.includeSchedule &&
      (role.name === "deliverer" || role.name === "industrialDriver")
    ) {
      const vehicle = {
        make: strOrNull(flat.vehicleMake),
        model: strOrNull(flat.vehicleModel),
        type: strOrNull(flat.vehicleType),
        year: numOrNull(flat.vehicleYear),
        registrationNumber: strOrNull(flat.vehicleRegistrationNumber),
        insured: !!flat.vehicleInsurance,
        // refrigerated: !!flat.refrigerated, // uncomment if you add the field back
      };

      const cargoDimensionsCm = {
        width: numOrNull(flat.cargoWidthCm),
        height: numOrNull(flat.cargoHeightCm),
        length: numOrNull(flat.cargoLengthCm),
      };

      const limitKg = numOrNull(flat.payloadLimitKg);
      const speedKmH = numOrNull(flat.speedKmh); // note: name from "Speed (km/h)" → speedKmh

      // Only include cost if user filled at least one field; backend will default otherwise
      const costFilled =
        flat.costFixed !== "" ||
        flat.costPerKm !== "" ||
        flat.costPerStop !== "";
      const cost = costFilled
        ? {
            fixed: numOrNull(flat.costFixed),
            perKm: numOrNull(flat.costPerKm),
            perStop: numOrNull(flat.costPerStop),
          }
        : undefined;

      const notes = strOrNull(flat.notes);

      ReqBody.extraFields = {
        ...ReqBody.extraFields, // preserve lands/scheduleBitmask if any
        licenseType: strOrNull(flat.licenseType),
        driverLicenseNumber: strOrNull(flat.driverLicenseNumber),
        vehicle,
        cargoDimensionsCm,
        limitKg,
        speedKmH,
        ...(cost ? { cost } : {}),
        ...(notes ? { notes } : {}),
      };
    } else {
      // Non-deliverer roles: keep flat extras (minus reserved & land)
      Object.entries(flat).forEach(([k, v]) => {
        // skip empty optional cost fields if someone navigated roles back/forth
        if (k.startsWith("cost") && v === "") return;
        ReqBody.extraFields[k] = v;
      });
    }

    // Remove raw weekday keys if any leaked (defensive)
    [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ].forEach((day) => {
      delete ReqBody.extraFields[day];
    });

    // Submit
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
    .replace(/\(.*?\)/g, "") // Remove anything in parentheses (e.g., "(kg)")
    .replace(/[^a-zA-Z0-9 ]/g, "") // Remove special characters
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : (word[0]?.toUpperCase() || "") + word.slice(1).toLowerCase()
    )
    .join("");
}

let landIndex = 0;
window.addLand = function (landsSection) {
  if (!landsSection) return;

  const index = landIndex++;
  const block = document.createElement("div");
  block.className = "land-block";
  block.innerHTML = `
    <h5>Land ${index + 1}</h5>

    <label>Custom Name:
      <input type="text" name="land[${index}][customName]" placeholder="Land ${
    index + 1
  }" />
    </label><br/>

    <label>Ownership:
      <select name="land[${index}][ownership]">
        <option value="Owned">Owned</option>
        <option value="Rented">Rented</option>
      </select>
    </label><br/>

    <label>Acres:
      <input type="number" step="any" name="land[${index}][acres]" />
    </label><br/>

    <label>Pickup Address:
      <input type="text" name="land[${index}][pickupAddress]" placeholder="Click to pick on map" readonly style="cursor:pointer; background:#f9f9f9;" />
    </label>
    <input type="hidden" name="land[${index}][pickupLat]" />
    <input type="hidden" name="land[${index}][pickupLng]" /><br/>

    <label>Location:
      <input type="text" name="land[${index}][location]" placeholder="Click to pick on map" readonly style="cursor:pointer; background:#f9f9f9;" />
    </label>
    <input type="hidden" name="land[${index}][locLat]" />
    <input type="hidden" name="land[${index}][locLng]" /><br/>

    <button type="button" class="delete-land-btn" style="margin-top:5px; background:#d9534f; color:white; border:none; padding:5px 10px; cursor:pointer;">Delete Land</button>
    <hr/>
  `;

  landsSection.appendChild(block);

  block.querySelector(".delete-land-btn").addEventListener("click", () => {
    landsSection.removeChild(block);
  });

  // Map bindings
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

// Small helpers for shaping values
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const strOrNull = (v) => (v === "" || v == null ? null : String(v));

const capitalize = (w) => w && w[0].toUpperCase() + w.slice(1);
