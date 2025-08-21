// render.js — shifts API + current-month calendar + tables
import { $, el, load, daysShort, daysLong, monthName, fmtDate, to12h } from "./core.js";
import { keyForMonth, ensureMonthSchedule } from "./storage.js";

/* ===== Shifts (labels only) ===== */
export async function fetchShifts() {
  return [
    { name: "Morning",   start: "07:00", end: "09:00" },
    { name: "Afternoon", start: "12:00", end: "13:00" },
    { name: "Evening",   start: "18:00", end: "19:00" },
    { name: "Night",     start: "21:00", end: "23:00" },
  ];
}
export const bitForShiftIndex = (idx) => 1 << (3 - idx); // M(8) A(4) E(2) N(1)

/* ===== Helpers to render chips/names ===== */
export function shiftNamesFromMask(mask, shifts) {
  const out = [];
  for (let i = 0; i < shifts.length; i++) {
    const bit = bitForShiftIndex(i);
    if (mask & bit) out.push(shifts[i].name);
  }
  return out;
}
export function shiftChips(mask, shifts) {
  const kids = [];
  for (let i = 0; i < shifts.length; i++) {
    const bit = bitForShiftIndex(i);
    kids.push(el("span", { class: `chip ${mask & bit ? "on" : ""}` }, shifts[i].name[0]));
  }
  return kids;
}
export function simpleChips(mask, onToggle) {
  const defs = [{ label:"M", bit:8 }, { label:"A", bit:4 }, { label:"E", bit:2 }, { label:"N", bit:1 }];
  const nodes = []; let anyOn = false;
  for (const { label, bit } of defs) {
    const isOn = (mask & bit) !== 0; anyOn = anyOn || isOn;
    const btn = el("button", { type:"button", class:`chip ${isOn ? "on" : ""}` }, label);
    if (typeof onToggle === "function") {
      btn.addEventListener("click", (ev) => { ev.stopPropagation(); onToggle(bit, !isOn); });
    }
    nodes.push(btn);
  }
  if (!anyOn) nodes.push(el("span", { class:"chip off" }, "—"));
  return nodes;
}

/* ===== Today table ===== */
export async function renderToday(sch) {
  const tbody = $("#tblToday tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  const shifts = await fetchShifts();

  const today = new Date();
  const d = today.getDate();
  const mask = sch.days[d - 1] || 0;

  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    const bit = bitForShiftIndex(i);
    const on = (mask & bit) !== 0;
    tbody.appendChild(el("tr", {},
      el("td", {}, s.name),
      el("td", {}, `${to12h(s.start)} - ${to12h(s.end)}`),
      el("td", {}, on ? "✅" : "—")
    ));
  }
}

/* ===== Upcoming (next 5 days) ===== */
export async function renderUpcoming(sch) {
  const tbody = $("#tblUpcoming tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  const shifts = await fetchShifts();

  const today = new Date();
  for (let offset = 1; offset <= 5; offset++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + offset);

    const y = dt.getFullYear(), m = dt.getMonth() + 1;
    // pull matching month object from storage (or create if missing)
    const month = load(keyForMonth(y, m), null) || ensureMonthSchedule(y, m);

    const mask = month.days[dt.getDate() - 1] || 0;
    const names = shiftNamesFromMask(mask, shifts);

    // Support both new standbyShift (bit) and legacy standby (boolean)
    const sbBit = month.standbyShift?.[dt.getDate() - 1] || 0;
    const sbBool = month.standby?.[dt.getDate() - 1] || false;
    const standbyText = (sbBit || sbBool) ? " (Standby)" : "";

    tbody.appendChild(el("tr", {},
      el("td", {}, fmtDate(dt)),
      el("td", {}, daysLong[dt.getDay()]),
      el("td", {}, (names.length ? names.join(", ") : "—") + standbyText)
    ));
  }
}

/* ===== Current month calendar ===== */
export async function renderCalendar(sch, titleId = "monthTitle", targetId = "calendar") {
  const shifts = await fetchShifts();
  const title = $(`#${titleId}`); if (title) title.textContent = `${monthName(sch.month)} ${sch.year}`;
  const grid = $(`#${targetId}`); if (!grid) return;
  grid.innerHTML = "";

  // headers
  for (const d of daysShort) grid.appendChild(el("div", { class: "cal-head" }, d));

  // leading blanks
  const firstDow = new Date(sch.year, sch.month - 1, 1).getDay();
  for (let i = 0; i < firstDow; i++)
    grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  // days
  for (let day = 1; day <= sch.days.length; day++) {
    const mask = sch.days[day - 1] || 0;
    const sbBit = sch.standbyShift?.[day - 1] || 0;
    const sbBool = sch.standby?.[day - 1] || false;
    const hasStandby = !!sbBit || !!sbBool;

    grid.appendChild(el("div",
      { class: `cal-cell ${hasStandby ? "standby" : ""}` },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips" }, ...shiftChips(mask, shifts)),
      hasStandby ? el("div", { class: "subtle", style: "font-size:.8rem;margin-top:4px;" }, "Standby") : null
    ));
  }
}

// alias you use in boot
export const currentMonthCalendar = renderCalendar;
