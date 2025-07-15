// ==========================================
// w_sidebar_menu.js — Dynamic Role-Based Sidebar
// ==========================================
import { auth, signOut } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const sidebar = document.querySelector("nav.sidebar");

  if (!user || !user.role || !sidebar) {
    console.warn("User role or sidebar element missing.");
    return;
  }

  const role = user.role.toLowerCase();
  const name = user.name || "User";

  let appTitle = "";
  let links = [];

  // ✅ Role-based sidebar config
  if (role === "farmer") {
    appTitle = "Farmer Panel";
    links = [
      { href: "f-dashboard.html", text: "Dashboard" },
      { href: "f-crops.html", text: "Crops" },
      { href: "f-shipments.html", text: "Orders" },
    ];
  } else if (role === "driver") {
    appTitle = "Driver Panel";
    links = [
      { href: "d_dashboard.html", text: "Dashboard" },
      { href: "d_routes.html", text: "Routes" },
      { href: "d_shipments.html", text: "Shipments" },
    ];
  } else if (role === "picker") {
    appTitle = "Picker Panel";
    links = [
      { href: "p_dashboard.html", text: "Dashboard" },
      { href: "p_tasks.html", text: "Picking Tasks" },
      { href: "p_inventory.html", text: "Inventory" },
    ];
  } else {
    appTitle = "Worker Panel";
    links = [{ href: "#", text: "Home" }];
  }

  // ✅ Add name display and logout
  links.unshift({
    href: "#",
    text: `Welcome, ${name}`,
    className: "user-greeting",
  });

  

   links.push({
    href: "../market.html",
    text: "visit market",
    id: "visit-market-link",
    className: "visit-market-link",
  });
  
  links.push({
    href: "#",
    text: "Logout",
    id: "logout-link",
    className: "logout",
  });
  // ✅ Clear and rebuild sidebar
  sidebar.innerHTML = "";

  const titleEl = document.createElement("h2");
  titleEl.textContent = appTitle;
  sidebar.appendChild(titleEl);

  const ul = document.createElement("ul");
  links.forEach((link) => {
    const li = document.createElement("li");
    if (link.className) li.classList.add(link.className);
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.text;
    if (link.id) a.id = link.id;
    li.appendChild(a);
    ul.appendChild(li);
  });

  sidebar.appendChild(ul);

  // ✅ Logout logic
  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => (window.location.href = "../login.html"))
      .catch((err) => console.error("Logout failed:", err));
  });

  document.getElementById("visit-market-link").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "../market.html";
  });
});


