import { getCurrentUserToken } from "../js/firebase-init.js";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const users = await fetchUsers();
    renderUsersToTable(users, "employees-table", true);
  } catch (error) {
    console.error("Failed to load users:", error);
  }
});

async function fetchUsers() {
  const token = await getCurrentUserToken();
  const response = await fetch(
    "http://localhost:4000/api/farmerManager/getAllUsers",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch users");
  return await response.json();
}

// Show user info popup
function viewUserInfo(user, isEmployee) {
  const type = isEmployee ? "Employee" : "Customer";
  alert(
    `${type} Info:\n\nID: ${user.uid}\nName: ${
      user.firstName + " " + user.lastName || "-"
    }\nEmail: ${user.email || "-"}\nRole: ${user.role || "-"}\nPhone: ${
      user.phone || "-"
    }`
  );
}

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

    // Aggrement Precentage input + Save button
    const aggrementTd = document.createElement("td");

    const aggrementInput = document.createElement("input");
    aggrementInput.type = "number";
    aggrementInput.min = 0;
    aggrementInput.max = 100;
    aggrementInput.value = user.extraFields.agreementPercentage || 0;
    aggrementInput.classList.add("agreement-input");
    aggrementInput.style.marginRight = "5px";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.classList.add("save-agreement-btn");
    saveBtn.addEventListener("click", () => {
      const newValue = parseFloat(aggrementInput.value);
      updateAggrementPrecentage(user.uid, newValue);
    });

    aggrementTd.appendChild(aggrementInput);
    aggrementTd.appendChild(saveBtn);
    tr.appendChild(aggrementTd);

    // Actions (View Info only)
    const actionsTd = document.createElement("td");

    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View Information";
    viewBtn.classList.add("view-info-btn");
    viewBtn.addEventListener("click", () => viewUserInfo(user, isEmployee));
    actionsTd.appendChild(viewBtn);

    tr.appendChild(actionsTd);

    // Append to table
    tbody.appendChild(tr);
  });
}

// Update agreement precentage in farmer collection
async function updateAggrementPrecentage(uid, value) {
  const token = await getCurrentUserToken();

  try {
    const response = await fetch(
      `http://localhost:4000/api/farmerManager/updateAggrement/${uid}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agreementPercentage: value }),
      }
    );

    if (!response.ok) throw new Error("Failed to update agreement");
    alert("Agreement percentage updated!");
  } catch (error) {
    console.error("Error updating agreement:", error);
    alert("Failed to update agreement.");
  }
}
