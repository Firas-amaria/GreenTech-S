// schedule.js
// Handles rendering a weekly availability schedule and extracting the selected values

// Days of the week for the schedule
export const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Simulate fetching shift definitions from a database or API
export async function fetchShifts() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: "Morning",    start: "07:00", end: "09:00" },
        { name: "Afternoon",  start: "12:00", end: "13:00" },
        { name: "Evening",    start: "18:00", end: "19:00" }
      ]);
    }, 50);
  });
}

// Convert 24h time string to 12h format with AM/PM
function formatTime(timeStr) {
  const [h, m] = timeStr.split(":").map((x) => parseInt(x, 10));
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

/**
 * Initialize the schedule table inside the given container (form or section).
 * Expects the container to have a <table> with <tbody> where rows will be injected.
 */
export async function initSchedule(container) {
  const shifts = await fetchShifts();
  // The <tbody> of #scheduleTable or within the form
  const tbody = container.querySelector('tbody');
  tbody.innerHTML = '';

  shifts.forEach((shift) => {
    const row = document.createElement('tr');

    // Shift label cell with name and times
    const labelCell = document.createElement('td');
    labelCell.innerHTML = `
      <strong>${shift.name}</strong><br>
      <small>(${formatTime(shift.start)} - ${formatTime(shift.end)})</small>
    `;
    row.appendChild(labelCell);

    // One checkbox cell per day
    days.forEach((day) => {
      const cell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = day;
      checkbox.value = shift.name;
      checkbox.id = `chk-${day}-${shift.name}`;
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.appendChild(checkbox);
      cell.appendChild(label);
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
