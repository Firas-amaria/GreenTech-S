import { getCurrentUserToken } from "../js/firebase-init.js";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const users = await fetchUsers();
    const { employees, customers } = splitUsersByRole(users);
    renderUsersToTable(employees, "employees-table", true);
    renderUsersToTable(customers, "customers-table", false);
  } catch (error) {
    console.error("Failed to load users:", error);
  }

  // Tab switching
  document.getElementById("tab-employees").addEventListener("click", () => {
    showTab("employees");
  });
  document.getElementById("tab-customers").addEventListener("click", () => {
    showTab("customers");
  });
});

async function fetchUsers() {
  const token = await getCurrentUserToken();
  const response = await fetch("http://localhost:4000/api/admin/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

function splitUsersByRole(users) {
  const employees = users.filter((u) => u.role && u.role !== "customer");
  const customers = users.filter((u) => u.role === "customer");
  return { employees, customers };
}

// This needs to be updated and make sure we are using the correct roles pls
const allRoles = [
  "admin",
  "deliverer",
  "picker",
  "farmer",
  "farmer manager",
  "transportation manager",
  "customer service manager",
  "customer",
  "warehouse-worker",
  "industrial-driver",
  "Operation-Maneger",
];

// Create dropdown for user role
function buildRoleDropdown(currentRole) {
  const select = document.createElement("select");
  select.classList.add("role-select");

  allRoles.forEach((role) => {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    if (role === currentRole) opt.selected = true;
    select.appendChild(opt);
  });

  return select;
}

// Show user info popup
function viewUserInfo(user, isEmployee) {
  const type = isEmployee ? "Employee" : "Customer";
  alert(
    `${type} Info:\n\nID: ${user.uid}\nName: ${
      user.firstName + " " + user.lastName || "-"
    }\nEmail: ${user.email || "-"}\nRole: ${user.role || "-"}\nStatus: ${
      user.status || "-"
    }`
  );
}

// Render table with user rows
function renderUsersToTable(users, tableId, isEmployee) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";

  users.forEach((user) => {
    const tr = document.createElement("tr");

    // Name
    const nameTd = document.createElement("td");
    nameTd.textContent =
      (user.firstName || "") + " " + (user.lastName || "") || "—";
    tr.appendChild(nameTd);

    // Role with dropdown
    const roleTd = document.createElement("td");
    const roleSelect = buildRoleDropdown(user.role);
    roleSelect.addEventListener("change", () => {
      const newRole = roleSelect.value;
      updateUserRole(user.uid, newRole);
    });
    roleTd.appendChild(roleSelect);
    tr.appendChild(roleTd);

    // Actions (View Info + Delete)
    const actionsTd = document.createElement("td");

    // View Info Button
    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View Information";
    viewBtn.classList.add("view-info-btn");
    viewBtn.addEventListener("click", () => viewUserInfo(user, isEmployee));
    actionsTd.appendChild(viewBtn);

    // Delete Button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("delete-user-btn");
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.addEventListener("click", () =>
      confirmDeleteUser(user.uid, user.fullName || user.firstName)
    );
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(actionsTd);

    // ✅ FIX: Append the row to the table
    tbody.appendChild(tr);
  });
}

async function confirmDeleteUser(uid, name) {
  if (
    !confirm(
      `Are you sure you want to delete user "${name}"? This cannot be undone.`
    )
  ) {
    return;
  }

  try {
    const token = await getCurrentUserToken();
    const response = await fetch(
      `http://localhost:4000/api/admin/users/${uid}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to delete user");
    alert(`User "${name}" deleted successfully.`);
    location.reload(); // reload to refresh table
  } catch (error) {
    console.error(error);
    alert("Failed to delete user.");
  }
}

// Update user role in Firestore
async function updateUserRole(uid, newRole) {
  const token = await getCurrentUserToken();

  try {
    const response = await fetch(
      `http://localhost:4000/api/admin/users/${uid}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      }
    );

    if (!response.ok) throw new Error("Failed to update user role");
    alert("Role updated successfully!");
  } catch (error) {
    console.error("Error updating role:", error);
    alert("Failed to update role.");
  }
}

// Tab switcher
function showTab(tab) {
  document.getElementById("employees-section").style.display =
    tab === "employees" ? "block" : "none";
  document.getElementById("customers-section").style.display =
    tab === "customers" ? "block" : "none";

  document
    .getElementById("tab-employees")
    .classList.toggle("sub-active", tab === "employees");
  document
    .getElementById("tab-customers")
    .classList.toggle("sub-active", tab === "customers");
}
