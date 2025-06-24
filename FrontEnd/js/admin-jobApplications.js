import { getCurrentUserToken } from "../js/firebase-init.js";

// ====== Local Role Definitions ======
const mockRoles = [
  {
    name: "deliverer",
    description: "Responsible for transporting shipments.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "License Number", type: "text" },
      { label: "Vehicle Type", type: "text" },
      { label: "Bank Account", type: "text" },
      { label: "Bank Name", type: "text" },
      { label: "Driver License Doc", type: "file" },
      { label: "Vehicle Registration", type: "file" },
    ],
  },
  {
    name: "picker",
    description: "Packages and labels containers before shipping.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "Years of Experience", type: "text" },
      { label: "Preferred Shift", type: "text" },
      { label: "Bank Account", type: "text" },
      { label: "Bank Name", type: "text" },
      { label: "Resume", type: "file" },
    ],
  },
  {
    name: "industrial-driver",
    description: "delivering goods from farms to logistic center",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "Years of Experience", type: "text" },
      { label: "Previous Company", type: "text" },
      { label: "Bank Account", type: "text" },
      { label: "Bank Name", type: "text" },
      { label: "Resume", type: "file" },
    ],
  },
  {
    name: "farmer",
    description: "Supplies produce and quality reports.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "Farm Name", type: "text" },
      { label: "Experience", type: "text" },
      { label: "Bank Account", type: "text" },
      { label: "Bank Name", type: "text" },
      { label: "ID Document", type: "file" },
      { label: "Bank Statement", type: "file" },
    ],
  },
  {
    name: "sorting",
    description: "general worker in the logistics center , sorting employee.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
  {
    name: "warehouse-worker",
    description: "Operates heavy-duty vehicles and equipment.",
    fields: [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ],
  },
];

let applicationsFromBackend = [];

// ====== DOM Ready ======
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  renderRolesTable();
  setupRoleEditorHandlers();
  setupAddRoleForm();
  populateRoleFilter();

  try {
    applicationsFromBackend = await fetchApplications();

    // Render each application using the new viewer
    const container = document.getElementById("applications-list");
    container.innerHTML = "";
    applicationsFromBackend.forEach((app) => {
      const card = renderDynamicApplicationCard(app);
      container.appendChild(card);
    });
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
    filtered.forEach((app) => {
      const card = renderDynamicApplicationCard(app);
      container.appendChild(card);
    });
  }
});

// ====== Tab UI ======
function setupTabs() {
  document.getElementById("tab-review").addEventListener("click", () => {
    document.getElementById("review-section").style.display = "block";
    document.getElementById("jobs-section").style.display = "none";
  });
  document.getElementById("tab-jobs").addEventListener("click", () => {
    document.getElementById("jobs-section").style.display = "block";
    document.getElementById("review-section").style.display = "none";
  });
}

// ====== Fetch Real Applications ======
async function fetchApplications() {
  const token = await getCurrentUserToken();
  const res = await fetch("http://localhost:4000/api/admin/applications", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  return await res.json();
}

function renderDynamicApplicationCard(app) {
  const card = document.createElement("div");
  card.className = "application-card";

  // === Header with basic info ===
  const header = document.createElement("div");
  header.className = "application-header";
  header.innerHTML = `
    <span><strong>Position:</strong> ${app.position || "-"}</span>
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

  // === Build details table ===
  let tableHTML = "<table class='details-table'>";
  for (const [key, value] of Object.entries(app)) {
    if (["uid", "status", "position", "createdAt", "updatedAt"].includes(key))
      continue;

    let formattedValue = "";
    if (typeof value === "object" && value !== null) {
      formattedValue = formatComplexField(value);
    } else {
      formattedValue = formatVal(value);
    }

    tableHTML += `<tr><td><strong>${key}</strong></td><td>${formattedValue}</td></tr>`;
  }
  tableHTML += "</table>";

  // === Status dropdown ===
  tableHTML += `
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
        <option value="accepted"${
          app.status === "accepted" ? " selected" : ""
        }>Accepted</option>
      </select>
      <button class="save-status-btn">Save</button>
    </div>
  `;

  detailsDiv.innerHTML = tableHTML;
  card.appendChild(detailsDiv);

  // === Expand/collapse handler ===
  expandBtn.addEventListener("click", () => {
    const visible = detailsDiv.style.display === "block";
    detailsDiv.style.display = visible ? "none" : "block";
    expandBtn.textContent = visible ? "+" : "−";
  });

  // === Save button (placeholder) ===
  const saveBtn = detailsDiv.querySelector(".save-status-btn");
  saveBtn.addEventListener("click", () => {
    const newStatus = detailsDiv.querySelector(".status-select").value;
    const statusSpan = card.querySelector(".app-status");
    statusSpan.innerHTML = `<strong>Status:</strong> ${newStatus}`;
    // Make real PUT request to backend
    //the backend routes dont support this yet, so we will just fake it for now
    alert(`(FAKE) Status updated to "${newStatus}"`);
    // getCurrentUserToken().then((token) => {
    //   fetch(`http://localhost:4000/api/admin/users/${app.uid}`, {
    //     method: "PUT",
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ status: newStatus }),
    //   })
    //     .then((res) => {
    //       if (!res.ok) throw new Error("Failed to update status");
    //       statusSpan.innerHTML = `<strong>Status:</strong> ${newStatus}`;
    //       alert("Status updated successfully!");
    //     })
    //     .catch((err) => {
    //       console.error(err);
    //       alert("Failed to update status.");
    //     });
    // });
  });

  return card;
}

// === Utility to render objects/arrays ===
function formatComplexField(obj) {
  if (Array.isArray(obj)) {
    return obj.join(", ");
  }
  if (typeof obj === "object") {
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("<br>");
  }
  return String(obj);
}

// === Format basic values (e.g., links) ===
function formatVal(val) {
  if (typeof val === "string" && val.startsWith("http")) {
    return `<a href="${val}" target="_blank">View</a>`;
  }
  return val;
}

async function updateApplicationStatus(id, status) {
  const token = await getCurrentUserToken();
  const res = await fetch(
    `http://localhost:4000/api/admin/applications/${id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) throw new Error("Failed to update application status");
}

// ====== Populate Role Filter ======
function populateRoleFilter() {
  const filter = document.getElementById("filter-role");
  filter.innerHTML = "<option value=''>All Roles</option>";
  mockRoles.forEach((role) => {
    const opt = document.createElement("option");
    opt.value = role.name;
    opt.textContent = role.name.charAt(0).toUpperCase() + role.name.slice(1);
    filter.appendChild(opt);
  });
}

// ====== Render Roles Table ======
function renderRolesTable() {
  const tbody = document.querySelector("#roles-table tbody");
  tbody.innerHTML = "";

  mockRoles.forEach((role) => {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = role.name;
    const actionTd = document.createElement("td");
    actionTd.textContent = role.description;

    tr.appendChild(nameTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

function setupRoleEditorHandlers() {
  document.getElementById("roles-table").addEventListener("click", (e) => {
    const idx = e.target.dataset.index;
    if (e.target.classList.contains("edit-role-btn")) {
      alert("Edit form coming soon (still local data only)");
    }
    if (e.target.classList.contains("delete-role-btn")) {
      if (confirm("Delete this role?")) {
        mockRoles.splice(idx, 1);
        renderRolesTable();
      }
    }
  });
}

function setupAddRoleForm() {
  const form = document.getElementById("add-role-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document
      .getElementById("new-role-name")
      .value.trim()
      .toLowerCase();
    const desc = document.getElementById("new-role-desc").value.trim();
    if (!name || !desc) return alert("Please enter name and description");
    mockRoles.push({ name, description: desc, fields: [] });
    renderRolesTable();
    form.reset();
  });
}
