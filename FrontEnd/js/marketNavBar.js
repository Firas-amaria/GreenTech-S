import { auth, signOut } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role?.toLowerCase() || null;

  const nav = document.createElement("nav");
  nav.className = "navbar";

  const leftLinks = document.createElement("div");
  leftLinks.className = "nav-links left";

  const rightLinks = document.createElement("div");
  rightLinks.className = "nav-links right";

  // Always show market
  const marketLink = createLink("market.html", "Market", "nav-market");
  leftLinks.appendChild(marketLink);

  if (!role) {
    // Not logged in
    leftLinks.appendChild(createLink("register.html", "Register", "nav-register"));
    leftLinks.appendChild(createLink("login.html", "Log In", "nav-login"));
  } else {
    // Logged in (customer or not)
    leftLinks.appendChild(createLink("cart.html", "Cart (<span id='cart-count'>0</span>)", "nav-cart", true));
    leftLinks.appendChild(createLink("profile.html", "Profile", "nav-profile"));
    leftLinks.appendChild(createLink("myOrders.html", "My Orders", "nav-orders"));

    if (role !== "customer") {
      // Additional dashboard link
      const dashHref = role === "farmer" ? "u-farmer/f-dashboard.html"
                      : role === "driver" ? "d_dashboard.html"
                      : role === "picker" ? "p_dashboard.html"
                      : role === "farmer" ? "u-admin/a_dashboard.html"
                      : role === "farmerManager" ? "u-farmerManager/fm-dashboard.html"
                      : "#";
      leftLinks.appendChild(createLink(dashHref, "Dashboard", "nav-dashboard"));
    }

    // Always logout at end
    const logoutLink = createLink("#", "Logout", "logout-link");
    rightLinks.appendChild(logoutLink);

    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        localStorage.clear();
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout failed:", err);
        alert("Failed to logout. Please try again.");
      }
    });
  }

  nav.appendChild(leftLinks);
  nav.appendChild(rightLinks);
  document.body.prepend(nav);

  // Highlight current page
  const path = window.location.pathname.split("/").pop();
  if (path.includes("market")) marketLink.classList.add("active");
  if (path.includes("cart")) document.getElementById("nav-cart")?.classList.add("active");
  if (path.includes("profile")) document.getElementById("nav-profile")?.classList.add("active");
  if (path.includes("myOrders")) document.getElementById("nav-orders")?.classList.add("active");
  if (path.includes("dashboard")) document.getElementById("nav-dashboard")?.classList.add("active");

  // Update cart count
  updateCartCount();
});

function createLink(href, text, id, isHTML = false) {
  const a = document.createElement("a");
  a.href = href;
  a.id = id;
  if (isHTML) a.innerHTML = text;
  else a.textContent = text;
  return a;
}

function updateCartCount() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let totalItems = cart.length;
  const countEl = document.getElementById("cart-count");
  if (countEl) countEl.textContent = totalItems;
}


/* 
🔥 Not logged in:
shows Market | Register | Log In

🔥 Logged in + customer:
Market | Cart | Profile | My Orders | Logout

🔥 Logged in + any other role:
Market | Cart | Profile | My Orders | Dashboard | Logout
with Dashboard link auto-mapped by role.

*/