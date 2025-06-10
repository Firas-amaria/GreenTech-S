// ==========================================
// w_sidebar_menu.js — Dynamic Worker Sidebar
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  localStorage.setItem(
    "user",
    JSON.stringify({
      fullName: "David Shapiro",
      role: "farmer", // or "driver", "picker"
    })
  );

  const user = JSON.parse(localStorage.getItem("user"));
  const sidebar = document.querySelector("nav.sidebar");

  if (!user || !user.role || !sidebar) {
    console.warn("Worker role or sidebar missing.");
    return;
  }

  const role = user.role.toLowerCase();
  let appTitle = "";
  let links = [];

  if (role === "farmer") {
    appTitle = "Farmer App";
    links = [
      { href: "f_dashboard.html", text: "Dashboard" },
      { href: "f_crops.html", text: "Crops" },
      { href: "f_shipments.html", text: "Shipments" },
    ];
  } else if (role === "driver") {
    appTitle = "Driver App";
    links = [
      { href: "d_dashboard.html", text: "Dashboard" },
      { href: "d_routes.html", text: "Routes" },
      { href: "d_shipments.html", text: "Shipments" },
    ];
  } else if (role === "picker") {
    appTitle = "Picker App";
    links = [
      { href: "p_dashboard.html", text: "Dashboard" },
      { href: "p_tasks.html", text: "Picking Tasks" },
      { href: "p_inventory.html", text: "Inventory" },
    ];
  } else {
    appTitle = "Worker App";
    links = [{ href: "#", text: "Home" }];
  }

  links.push({ href: "#", text: "Logout", id: "logoutLink2" });

  sidebar.innerHTML = ""; // Clear current sidebar

  const titleEl = document.createElement("h2");
  titleEl.textContent = appTitle;

  const ul = document.createElement("ul");
  links.forEach((link) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.text;
    if (link.id) a.id = link.id;
    li.appendChild(a);
    ul.appendChild(li);
  });

  sidebar.appendChild(titleEl);
  sidebar.appendChild(ul);
});
