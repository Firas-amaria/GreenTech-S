// -----------------------------------------------
// jobs.js
// Renders a list of mock job roles and
// navigates to the application page when "Apply Now" is clicked.
// -----------------------------------------------

// Mock roles data
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
// jobs.js

import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";
console.log("jobs.js loaded"); // <-- add this line temporarily

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user);
    // You can store user details in localStorage/sessionStorage if needed
  } else {
    console.log("No user logged in, redirecting...");
    window.location.href = "login.html"; // Redirect to login page
  }
});

document.getElementById("logout-link").addEventListener("click", () => {
  signOut(auth);
  alert("loged out");
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded"); // <-- another check

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
      console.log(auth.currentUser);
      if (auth.currentUser) {
        window.location.href = `employmentApplication.html?role=${encodeURIComponent(
          role.name
        )}`;
      } else {
        alert("please login");
        window.location.href = "login.html";
      }
    });

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(button);
    container.appendChild(card);
  });
});
