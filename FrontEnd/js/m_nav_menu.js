// ==========================================
// m_nav_menu.js — Dynamic Role-Based Nav
// ==========================================
import { auth, signOut } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const nav = document.getElementById("main-nav");
  if (!nav || !user || !user.role) {
    console.warn("No user role found for nav rendering.");
    return;
  }

  const role = user.role;
  const name = user.name || "User";
  let menuItems = [];
  if (role === "admin") {
    menuItems = [
      { href: "a_dashboard.html", text: "Dashboard" },
      { href: "a_all_shipments.html", text: "Shipments" },
      { href: "a_job_applications.html", text: "Job Application Review" },
      { href: "schedule.html", text: "Schedule" },
      { href: "a_reports.html", text: "Reports" },
      { href: "a_manage_users.html", text: "Manage Users" },
    ];
  } else if (role === "transportation manager") {
    menuItems = [
      { href: "a_all_shipments.html", text: "Shipments" },
      { href: "schedule.html", text: "Schedule" },
    ];
  } else if (role === "farmerManager") {
    menuItems = [{ href: "fm-dashboard.html", text: "Dashboard" }];
    menuItems = [{ href: "fm-jobApplications.html", text: "Job Applications" }];
  } else if (role === "costumer") {
    //costumer service
    menuItems = [
      { href: "a_manage_users.html", text: "Manage Customers" },
      { href: "a_reports.html", text: "Reports" },
    ];
  } else if (role === "cs") {
    //costumer service
    menuItems = [
      { href: "a_manage_users.html", text: "Manage Customers" },
      { href: "a_reports.html", text: "Reports" },
    ];
  } else {
    menuItems = [{ href: "schedule.html", text: "Schedule" }];
  }

  menuItems.unshift({
    href: "#",
    text: `Welcome, ${name}`,
    className: "user-greeting",
  });

  // Always include Logout
  menuItems.push({
    href: "#",
    text: "Logout",
    id: "logout-link",
    className: "logout",
  });

  // Build and replace nav content
  const ul = document.createElement("ul");

  menuItems.forEach((item) => {
    const li = document.createElement("li");
    if (item.className) li.classList.add(item.className);
    const a = document.createElement("a");
    a.href = item.href;
    a.textContent = item.text;
    if (item.id) a.id = item.id;
    li.appendChild(a);
    ul.appendChild(li);
  });

  nav.innerHTML = ""; // clear existing nav
  nav.appendChild(ul);

  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => (window.location.href = "../index.html"))
      .catch((err) => console.error("Logout failed:", err));
  });
});
