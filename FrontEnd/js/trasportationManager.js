import {
  auth,
  getCurrentUserToken,
  onAuthStateChanged,
  signOut,
} from "./firebase-init.js";

console.log("transportationManager.js loaded");

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.email);
    loadDashboardStats();
    loadOrderSummaries();
  } else {
    console.log("No user logged in, redirecting...");
    alert("You must be logged in to view this page.");
    window.location.href = "login.html";
  }
});

function loadDashboardStats() {
  document.getElementById("total-orders").textContent = "38";
  document.getElementById("upcoming-shipments").textContent = "7";
}

function loadOrderSummaries() {
  const shifts = [
    { shift: "Sunday Morning", orders: 12 },
    { shift: "Sunday Afternoon", orders: 8 },
    { shift: "Monday Morning", orders: 15 },
    { shift: "Monday Evening", orders: 3 }
  ];

  const container = document.getElementById("order-summaries-list");
  container.innerHTML = "";

  shifts.forEach(item => {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `
      <div class="summary-header">
        <span>${item.shift}</span>
        <span>${item.orders} orders</span>
      </div>
    `;
    container.appendChild(div);
  });
}
