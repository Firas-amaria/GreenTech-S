import { demandStatistics } from "./mockDataFM.js";

document.addEventListener("DOMContentLoaded", () => {
  renderNextShifts();
  renderShipmentReqSummary();
  renderOrdersSummary();
});

function renderNextShifts() {
  const container = document.getElementById("next-shifts");
  const allShifts = Object.keys(demandStatistics);
  const upcoming = allShifts.slice(0, 4);

  upcoming.forEach(shift => {
    const div = document.createElement("div");
    div.className = "shift-line";
    div.innerHTML = `
      <span>${shift}</span>
      <button onclick="window.location.href='fm-createStock.html?shift=${encodeURIComponent(shift)}'">
        Create Stock
      </button>
    `;
    container.appendChild(div);
  });
}

function renderShipmentReqSummary() {
  const container = document.getElementById("shipment-req-summary");
  container.innerHTML = `
    <p>- 2 shipment requests pending approval</p>
    <p>- 1 shipment request awaiting farmer confirmation</p>
  `;
}

function renderOrdersSummary() {
  const container = document.getElementById("orders-summary");
  container.innerHTML = `
    <p>- Today: 450 kg ordered across 6 items</p>
    <p>- Top item: Lettuce Romaine</p>
  `;
}
