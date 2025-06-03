// -----------------------------------------------
// jobs.js
// Renders a list of mock job roles and
// navigates to the application page when "Apply Now" is clicked.
// -----------------------------------------------

// Mock roles data
const mockRoles = [
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
// jobs.js

console.log("jobs.js loaded");   // <-- add this line temporarily


document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");  // <-- another check

  const container = document.getElementById("jobs-container");
  if (!container) {
    console.error("jobs-container DIV not found");
    return;
  }

  mockRoles.forEach((role) => {
    const card = document.createElement("div");
    card.className = "job-card";

    const title = document.createElement("h2");
    title.textContent = role.name.charAt(0).toUpperCase() + role.name.slice(1);

    const desc = document.createElement("p");
    desc.textContent = role.description;

    const button = document.createElement("button");
    button.textContent = "Apply Now";
    button.addEventListener("click", () => {
      window.location.href = `employmentApplication.html?role=${encodeURIComponent(role.name)}`;
    });

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(button);
    container.appendChild(card);
  });
});
