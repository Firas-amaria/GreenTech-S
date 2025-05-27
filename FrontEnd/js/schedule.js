// schedule.js
// Handles rendering a weekly availability schedule and extracting the selected values

// Days of the week for the schedule
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Simulate fetching shift definitions from a database or API
async function fetchShifts() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: "Morning",    start: "06:00", end: "12:00" },
        { name: "Afternoon",  start: "12:00", end: "18:00" },
        { name: "Evening",    start: "18:00", end: "00:00" },
        { name: "Late Night", start: "00:00", end: "06:00" },
      ]);
    }, 50);
  });
}

// Convert 24h time string to 12h format with AM/PM
function formatTime(timeStr) {
  const [h, m] = timeStr.split(":").map((x) => parseInt(x, 10));
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${suffix}`;
}

/**
 * Initialize the schedule table inside the given container.
 * Expects the container to have a <tbody> where rows will be injected.
 */
export async function initSchedule(container) {
  const shifts = await fetchShifts();
  const tbody = container.querySelector('tbody');
  tbody.innerHTML = '';

  shifts.forEach((shift) => {
    const row = document.createElement('tr');

    // Shift label cell
    const labelCell = document.createElement('td');
    labelCell.innerHTML = `${shift.name} <br>(${formatTime(shift.start)} - ${formatTime(shift.end)})`;
    row.appendChild(labelCell);

    // One checkbox cell per day
    days.forEach((day) => {
      const cell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = day;
      checkbox.value = shift.name;
      cell.appendChild(checkbox);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

/**
 * Read the schedule selections from the container and return a JS object.
 * {
 *   Sunday:    ["Morning", "Afternoon"],
 *   Wednesday: ["Evening"]
 * }
 */
export function getScheduleData(container) {
  const schedule = {};
  days.forEach((day) => {
    const checked = Array.from(
      container.querySelectorAll(`input[name="${day}"]:checked`)
    ).map((cb) => cb.value);
    if (checked.length) {
      schedule[day] = checked;
    }
  });
  return schedule;
}
