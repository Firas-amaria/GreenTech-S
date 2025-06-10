// ==========================================
// js/manageUsers.js
// ==========================================

// ********** MOCK DATA **********

// A sample list of Employees
let mockEmployees = [
  { id: "EMP-001", fullName: "Alice Friedman", role: "packer" },
  { id: "EMP-002", fullName: "Barak Cohen", role: "driver" },
  { id: "EMP-003", fullName: "Carmen Levy", role: "supervisor" },
  { id: "EMP-004", fullName: "David Shapiro", role: "farmer" }
];

// A sample list of Customers
let mockCustomers = [
  { id: "CUS-001", fullName: "Eliav Katz", role: "customer" },
  { id: "CUS-002", fullName: "Fatima Nasser", role: "customer" },
  { id: "CUS-003", fullName: "Gilad Sarid", role: "customer" }
];

// Allowed roles (existing + new)
const allRoles = [
  // Existing roles (match those used elsewhere)
  "driver",
  "picker",
  
  "farmer",
  // New managerial roles
  "farmer manager",
  "transportation manager",
  "customer service manager",
  // A generic "customer" role for customers section
  "customer"
];

// ********** HELPERS **********

// Render the <select> of roles, pre-selecting `currentRole`
function buildRoleDropdown(currentRole) {
  const select = document.createElement("select");
  select.classList.add("role-select");

  allRoles.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    if (r === currentRole) opt.selected = true;
    select.appendChild(opt);
  });

  return select;
}

// Format a user’s "View Information" popup (simple alert for now)
function viewUserInfo(user, isEmployee) {
  const type = isEmployee ? "Employee" : "Customer";
  // In a real app, you might open a modal or navigate to a detail page.
  alert(`${type} Info:\n\nID: ${user.id}\nName: ${user.fullName}\nRole: ${user.role}`);
}

// ********** RENDERING TABLE ROWS **********

// Render one employee row
function renderEmployeeRow(employee) {
  const tr = document.createElement("tr");
  tr.dataset.userid = employee.id;

  // 1) Name cell
  const nameTd = document.createElement("td");
  nameTd.textContent = employee.fullName;
  tr.appendChild(nameTd);

  // 2) Role cell (dropdown)
  const roleTd = document.createElement("td");
  const roleSelect = buildRoleDropdown(employee.role);
  roleSelect.addEventListener("change", () => {
    const newRole = roleSelect.value;
    employee.role = newRole; // update mock

    // OPTIONAL: PUT to backend
    // fetch(`/api/admin/users/${employee.id}`, {
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ role: newRole })
    // })
    //   .catch((err) => console.error(err));

    alert(`(FAKE) Employee "${employee.fullName}" role changed to "${newRole}".`);
  });
  roleTd.appendChild(roleSelect);
  tr.appendChild(roleTd);

  // 3) Actions cell ("View Information" button)
  const actionsTd = document.createElement("td");
  const viewBtn = document.createElement("button");
  viewBtn.textContent = "View Information";
  viewBtn.classList.add("view-info-btn");
  viewBtn.addEventListener("click", () => viewUserInfo(employee, true));
  actionsTd.appendChild(viewBtn);
  tr.appendChild(actionsTd);

  return tr;
}

// Populate the Employees table
function populateEmployeesTable() {
  const tbody = document
    .getElementById("employees-table")
    .querySelector("tbody");
  tbody.innerHTML = "";

  mockEmployees.forEach((emp) => {
    const row = renderEmployeeRow(emp);
    tbody.appendChild(row);
  });
}

// Render one customer row
function renderCustomerRow(customer) {
  const tr = document.createElement("tr");
  tr.dataset.userid = customer.id;

  // 1) Name cell
  const nameTd = document.createElement("td");
  nameTd.textContent = customer.fullName;
  tr.appendChild(nameTd);

  // 2) Role cell (dropdown)
  const roleTd = document.createElement("td");
  const roleSelect = buildRoleDropdown(customer.role);
  roleSelect.addEventListener("change", () => {
    const newRole = roleSelect.value;
    customer.role = newRole; // update mock

    // OPTIONAL: PUT to backend
    // fetch(`/api/admin/users/${customer.id}`, {
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ role: newRole })
    // })
    //   .catch((err) => console.error(err));

    alert(`(FAKE) Customer "${customer.fullName}" role changed to "${newRole}".`);
  });
  roleTd.appendChild(roleSelect);
  tr.appendChild(roleTd);

  // 3) Actions cell ("View Information" button)
  const actionsTd = document.createElement("td");
  const viewBtn = document.createElement("button");
  viewBtn.textContent = "View Information";
  viewBtn.classList.add("view-info-btn");
  viewBtn.addEventListener("click", () => viewUserInfo(customer, false));
  actionsTd.appendChild(viewBtn);
  tr.appendChild(actionsTd);

  return tr;
}

// Populate the Customers table
function populateCustomersTable() {
  const tbody = document
    .getElementById("customers-table")
    .querySelector("tbody");
  tbody.innerHTML = "";

  mockCustomers.forEach((cust) => {
    const row = renderCustomerRow(cust);
    tbody.appendChild(row);
  });
}

// ********** SUB-NAV TOGGLING **********

function showEmployeesTab() {
  document.getElementById("tab-employees").classList.add("sub-active");
  document.getElementById("tab-customers").classList.remove("sub-active");
  document.getElementById("employees-section").style.display = "block";
  document.getElementById("customers-section").style.display = "none";
}

function showCustomersTab() {
  document.getElementById("tab-customers").classList.add("sub-active");
  document.getElementById("tab-employees").classList.remove("sub-active");
  document.getElementById("customers-section").style.display = "block";
  document.getElementById("employees-section").style.display = "none";
}

// ********** INITIALIZATION **********

document.addEventListener("DOMContentLoaded", () => {
  // Wire up sub-nav
  document.getElementById("tab-employees").addEventListener("click", (e) => {
    e.preventDefault();
    showEmployeesTab();
  });
  document.getElementById("tab-customers").addEventListener("click", (e) => {
    e.preventDefault();
    showCustomersTab();
  });
  showEmployeesTab(); // default to employees

  // Render both tables
  populateEmployeesTable();
  populateCustomersTable();
});
