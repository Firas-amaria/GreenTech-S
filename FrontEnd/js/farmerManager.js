document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
});

async function renderDashboard() {
  const createContainer = document.getElementById("next-shifts");
  const reqContainer = document.getElementById("shipment-req-list");
  createContainer.innerHTML = "";
  reqContainer.innerHTML = "";

  try {
    const res = await fetch(
      "http://localhost:4000/api/farmerManager/dashboardStatus"
    );
    const { createdShifts, notCreatedShifts } = await res.json();

    // Show up to 4 not-created shifts
    notCreatedShifts.slice(0, 4).forEach((shift) => {
      const div = document.createElement("div");
      div.className = "shift-line";
      div.innerHTML = `
        <span>${shift}</span>
        <button onclick="window.location.href='fm-createStock.html?shift=${encodeURIComponent(
          shift
        )}'">
          Create Stock
        </button>
      `;
      createContainer.appendChild(div);
    });

    // Show all created shifts
    createdShifts.forEach(({ shift, count }) => {
      const div = document.createElement("div");
      div.className = "shift-line";
      div.innerHTML = `
        <span>${shift}</span>
        <span>${count} requests created</span>
        <button onclick="window.location.href='fm-shipmentRequests.html?shift=${encodeURIComponent(
          shift
        )}'">
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
