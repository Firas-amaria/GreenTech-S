// ==========================================
// m_nav_menu.js — Dynamic Role-Based Nav (with submenus)
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

  // ---- 1) Define role menus WITH optional `sub` arrays ----
  /** Each item: { href, text, sub?: [{href,text}, ...], className?, id? } */
  let menuItems = [];
  if (role === "admin") {
    menuItems = [
      { href: "a_dashboard.html", text: "Dashboard" },
      { href: "a_job_applications.html", text: "Job Application Review" },
      { href: "a_all_shipments.html", text: "All Shipments" },
      { href: "a_reports.html", text: "Reports" },
      { href: "a_manage_users.html", text: "Manage Users" },
    ];
  } else if (role === "transportationManager") {
    menuItems = [
      { href: "tm-dashboard.html", text: "Dashboard" },

      // ✅ Example with submenu:
      // parent points to "By Shift" page; sub shows "All Shipments" + "Packages"
      {
        href: "tm-shift-orders.html",
        text: "Shipments",
        sub: [
          { href: "tm-shipments.html", text: "All Shipments" },
          { href: "tm-packages.html", text: "Packages" },
        ],
      },

      { href: "tm-manage-drivers.html", text: "Manage drivers" },
      { href: "tm-job-applications.html", text: "Job Applications" },

      // If you have placeholders with empty text, we’ll auto-skip them
      { href: "schedule.html", text: "" },
    ];
  } else if (role === "farmerManager") {
    menuItems = [
      { href: "fm-dashboard.html", text: "Dashboard" },
      { href: "fm-manageItems.html", text: "Manage Items" },
      { href: "fm-jobApplications.html", text: "Job Applications" },
      { href: "fm-manageUsers.html", text: "Manage Users" },
      // Example future submenu (uncomment if/when you want):
      // { href: "fm-orders.html", text: "Orders", sub: [
      //    { href: "fm-orders-pending.html", text: "Pending" },
      //    { href: "fm-orders-fulfilled.html", text: "Fulfilled" },
      // ]},
    ];
  } else if (role === "costumer") {
    menuItems = [
      { href: "a_manage_users.html", text: "Manage Customers" },
      { href: "a_reports.html", text: "Reports" },
    ];
  } else if (role === "cs") {
    menuItems = [
      { href: "a_manage_users.html", text: "Manage Customers" },
      { href: "a_reports.html", text: "Reports" },
    ];
  } else {
    menuItems = [{ href: "schedule.html", text: "Schedule" }];
  }

  // Add greeting (left)
  menuItems.unshift({ href: "#", text: `Welcome, ${name}`, className: "user-greeting" });

  // Add logout (right)
  menuItems.push({ href: "#", text: "Logout", id: "logout-link", className: "logout" });

  // ---- 2) Ensure hamburger + drawer exist in DOM once ----
  let toggleBtn = document.getElementById("nav-toggle");
  if (!toggleBtn) {
    toggleBtn = document.createElement("button");
    toggleBtn.id = "nav-toggle";
    toggleBtn.setAttribute("aria-label", "Open menu");
    toggleBtn.title = "Menu";
    toggleBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg>`;
  }

  let drawer = document.getElementById("side-drawer");
  let backdrop = document.getElementById("drawer-backdrop");
  if (!drawer) {
    drawer = document.createElement("aside");
    drawer.id = "side-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="drawer-header">
        <strong>Menu</strong>
        <button id="drawer-close" aria-label="Close menu">&times;</button>
      </div>
      <nav class="drawer-body" id="drawer-body"></nav>
    `;
    nav.parentElement.appendChild(drawer);

    backdrop = document.createElement("div");
    backdrop.id = "drawer-backdrop";
    nav.parentElement.appendChild(backdrop);
  }

  // ---- 3) Build TOP NAV from schema ----
  nav.innerHTML = ""; // reset
  nav.appendChild(toggleBtn);

  const ul = document.createElement("ul");
  ul.className = "nav-list";

  menuItems
    .filter((it) => (it.text ?? "").trim().length > 0) // skip empty text items
    .forEach((item) => {
      const li = document.createElement("li");
      if (item.className) li.classList.add(item.className);

      const a = document.createElement("a");
      a.href = item.href || "#";
      a.textContent = item.text;
      if (item.id) a.id = item.id;
      li.appendChild(a);

      // If submenu, build nested UL
      if (Array.isArray(item.sub) && item.sub.length) {
        li.classList.add("has-sub");
        const sub = document.createElement("ul");
        sub.className = "sub-menu";
        item.sub.forEach((s) => {
          if (!(s.text ?? "").trim()) return;
          const sLi = document.createElement("li");
          const sA = document.createElement("a");
          sA.href = s.href || "#";
          sA.textContent = s.text;
          sLi.appendChild(sA);
          sub.appendChild(sLi);
        });
        li.appendChild(sub);
      }

      ul.appendChild(li);
    });

  nav.appendChild(ul);

  // ---- 4) Wire Logout (top) ----
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth)
        .then(() => (window.location.href = ".../login.html"))
        .catch((err) => console.error("Logout failed:", err));
    });
  }

  // ---- 5) Hover + Click dropdowns (TOP NAV) ----
  // Hover is CSS; add click-to-toggle + outside close here.
  ul.addEventListener("click", (e) => {
    const trigger = e.target.closest(".has-sub > a");
    if (!trigger) return;

    // First click toggles open; second click can navigate (if you want)
    e.preventDefault();
    const li = trigger.parentElement;
    const isOpen = li.classList.contains("open");

    // close others
    ul.querySelectorAll(".has-sub.open").forEach((o) => o.classList.remove("open"));

    if (!isOpen) li.classList.add("open");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#main-nav .has-sub")) {
      ul.querySelectorAll(".has-sub.open").forEach((o) => o.classList.remove("open"));
    }
  });

  // ---- 6) Drawer open/close ----
  const closeBtn = drawer.querySelector("#drawer-close");

  function openDrawer() {
    drawer.classList.add("open");
    backdrop.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    backdrop.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
  }

  toggleBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // ---- 7) Build DRAWER from the same schema ----
  const drawerBody = document.getElementById("drawer-body");
  drawerBody.innerHTML = "";

  const dUL = document.createElement("ul");
  dUL.style.listStyle = "none";
  dUL.style.margin = "0";
  dUL.style.padding = "0";

  menuItems
    .filter((it) => (it.text ?? "").trim().length > 0 && !(it.className === "user-greeting"))
    .forEach((item) => {
      const dLI = document.createElement("li");

      if (Array.isArray(item.sub) && item.sub.length) {
        dLI.className = "drawer-has-sub";
        const dA = document.createElement("a");
        dA.href = item.href || "#";
        dA.textContent = item.text;
        dLI.appendChild(dA);

        const subUL = document.createElement("ul");
        subUL.className = "drawer-sub-menu";
        subUL.style.listStyle = "none";
        subUL.style.margin = "0";
        subUL.style.padding = "6px 0 6px 8px";

        item.sub.forEach((s) => {
          if (!(s.text ?? "").trim()) return;
          const sLI = document.createElement("li");
          const sA = document.createElement("a");
          sA.href = s.href || "#";
          sA.textContent = s.text;
          sLI.appendChild(sA);
          subUL.appendChild(sLI);
        });

        dLI.appendChild(subUL);
      } else {
        const dA = document.createElement("a");
        dA.href = item.href || "#";
        dA.textContent = item.text;
        if (item.id === "logout-link") dA.id = "drawer-logout";
        dLI.appendChild(dA);
      }

      dUL.appendChild(dLI);
    });

  drawerBody.appendChild(dUL);

  // Drawer: click-to-toggle submenus (plus hover via CSS)
  drawerBody.addEventListener("click", (e) => {
    const link = e.target.closest("#drawer-body .drawer-has-sub > a");
    if (!link) return;
    const parent = link.parentElement;
    if (parent && parent.classList.contains("drawer-has-sub")) {
      e.preventDefault();
      parent.classList.toggle("open");
    }
  });

  // Drawer logout
  const dLogout = drawerBody.querySelector("#drawer-logout");
  if (dLogout) {
    dLogout.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth)
        .then(() => (window.location.href = ".../login.html"))
        .catch((err) => console.error("Logout failed:", err));
    });
  }

  // ---- 8) Show hamburger if nav overflows or small screens ----
  function checkOverflow() {
    if (!ul) return;
    toggleBtn.style.display =
      (ul.scrollWidth > ul.clientWidth || window.innerWidth <= 900) ? "inline-flex" : "none";
  }
  window.addEventListener("resize", checkOverflow);
  checkOverflow();
});
