import { getCurrentUserToken } from "../js/firebase-init.js";
import { renderScheduleTable } from "./schedule.js";

// ====== Local Role Definitions ======
const RolesTable = [
  {
    name: "farmer",
    description: "Supplies produce and quality reports.",
    includeSchedule: false,
    includeLand: true,
    fields: [
      { label: "Agricultural Insurance", type: "checkbox" },
      { label: "Farm Name", type: "text" },
      { label: "Agreement Percentage", type: "text" },
    ],
  },
];

let applicationsFromBackend = [];

// ====== DOM Ready ======
document.addEventListener("DOMContentLoaded", async () => {
  // renderRolesTable();
  // setupRoleEditorHandlers();
  // setupAddRoleForm();
  populateRoleFilter();

  try {
    applicationsFromBackend = await fetchApplications();

    // Render each application using the new viewer
    const container = document.getElementById("applications-list");
    container.innerHTML = "";
    for (const app of applicationsFromBackend) {
      const card = await renderDynamicApplicationCard(app);
      container.appendChild(card);
    }
  } catch (e) {
    console.error("Failed to load applications:", e);
  }

  document
    .getElementById("apply-app-filters")
    .addEventListener("click", applyFilters);
  document
    .getElementById("filter-search")
    .addEventListener("input", applyFilters); // for dynamic search

  function applyFilters() {
    const role = document.getElementById("filter-role").value;
    const timeRange = document.getElementById("filter-time").value;
    const search = document.getElementById("filter-search").value.toLowerCase();

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const oneDay = 24 * 60 * 60 * 1000;

    const filtered = applicationsFromBackend.filter((app) => {
      const matchRole = !role || app.position === role;

      const createdAt = app.createdAt ? new Date(app.createdAt) : null;
      let matchTime = true;
      if (createdAt) {
        switch (timeRange) {
          case "today":
            matchTime = createdAt >= startOfToday;
            break;
          case "yesterday":
            const startOfYesterday = new Date(startOfToday.getTime() - oneDay);
            matchTime =
              createdAt >= startOfYesterday && createdAt < startOfToday;
            break;
          case "last-week":
            const oneWeekAgo = new Date(Date.now() - 7 * oneDay);
            matchTime = createdAt >= oneWeekAgo;
            break;
          case "last-month":
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            matchTime = createdAt >= oneMonthAgo;
            break;
          case "last-year":
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            matchTime = createdAt >= oneYearAgo;
            break;
        }
      }

      const fullName = `${app.firstName || ""} ${
        app.lastName || ""
      }`.toLowerCase();
      const email = (app.email || "").toLowerCase();
      const matchSearch =
        !search || fullName.includes(search) || email.includes(search);

      return matchRole && matchTime && matchSearch;
    });

    const container = document.getElementById("applications-list");
    container.innerHTML = "";
    (async () => {
      for (const app of filtered) {
        const card = await renderDynamicApplicationCard(app);
        container.appendChild(card);
      }
    })();
  }
});

// ====== Fetch Real Applications ======
async function fetchApplications() {
  const token = await getCurrentUserToken();
  const res = await fetch(
    "http://localhost:4000/api/farmerManager/getApplications",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch applications");
  return await res.json();
}

async function renderDynamicApplicationCard(app) {
  const card = document.createElement("div");
  card.className = "application-card";
  const roleDef = RolesTable.find((r) => r.name === app.role);

  // === Header with basic info ===
  const header = document.createElement("div");
  header.className = "application-header";
  header.innerHTML = `
    <span><strong>Applied Role:</strong> ${app.role || "-"}</span>
    <span><strong>Name:</strong> ${
      (app.firstName || "") + " " + (app.lastName || "")
    }</span>
    <span class="app-status"><strong>Status:</strong> ${
      app.status || "pending"
    }</span>
  `;

  const expandBtn = document.createElement("button");
  expandBtn.className = "expand-app-btn";
  expandBtn.textContent = "+";
  header.appendChild(expandBtn);
  card.appendChild(header);

  // === Details (hidden by default) ===
  const detailsDiv = document.createElement("div");
  detailsDiv.className = "app-details";
  detailsDiv.style.display = "none";

  // === Contact + Personal Info Table ===
  let detailHTML = `
    <table class="details-table">
      <tr><td><strong>Contact Info</strong></td><td>${app.email || "-"}<br>${
    app.phone || "-"
  }</td></tr>
      <tr><td><strong>Personal Info</strong></td><td>${app.address || "-"}<br>${
    app.birthDate || "-"
  }</td></tr>
    </table>
  `;

  if (hasRoleDetails(app, roleDef)) {
    detailHTML += `<h4>Role Requirement</h4>`;
    detailHTML += `
  <table class="details-table">
    <thead>
      <tr>
        <th>Field</th>
        <th>Value</th>
        <th>Checked</th>
      </tr>
    </thead>
    <tbody>
`;

    roleDef.fields.forEach((field) => {
      const key = toCamelCase(field.label);
      const val = app.extraFields?.[key];
      detailHTML += `
    <tr>
      <td>${field.label}</td>
      <td>${formatValue(val)}</td>
      <td><input type="checkbox" class="review-checkbox" /></td>
    </tr>`;
    });

    if (roleDef.includeLand && Array.isArray(app.extraFields?.lands)) {
      detailHTML += `<tr><td>Lands</td><td>${formatLands(
        app.extraFields.lands
      )}</td><td><input type="checkbox" class="review-checkbox" /></td></tr>`;
    }
    detailHTML += `</table>`;
  }

  // === Role Requirement Section ===

  // === Submitted At ===
  const shortTime = app.submittedAt
    ? new Date(app.submittedAt).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  detailHTML += `
    <table class="details-table">
      <tr><td><strong>Submitted At</strong></td><td>${shortTime}</td></tr>
    </table>
  `;

  // === Status dropdown ===
  detailHTML += `
    <div class="status-update-section">
      <label><strong>Update Status:</strong></label>
      <select class="status-select">
        <option value="pending"${
          app.status === "pending" ? " selected" : ""
        }>Pending</option>
        <option value="contacted"${
          app.status === "contacted" ? " selected" : ""
        }>Contacted</option>
        <option value="denied"${
          app.status === "denied" ? " selected" : ""
        }>Denied</option>
        <option value="approved"${
          app.status === "approved" ? " selected" : ""
        }>Approved</option>
      </select>
      <button class="save-status-btn">Save</button>
    </div>
  `;

  detailsDiv.innerHTML = detailHTML;
  card.appendChild(detailsDiv);

  // === Expand/collapse handler ===
  expandBtn.addEventListener("click", () => {
    const visible = detailsDiv.style.display === "block";
    detailsDiv.style.display = visible ? "none" : "block";
    expandBtn.textContent = visible ? "+" : "−";
  });

  // === Save button (placeholder) ===
  const saveBtn = detailsDiv.querySelector(".save-status-btn");
  saveBtn.addEventListener("click", async () => {
    const newStatus = detailsDiv.querySelector(".status-select").value;
    const statusSpan = card.querySelector(".app-status");

    try {
      const token = await getCurrentUserToken();

      const res = await fetch(
        `http://localhost:4000/api/farmerManager/updateApplication/${app.uid}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            role: app.role || app.position, // ensure role is passed (needed for acceptance)
            firstName: app.firstName,
            lastName: app.lastName,
            phone: app.phone,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update status");

      const result = await res.json();
      statusSpan.innerHTML = `<strong>Status:</strong> ${newStatus}`;
      alert(result.message || `Status updated to "${newStatus}"`);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update status. Please try again.");
    }
  });

  return card;
}

function hasRoleDetails(app, roleDef) {
  if (!roleDef) return false;

  const fieldsHaveData = roleDef.fields.some((field) => {
    const key = toCamelCase(field.label);
    return app.extraFields?.[key] != null && app.extraFields[key] !== "";
  });

  const hasLands =
    roleDef.includeLand &&
    Array.isArray(app.extraFields?.lands) &&
    app.extraFields.lands.length > 0;

  const hasSchedule =
    roleDef.includeSchedule &&
    Array.isArray(app.extraFields?.scheduleBitmask) &&
    app.extraFields.scheduleBitmask.some((val) => val !== 0);

  return fieldsHaveData || hasLands || hasSchedule;
}

function formatValue(val) {
  if (val === true) return "✅";
  if (val === false) return "❌";
  if (typeof val === "string" && val.startsWith("http")) {
    return `<a href="${val}" target="_blank">View</a>`;
  }
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object" && val !== null)
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join("<br>");
  return val !== undefined ? val : "-";
}

function formatLands(lands) {
  if (!Array.isArray(lands)) return "-";
  return lands
    .map((land, i) => {
      return (
        `<strong>Land ${i + 1}</strong><br>` +
        Object.entries(land)
          .map(([k, v]) => `${k}: ${v}`)
          .join("<br>")
      );
    })
    .join("<hr>");
}

function toCamelCase(label) {
  return label
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}

// ====== Populate Role Filter ======
function populateRoleFilter() {
  const filter = document.getElementById("filter-role");
  filter.innerHTML = "<option value=''>All Roles</option>";
  RolesTable.forEach((role) => {
    const opt = document.createElement("option");
    opt.value = role.name;
    opt.textContent = role.name.charAt(0).toUpperCase() + role.name.slice(1);
    filter.appendChild(opt);
  });
}

// // ====== Render Roles Table ======
// function renderRolesTable() {
//   const tbody = document.querySelector("#roles-table tbody");
//   tbody.innerHTML = "";

//   RolesTable.forEach((role) => {
//     const tr = document.createElement("tr");
//     const nameTd = document.createElement("td");
//     nameTd.textContent = role.name;
//     const actionTd = document.createElement("td");
//     actionTd.textContent = role.description;

//     tr.appendChild(nameTd);
//     tr.appendChild(actionTd);
//     tbody.appendChild(tr);
//   });
// }

// function setupRoleEditorHandlers() {
//   document.getElementById("roles-table").addEventListener("click", (e) => {
//     const idx = e.target.dataset.index;
//     if (e.target.classList.contains("edit-role-btn")) {
//       alert("Edit form coming soon (still local data only)");
//     }
//     if (e.target.classList.contains("delete-role-btn")) {
//       if (confirm("Delete this role?")) {
//         RolesTable.splice(idx, 1);
//         renderRolesTable();
//       }
//     }
//   });
// }

// function setupAddRoleForm() {
//   const form = document.getElementById("add-role-form");
//   form.addEventListener("submit", (e) => {
//     e.preventDefault();
//     const name = document
//       .getElementById("new-role-name")
//       .value.trim()
//       .toLowerCase();
//     const desc = document.getElementById("new-role-desc").value.trim();
//     if (!name || !desc) return alert("Please enter name and description");
//     RolesTable.push({ name, description: desc, fields: [] });
//     renderRolesTable();
//     form.reset();
//   });
// }
