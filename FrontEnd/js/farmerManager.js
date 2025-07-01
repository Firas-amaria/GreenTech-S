import { demandStatistics } from "./mockDataFM.js";

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
});

function renderDashboard() {
  const createContainer = document.getElementById("next-shifts");
  const reqContainer = document.getElementById("shipment-req-list");
  createContainer.innerHTML = "";
  reqContainer.innerHTML = "";

  const now = new Date();
  const shifts = Object.keys(demandStatistics);

  const createdShifts = [];
  const notCreatedShifts = [];

  shifts.forEach(shift => {
    const key = `LC-1_AS_${shift}_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}`;
    const stock = JSON.parse(localStorage.getItem(key));
    if (stock && stock.items.length > 0) {
      createdShifts.push({ shift, count: stock.items.length });
    } else {
      notCreatedShifts.push(shift);
    }
  });

  // Show next 4 uncreated shifts under Create Stock
  notCreatedShifts.slice(0, 4).forEach(shift => {
    const div = document.createElement("div");
    div.className = "shift-line";
    div.innerHTML = `
      <span>${shift}</span>
      <button onclick="window.location.href='fm-createStock.html?shift=${encodeURIComponent(shift)}'">
        Create Stock
      </button>
    `;
    createContainer.appendChild(div);
  });

  // Show all created shifts under Shipment Requests
  createdShifts.forEach(({ shift, count }) => {
    const div = document.createElement("div");
    div.className = "shift-line";
    div.innerHTML = `
      <span>${shift}</span>
      <span>${count} requests created</span>
      <button onclick="window.location.href='fm-shipmentRequests.html?shift=${encodeURIComponent(shift)}'">
        View Requests
      </button>
    `;
    reqContainer.appendChild(div);
  });
}
