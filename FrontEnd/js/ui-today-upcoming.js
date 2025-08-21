// scheduler/ui-today-upcoming.js

import { ensureMonthSchedule, keyForMonth } from "./state.js";
import { fetchShifts } from "./shifts.js";

/* ===== Small local helpers (UI-only) ===== */
const daysLong = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fmtDate = (d) => d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
// Morning(3), Afternoon(2), Evening(1), Night(0) => bits 8,4,2,1
const bitForShiftIndex = (idx) => 1 << (3 - idx);

/** Convert a day's mask to human-readable shift names */
function shiftNamesFromMask(mask, shifts) {
  const out = [];
  for (let i = 0; i < shifts.length; i++) {
    const bit = bitForShiftIndex(i);
    if (mask & bit) out.push(shifts[i].name);
  }
  return out;
}

/** Get schedule object for a given Y/M (ensure it exists) */
function getMonthSchedule(y, m) {
  // ensureMonthSchedule handles load-or-create
  return ensureMonthSchedule(y, m);
}

/* ===== Public: render Today table ===== */
export async function renderTodayTable() {
  const tbody = document.querySelector("#tblToday tbody");
  if (!tbody) return; // not on this page
  tbody.innerHTML = "";

  const shifts = await fetchShifts();

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();

  const sch = getMonthSchedule(y, m);
  const mask = sch?.days?.[d - 1] ?? 0;

  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    const bit = bitForShiftIndex(i);
    const on = (mask & bit) !== 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${to12h(s.start)} - ${to12h(s.end)}</td>
      <td>${on ? "✅" : "—"}</td>
    `;
    tbody.appendChild(tr);
  }
}

/* ===== Public: render Upcoming (next 5 days) table ===== */
export async function renderUpcomingTable() {
  const tbody = document.querySelector("#tblUpcoming tbody");
  if (!tbody) return; // not on this page
  tbody.innerHTML = "";

  const shifts = await fetchShifts();
  const today = new Date();

  for (let offset = 1; offset <= 5; offset++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + offset);

    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const sch = getMonthSchedule(y, m);

    const mask = sch?.days?.[dt.getDate() - 1] ?? 0;
    const names = shiftNamesFromMask(mask, shifts);

    // Optional: standby (supports both legacy boolean and standbyShift bit)
    let standbyText = "";
    if (Array.isArray(sch?.standbyShift)) {
      const sbBit = sch.standbyShift[dt.getDate() - 1] || 0;
      if (sbBit) {
        const label = sbBit === 8 ? "M" : sbBit === 4 ? "A" : sbBit === 2 ? "E" : "N";
        standbyText = ` (Standby: ${label})`;
      }
    } else if (Array.isArray(sch?.standby)) {
      standbyText = sch.standby[dt.getDate() - 1] ? " (Standby)" : "";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(dt)}</td>
      <td>${daysLong[dt.getDay()]}</td>
      <td>${(names.length ? names.join(", ") : "—") + standbyText}</td>
    `;
    tbody.appendChild(tr);
  }
}

/* ===== tiny UI helpers ===== */
function to12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suf = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suf}`;
}
