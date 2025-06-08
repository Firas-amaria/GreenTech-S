// ==========================================
// js/jobApplications.js
// ==========================================

// ********** MOCK DATA **********
let mockRoles = [
  {
    name: "driver",
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
    name: "packer",
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
    name: "supervisor",
    description: "Oversees operations and staff.",
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
];

// A list of mock applications (unchanged)
const mockApplications = [
  {
    id: "APP-1001",
    role: "farmer",
    fullName: "Yossi Cohen",
    timeApplied: "2025-05-20T09:15:00Z",
    status: "pending",
    details: {
      email: "yossi@example.com",
      phone: "+972-50-1112222",
      farmName: "Green Valley Farms",
      experience: "5 years",
      bankDetails: {
        accountNumber: "IL12 3456 7890 1234 5678 901",
        bankName: "Bank Hapoalim",
      },
      documents: {
        idCard: "url-to-id-card.pdf",
        bankStatement: "url-to-bank-statement.pdf",
      },
    },
  },
  {
    id: "APP-1002",
    role: "driver",
    fullName: "Miriam Levy",
    timeApplied: "2025-05-21T11:30:00Z",
    status: "contacted",
    details: {
      email: "miriam.levy@example.com",
      phone: "+972-52-3334444",
      licenseNumber: "DR-55667788",
      vehicleType: "Truck",
      bankDetails: {
        accountNumber: "IL98 7654 3210 9876 5432 109",
        bankName: "Leumi",
      },
      documents: {
        driverLicense: "url-to-driver-license.pdf",
        vehicleRegistration: "url-to-vehicle-registration.pdf",
      },
    },
  },
  {
    id: "APP-1003",
    role: "supervisor",
    fullName: "David Mizrahi",
    timeApplied: "2025-05-22T14:45:00Z",
    status: "pending",
    details: {
      email: "david.mizrahi@example.com",
      phone: "+972-54-5556666",
      yearsOfExperience: "8 years",
      previousCompany: "LogiCorp Ltd.",
      bankDetails: {
        accountNumber: "IL22 2222 3333 4444 5555 666",
        bankName: "Discount Bank",
      },
      documents: {
        resume: "url-to-resume.pdf",
      },
    },
  },
];

// ********** HELPERS **********

// Format ISO timestamp → "YYYY-MM-DD hh:mm"
function formatTimestamp(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// ********** SUB-NAVIGATION HANDLING **********

function showReviewTab() {
  document.getElementById("tab-review").classList.add("sub-active");
  document.getElementById("tab-jobs").classList.remove("sub-active");
  document.getElementById("review-section").style.display = "block";
  document.getElementById("jobs-section").style.display = "none";
}

function showJobsTab() {
  document.getElementById("tab-jobs").classList.add("sub-active");
  document.getElementById("tab-review").classList.remove("sub-active");
  document.getElementById("jobs-section").style.display = "block";
  document.getElementById("review-section").style.display = "none";
}

// ********** RENDERING ROLES (Jobs Section) **********

// Render the roles table (Name above Description)
function renderRolesTable() {
  const tbody = document.querySelector("#roles-table tbody");
  tbody.innerHTML = "";

  mockRoles.forEach((roleObj, idx) => {
    const row = document.createElement("tr");
    row.dataset.index = idx; // store index for reference

    row.innerHTML = `
      <td class="role-name-desc">
        <strong>${roleObj.name}</strong><br>
        <em>${roleObj.description}</em>
      </td>
      <td>
        <button class="edit-role-btn" data-index="${idx}">Edit</button>
        <button class="delete-role-btn" data-index="${idx}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  populateRoleFilterOptions();
}

// Populate the "Filter by Role" dropdown (uses role name)
function populateRoleFilterOptions() {
  const select = document.getElementById("filter-role");
  select.innerHTML = '<option value="">All Roles</option>';
  mockRoles.forEach((roleObj) => {
    const opt = document.createElement("option");
    opt.value = roleObj.name;
    opt.textContent = roleObj.name.charAt(0).toUpperCase() + roleObj.name.slice(1);
    select.appendChild(opt);
  });
}

// ********** ROLE EDITOR **********

// Render the inline Role Editor beneath the role’s table row
function renderRoleEditor(idx) {
  // If an editor is already open, remove it first
  const existingEditor = document.querySelector(".role-editor-row");
  if (existingEditor) existingEditor.remove();

  const roleObj = mockRoles[idx];
  const table = document.getElementById("roles-table");
  const tbody = table.querySelector("tbody");
  const targetRow = tbody.querySelector(`tr[data-index="${idx}"]`);

  // Create a new <tr> for the editor that spans 2 columns
  const editorRow = document.createElement("tr");
  editorRow.classList.add("role-editor-row");
  editorRow.innerHTML = `
    <td colspan="2" class="editor-container">
      <div class="editor-content">
        <h3>Edit Role: "${roleObj.name}"</h3>
        <form id="edit-role-form">
          <div class="form-group">
            <label for="edit-role-name-${idx}"><strong>Title:</strong></label>
            <input type="text" id="edit-role-name-${idx}" value="${roleObj.name}" required />
          </div>
          <div class="form-group">
            <label for="edit-role-desc-${idx}"><strong>Job Description:</strong></label>
            <input type="text" id="edit-role-desc-${idx}" value="${roleObj.description}" required />
          </div>
          <h4>Applicant Form Fields</h4>
          <table id="fields-table-${idx}" class="fields-table">
            <thead>
              <tr>
                <th>Field Label</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- JS will inject existing fields here -->
            </tbody>
          </table>
          <button type="button" class="add-field-btn" data-index="${idx}">+ Add Field</button>
          <div class="editor-actions">
            <button type="submit" class="save-role-btn" data-index="${idx}">Save</button>
            <button type="button" class="cancel-edit-btn">Cancel</button>
          </div>
        </form>
      </div>
    </td>
  `;
  // Insert editorRow right after the targetRow
  targetRow.insertAdjacentElement("afterend", editorRow);

  // Populate the fields table with existing fields
  const fieldsTbody = editorRow.querySelector(`#fields-table-${idx} tbody`);
  fieldsTbody.innerHTML = "";
  roleObj.fields.forEach((fieldObj, fidx) => {
    const fieldRow = document.createElement("tr");
    fieldRow.dataset.findex = fidx;
    fieldRow.innerHTML = `
      <td>
        <input type="text" class="field-label-input" value="${fieldObj.label}" required />
      </td>
      <td>
        <select class="field-type-select">
          <option value="text" ${fieldObj.type === "text" ? "selected" : ""}>Text</option>
          <option value="email" ${fieldObj.type === "email" ? "selected" : ""}>Email</option>
          <option value="tel" ${fieldObj.type === "tel" ? "selected" : ""}>Phone</option>
          <option value="number" ${fieldObj.type === "number" ? "selected" : ""}>Number</option>
          <option value="date" ${fieldObj.type === "date" ? "selected" : ""}>Date</option>
          <option value="file" ${fieldObj.type === "file" ? "selected" : ""}>File</option>
        </select>
      </td>
      <td>
        <button type="button" class="remove-field-btn" data-index="${idx}" data-findex="${fidx}">Remove</button>
      </td>
    `;
    fieldsTbody.appendChild(fieldRow);
  });

  // Event: Add Field button
  editorRow.querySelector(`.add-field-btn`).addEventListener("click", () => {
    addNewField(idx);
  });

  // Event: Cancel button
  editorRow.querySelector(".cancel-edit-btn").addEventListener("click", () => {
    editorRow.remove();
  });

  // Event: Save Role button
  editorRow.querySelector(`#edit-role-form`).addEventListener("submit", (e) => {
    e.preventDefault();
    saveRoleChanges(idx);
  });

  // Event Delegation: Remove Field buttons
  fieldsTbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-field-btn")) {
      const fidx = parseInt(e.target.dataset.findex);
      removeField(idx, fidx);
    }
  });
}

// Add a default new field when manager clicks “+ Add Field”
function addNewField(roleIdx) {
  const editorRow = document.querySelector(".role-editor-row");
  if (!editorRow) return;
  const fieldsTbody = editorRow.querySelector(`#fields-table-${roleIdx} tbody`);

  // Add a new field object to mockRoles[roleIdx].fields
  mockRoles[roleIdx].fields.push({ label: "New Field", type: "text" });
  const newFidx = mockRoles[roleIdx].fields.length - 1;

  // Re-render the fields row
  const fieldObj = mockRoles[roleIdx].fields[newFidx];
  const fieldRow = document.createElement("tr");
  fieldRow.dataset.findex = newFidx;
  fieldRow.innerHTML = `
    <td>
      <input type="text" class="field-label-input" value="${fieldObj.label}" required />
    </td>
    <td>
      <select class="field-type-select">
        <option value="text" selected>Text</option>
        <option value="email">Email</option>
        <option value="tel">Phone</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="file">File</option>
      </select>
    </td>
    <td>
      <button type="button" class="remove-field-btn" data-index="${roleIdx}" data-findex="${newFidx}">Remove</button>
    </td>
  `;
  fieldsTbody.appendChild(fieldRow);
}

// Remove a field from a role
function removeField(roleIdx, fieldIdx) {
  mockRoles[roleIdx].fields.splice(fieldIdx, 1);
  renderRolesTable(); // re-render so that indexes update
  // Re-open the editor after re-render
  setTimeout(() => {
    renderRoleEditor(roleIdx);
  }, 0);
}

// Save changes made in the Role Editor
function saveRoleChanges(roleIdx) {
  const editorRow = document.querySelector(".role-editor-row");
  const newName = editorRow.querySelector(`#edit-role-name-${roleIdx}`).value
    .trim()
    .toLowerCase();
  const newDesc = editorRow.querySelector(`#edit-role-desc-${roleIdx}`).value.trim();

  if (!newName || !newDesc) {
    alert("Title and description cannot be empty.");
    return;
  }
  // Check for duplicate role names (excluding current)
  if (mockRoles.some((r, idx) => idx !== roleIdx && r.name === newName)) {
    alert("Another role with that title already exists.");
    return;
  }

  // Update fields from the table
  const fieldsTbody = editorRow.querySelector(`#fields-table-${roleIdx} tbody`);
  const updatedFields = [];
  fieldsTbody.querySelectorAll("tr").forEach((row) => {
    const labelInput = row.querySelector(".field-label-input").value.trim();
    const typeSelect = row.querySelector(".field-type-select").value;
    if (labelInput) {
      updatedFields.push({ label: labelInput, type: typeSelect });
    }
  });

  // Save changes to mockRoles
  mockRoles[roleIdx] = {
    name: newName,
    description: newDesc,
    fields: updatedFields,
  };

  // OPTIONAL: Send PUT to backend
  // fetch(`/api/admin/roles/${mockRoles[roleIdx].nameBeforeEdit}`, {
  //   method: "PUT",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(mockRoles[roleIdx]),
  // })
  //   .catch((err) => console.error(err));

  renderRolesTable();
}

// ********** RENDERING APPLICATIONS (Review Section) **********

function renderApplicationCard(app) {
  const card = document.createElement("div");
  card.classList.add("application-card");
  if (app.status === "denied") card.classList.add("denied-flag");
  if (app.status === "accepted") card.classList.add("accepted-flag");

  // Header row
  const headerRow = document.createElement("div");
  headerRow.classList.add("application-header");

  const infoDiv = document.createElement("div");
  infoDiv.classList.add("app-info");
  infoDiv.innerHTML = `
    <span class="app-role"><strong>Role:</strong> ${app.role}</span>
    <span class="app-name"><strong>Name:</strong> ${app.fullName}</span>
    <span class="app-time"><strong>Applied:</strong> ${formatTimestamp(app.timeApplied)}</span>
    <span class="app-status"><strong>Status:</strong> ${app.status}</span>
  `;

  const expandBtn = document.createElement("button");
  expandBtn.classList.add("expand-app-btn");
  expandBtn.textContent = "+";
  expandBtn.title = "Review Application";

  headerRow.appendChild(infoDiv);
  headerRow.appendChild(expandBtn);
  card.appendChild(headerRow);

  // Details (hidden by default)
  const detailsDiv = document.createElement("div");
  detailsDiv.classList.add("app-details");
  detailsDiv.style.display = "none";

  // Build details HTML (unchanged from previous version)
  const d = app.details;
  let inner = `
    <h3>Application ID: ${app.id}</h3>
    <table class="details-table">
      <tr>
        <td><strong>Email:</strong></td>
        <td>${d.email}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="emailVerified"> Verify Email</label></td>
      </tr>
      <tr>
        <td><strong>Phone:</strong></td>
        <td>${d.phone}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="phoneVerified"> Verify Phone</label></td>
      </tr>
  `;

  if (app.role === "farmer") {
    inner += `
      <tr>
        <td><strong>Farm Name:</strong></td>
        <td>${d.farmName}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="farmNameVerified"> Verify Farm Name</label></td>
      </tr>
      <tr>
        <td><strong>Experience:</strong></td>
        <td>${d.experience}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="experienceVerified"> Verify Experience</label></td>
      </tr>
      <tr>
        <td><strong>Bank Account:</strong></td>
        <td>${d.bankDetails.accountNumber}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="bankVerified"> Verify Bank Details</label></td>
      </tr>
      <tr>
        <td><strong>Bank Name:</strong></td>
        <td>${d.bankDetails.bankName}</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>ID Document:</strong></td>
        <td><a href="${d.documents.idCard}" target="_blank">View Document</a></td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="docIDVerified"> Verify ID Doc</label></td>
      </tr>
      <tr>
        <td><strong>Bank Statement:</strong></td>
        <td><a href="${d.documents.bankStatement}" target="_blank">View Statement</a></td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="docBankVerified"> Verify Bank Statement</label></td>
      </tr>
    `;
  }

  if (app.role === "driver") {
    inner += `
      <tr>
        <td><strong>License #:</strong></td>
        <td>${d.licenseNumber}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="licenseVerified"> Verify License</label></td>
      </tr>
      <tr>
        <td><strong>Vehicle Type:</strong></td>
        <td>${d.vehicleType}</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Bank Account:</strong></td>
        <td>${d.bankDetails.accountNumber}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="bankVerified"> Verify Bank Details</label></td>
      </tr>
      <tr>
        <td><strong>Bank Name:</strong></td>
        <td>${d.bankDetails.bankName}</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Driver License Doc:</strong></td>
        <td><a href="${d.documents.driverLicense}" target="_blank">View Document</a></td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="docLicenseVerified"> Verify License Doc</label></td>
      </tr>
      <tr>
        <td><strong>Vehicle Registration:</strong></td>
        <td><a href="${d.documents.vehicleRegistration}" target="_blank">View Document</a></td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="docVehicleVerified"> Verify Vehicle Doc</label></td>
      </tr>
    `;
  }

  if (app.role === "supervisor") {
    inner += `
      <tr>
        <td><strong>Experience:</strong></td>
        <td>${d.yearsOfExperience}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="experienceVerified"> Verify Experience</label></td>
      </tr>
      <tr>
        <td><strong>Previous Company:</strong></td>
        <td>${d.previousCompany}</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Bank Account:</strong></td>
        <td>${d.bankDetails.accountNumber}</td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="bankVerified"> Verify Bank Details</label></td>
      </tr>
      <tr>
        <td><strong>Bank Name:</strong></td>
        <td>${d.bankDetails.bankName}</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Resume:</strong></td>
        <td><a href="${d.documents.resume}" target="_blank">View Resume</a></td>
        <td><label><input type="checkbox" class="verify-checkbox" data-field="docResumeVerified"> Verify Resume</label></td>
      </tr>
    `;
  }

  inner += `</table>`;

  // Status update row
  inner += `
    <div class="status-update-section">
      <label for="status-select-${app.id}"><strong>Update Status:</strong></label>
      <select id="status-select-${app.id}" class="status-select">
        <option value="pending"${app.status === "pending" ? " selected" : ""}>Pending</option>
        <option value="contacted"${app.status === "contacted" ? " selected" : ""}>Contacted</option>
        <option value="denied"${app.status === "denied" ? " selected" : ""}>Denied</option>
        <option value="accepted"${app.status === "accepted" ? " selected" : ""}>Accepted</option>
      </select>
      <button class="save-status-btn" data-id="${app.id}">Save</button>
    </div>
  `;

  detailsDiv.innerHTML = inner;
  card.appendChild(detailsDiv);

  // Toggle expand/collapse
  expandBtn.addEventListener("click", () => {
    const isVisible = detailsDiv.style.display === "block";
    detailsDiv.style.display = isVisible ? "none" : "block";
    expandBtn.textContent = isVisible ? "+" : "−";
  });

  // Save status & verifications
  const saveBtn = detailsDiv.querySelector(".save-status-btn");
  saveBtn.addEventListener("click", () => {
    const select = document.getElementById(`status-select-${app.id}`);
    const newStatus = select.value;
    app.status = newStatus; // update mock

    const checkboxes = detailsDiv.querySelectorAll(".verify-checkbox");
    const verifications = {};
    checkboxes.forEach((cb) => {
      verifications[cb.dataset.field] = cb.checked;
    });

    // OPTIONAL: PUT to backend
    // fetch(`/api/admin/applications/${app.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ status: newStatus, verifications })
    // })
    //   .catch(err => console.error(err));

    alert(`(FAKE) Saved status="${newStatus}" and verifications for ${app.id}`);
    const statusSpan = card.querySelector(".app-status");
    statusSpan.innerHTML = `<strong>Status:</strong> ${newStatus}`;
  });

  return card;
}

// Populate all applications (sorted oldest first)
function populateApplicationsList(applications) {
  const container = document.getElementById("applications-list");
  container.innerHTML = "";

  const sorted = applications
    .slice()
    .sort((a, b) => new Date(a.timeApplied) - new Date(b.timeApplied));

  sorted.forEach((app) => {
    const cardEl = renderApplicationCard(app);
    container.appendChild(cardEl);
  });
}

// Filter applications by selected role
function applyAppFilter() {
  const selectedRole = document.getElementById("filter-role").value;
  let filtered = mockApplications.slice();
  if (selectedRole) {
    filtered = filtered.filter((app) => app.role === selectedRole);
  }
  populateApplicationsList(filtered);
}

// ********** INITIALIZATION **********

document.addEventListener("DOMContentLoaded", () => {
  // Sub-nav logic
  document.getElementById("tab-review").addEventListener("click", (e) => {
    e.preventDefault();
    showReviewTab();
  });
  document.getElementById("tab-jobs").addEventListener("click", (e) => {
    e.preventDefault();
    showJobsTab();
  });
  showReviewTab(); // default

  // 1) Render roles table
  renderRolesTable();

  // 2) Setup Add Role form, but now auto–open the editor
  document.getElementById("add-role-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("new-role-name");
    const descInput = document.getElementById("new-role-desc");
    const newName = nameInput.value.trim().toLowerCase();
    const newDesc = descInput.value.trim();
    if (!newName || !newDesc) {
      alert("Both title and description are required.");
      return;
    }
    if (mockRoles.some((r) => r.name === newName)) {
      alert("Role already exists.");
      return;
    }
    // Default fields: Full Name, Email, Phone
    const defaultFields = [
      { label: "Full Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
    ];
    mockRoles.push({ name: newName, description: newDesc, fields: defaultFields });
    // OPTIONAL: POST to backend
    // fetch('/api/admin/roles', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name: newName, description: newDesc, fields: defaultFields })
    // })
    //   .catch(err => console.error(err));

    renderRolesTable();
    nameInput.value = "";
    descInput.value = "";

    // Immediately switch to Jobs tab and open the editor for the newly added role:
    showJobsTab();
    const newIndex = mockRoles.length - 1;
    // Slight delay to ensure renderRolesTable() has updated the DOM
    setTimeout(() => {
      renderRoleEditor(newIndex);
    }, 0);
  });

  // 3) Setup Edit/Delete actions for roles
  document.getElementById("roles-table").addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-role-btn")) {
      const idx = parseInt(e.target.dataset.index);
      renderRoleEditor(idx);
    }
    if (e.target.classList.contains("delete-role-btn")) {
      const idx = parseInt(e.target.dataset.index);
      const roleToDelete = mockRoles[idx].name;
      if (confirm(`Delete role "${roleToDelete}"?`)) {
        mockRoles.splice(idx, 1);
        // OPTIONAL: DELETE to backend
        // fetch(`/api/admin/roles/${roleToDelete}`, { method: 'DELETE' })
        //   .catch(err => console.error(err));
        renderRolesTable();
      }
    }
  });

  // 4) Populate role filter dropdown
  populateRoleFilterOptions();

  // 5) Render application list
  populateApplicationsList(mockApplications);

  // 6) Wire up “Apply Filters” button
  document.getElementById("apply-app-filters").addEventListener("click", applyAppFilter);

  // OPTIONAL: If fetching from real API
  // fetch('/api/admin/applications')
  //   .then(res => res.json())
  //   .then(data => {
  //     mockApplications = data;
  //     populateApplicationsList(mockApplications);
  //   })
  //   .catch(err => console.error(err));
});
