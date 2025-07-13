document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
});

async function renderDashboard() {
  const createContainer = document.getElementById("next-shifts");
  const reqContainer = document.getElementById("shipment-req-list");
  createContainer.innerHTML = "";
  reqContainer.innerHTML = "";

  try {
  const res = await fetch("http://localhost:4000/api/farmerManager/dashboardStatus");
  const { shipmentSummary, createStock } = await res.json();

  // Show up to 4 not-created shifts
  createStock.slice(0, 4).forEach(({ date, shift }) => {
    const div = document.createElement("div");
    div.className = "shift-line";
    div.innerHTML = `
      <span><strong>${date}</strong> - ${shift}</span>
      <button onclick="window.location.href='fm-createStock.html?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}'">
        Create Stock
      </button>
    `;
    createContainer.appendChild(div);
  });

  // Show all created shifts with counts
  shipmentSummary.forEach(({ date, shift, count }) => {
    const div = document.createElement("div");
    div.className = "shift-line";
    div.innerHTML = `
      <span><strong>${date}</strong> - ${shift}</span>
      <span>${count} shipment requests</span>
      <button onclick="window.location.href='fm-shipmentRequests.html?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}'">
        View Requests
      </button>
    `;
    reqContainer.appendChild(div);
  });

} catch (err) {
  console.error("Failed to load dashboard shifts", err);
  createContainer.innerHTML = "<p>Error loading shift data.</p>";
  reqContainer.innerHTML = "";
}

}
