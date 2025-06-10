

const navButtonsContainer = document.getElementById("nav-buttons");
const roleSelector = document.getElementById("user-role");

function updateNavbar(role) {
  navButtonsContainer.innerHTML = "";
  const buttons = roleButtons[role];
  buttons.forEach(text => {
    const link = document.createElement("a");
    link.textContent = text;
    link.href = getLinkFor(text); // link mapping
    link.className = "nav-link";
    navButtonsContainer.appendChild(link);
  });
}


// Initialize with default role
updateNavbar(roleSelector.value);

roleSelector.addEventListener("change", (e) => {
  updateNavbar(e.target.value);
});
function getLinkFor(label) {
  const linkMap = {
    "Home": "index.html",
    "Profile": "#",
    "Shop": "#",
    "Cart": "#",
    "Dashboard": "-dashboard.html",
    "Crops": "-crops.html",
    "Shipments": "-shipments.html",
    "Reports": "-reports.html",
    "Performance": "#",
    "Schedule": "#",
    "Job Application Review": "-job-applications.html",
    "Manage Users": "/manage-users.html"
  };
  return linkMap[label] || "#"; // fallback if label not found
}
