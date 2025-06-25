/* employmentApplication.js - Optimized Version */

import { initSchedule, getScheduleBitmaskArray } from "./schedule.js";
import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";

document.getElementById("logout-link").addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth)
    .then(() => (window.location.href = "index.html"))
    .catch((err) => console.error("Logout failed:", err));
});

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

const getQueryParam = (name) =>
  new URLSearchParams(window.location.search).get(name);

async function renderApplicationForm() {
  const container = document.getElementById("application-form-container");
  const token = await getCurrentUserToken();

  const res = await fetch("http://localhost:4000/api/user/profile", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();

  const profile = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: "+972" + data.phone,
    address: data.address,
    birthDate: data.birthDate,
    role: data.role,
  };

  if (profile.role && profile.role !== "customer") {
    alert("You already submitted for a role.");
    return (window.location.href = "index.html");
  }

  const roleName = getQueryParam("role")?.toLowerCase();
  const role = RolesTable.find((r) => r.name === roleName);
  if (!role) {
    container.innerHTML = `<p>Invalid role: ${roleName}</p>`;
    return;
  }

  container.innerHTML = "";
  container.innerHTML += `
    <p>Ensure your personal details are up to date. If not, sign up again with correct information.</p>
    <p>We will contact you using the details below.</p>
  `;

  const form = document.createElement("form");
  form.id = "application-form";

  const createStaticField = (label, value) => `
    <div class="form-group">
      <label>${label}</label>
      <div class="static-field">${value}</div>
      <input type="hidden" name="${label
        .replace(/\s+/g, "")
        .toLowerCase()}" value="${value}" />
    </div>
  `;

  [
    ["First Name", profile.firstName],
    ["Last Name", profile.lastName],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Address", profile.address],
    ["Birth Date", profile.birthDate],
  ].forEach(
    ([label, value]) => (form.innerHTML += createStaticField(label, value))
  );

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
    input.name = field.label.replace(/\s+/g, "").toLowerCase();
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

    // Create section first
    const landsSection = document.createElement("div");
    landsSection.id = "lands-section";
    landsSection.innerHTML = `<h4>Lands</h4>`;
    extraFields.appendChild(landsSection);

    // Append button after section
    extraFields.appendChild(addBtn);

    // 🔄 Attach event listener after DOM is fully updated
    setTimeout(() => {
      const section = document.getElementById("lands-section");
      const button = document.getElementById("add-land-btn");
      if (section && button) {
        button.addEventListener("click", () => addLand(section));
        console.log("✅ Add Land button ready");
      } else {
        console.warn("❌ Button or section not found at timeout");
      }
    }, 0);
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

  form.innerHTML += `<button type="submit">Submit Application</button>`;
  container.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const reserved = [
      "uid",
      "agreement",
      "firstname",
      "lastname",
      "email",
      "phone",
      "address",
      "birthdate",
      "role",
      "submittedat",
    ];

    const ReqBody = {
      uid: auth.currentUser?.uid,
      acceptAgreement: formData.get("agreement") === "on",
      certifyAccuracy: formData.get("agreement") === "on",
      submittedAt: new Date().toISOString(),
      firstName: formData.get("firstname"),
      lastName: formData.get("lastname"),
      email: formData.get("email"),
      phone: formData.get("phone").replace(/[^+\d]/g, ""),
      address: formData.get("address"),
      birthDate: formData.get("birthdate"),
      position: formData.get("role"),
      extraFields: {},
    };

    if (document.getElementById("schedule-container")) {
      ReqBody.extraFields.scheduleBitmask = await getScheduleBitmaskArray(
        document.getElementById("schedule-container")
      );
    }

    if (role.includeLand) {
      const lands = [];
      document.querySelectorAll(".land-block").forEach((block, i) => {
        const get = (name) =>
          block.querySelector(`[name="land[${i}][${name}]"]`)?.value;
        lands.push({
          name: get("customName") || `Land #${i + 1}`,
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
    }

    for (let [key, val] of formData.entries()) {
      if (!reserved.includes(key)) {
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
      licensetype: "licenseType",
      vehiclemake: "vehicleMake",
      vehiclemodel: "vehicleModel",
      vehicletype: "vehicleType",
      year: "vehicleYear",
      "vehiclecapacity(t)": "vehicleCapacity",
      "driverlicense#": "driverLicenseNumber",
      "vehiclereg.#": "vehicleRegistrationNumber",
      vehicleinsurance: "vehicleInsurance",
      agriculturalinsurance: "agriculturalInsurance",
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
      window.location.href = "index.html";
    } else {
      alert("Error: " + (resData.error || "Unknown"));
    }
  });
}

let landIndex = 0;
window.addLand = function (landsSection) {
  if (!landsSection) return;

  const block = document.createElement("div");
  block.className = "land-block";
  block.innerHTML = `
    <h5>Land #${++landIndex}</h5>
    ${[
      "customName",
      "ownership",
      "acres",
      "pickupAddress",
      "pickupLat",
      "pickupLng",
      "location",
      "locLat",
      "locLng",
    ]
      .map(
        (field) => `<label>${capitalize(field.replace(/([A-Z])/g, " $1"))}: 
          <input type="${
            field.toLowerCase().includes("lat") ||
            field.toLowerCase().includes("lng") ||
            field === "acres"
              ? "number"
              : "text"
          }"
          step="any" name="land[${landIndex - 1}][${field}]" /></label>`
      )
      .join("<br/>")}
    
    <br/>
    <button type="button" class="delete-land-btn" style="margin-top:5px; background:#d9534f; color:white; border:none; padding:5px 10px; cursor:pointer;">Delete Land</button>
    <hr/>
  `;

  landsSection.appendChild(block);
  // Bind delete button
  block.querySelector(".delete-land-btn").addEventListener("click", () => {
    landsSection.removeChild(block);
  });
};

const capitalize = (w) => w && w[0].toUpperCase() + w.slice(1);
