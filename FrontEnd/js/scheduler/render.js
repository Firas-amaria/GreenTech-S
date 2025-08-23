// render.js — API-backed shifts + current-month calendar + tables
import {
  $,
  el,
  daysShort,
  daysLong,
  monthName,
  fmtDate,
  to12h,
} from "./core.js";

/* ===== Shifts (static) ===== */
export async function fetchShifts() {
  // Static by your spec
  return [
    { name: "Morning", start: "07:00", end: "09:00" },
    { name: "Afternoon", start: "12:00", end: "13:00" },
    { name: "Evening", start: "18:00", end: "19:00" },
    { name: "Night", start: "21:00", end: "23:00" },
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
    kids.push(
      el("span", { class: `chip ${mask & bit ? "on" : ""}` }, shifts[i].name[0])
    );
  }
  return kids;
}

/* ===== Today table ===== */
/** sch = { year, month, days: number[] } */
export async function renderToday(sch) {
  const tbody = $("#tblToday tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const shifts = await fetchShifts();

  const today = new Date();
  // If "today" isn't in sch.month/sch.year (rare around TZ edges), just use sch.days[0] as fallback
  let mask = 0;
  if (today.getFullYear() === sch.year && today.getMonth() + 1 === sch.month) {
    const d = today.getDate();
    mask = sch.days[d - 1] || 0;
  } else {
    mask = sch.days[0] || 0;
  }

  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    const bit = bitForShiftIndex(i);
    const on = (mask & bit) !== 0;
    tbody.appendChild(
      el(
        "tr",
        {},
        el("td", {}, s.name),
        el("td", {}, `${to12h(s.start)} - ${to12h(s.end)}`),
        el("td", {}, on ? "✅" : "—")
      )
    );
  }
}

/* ===== Upcoming (next 5 days) ===== */
/**
 * schCur = { year, month, days: number[] }
 * schNext = { year, month, days: number[] } (can be empty[] if not set)
 */
export async function renderUpcoming(schCur, schNext) {
  const tbody = $("#tblUpcoming tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const shifts = await fetchShifts();

  const today = new Date();

  for (let offset = 1; offset <= 5; offset++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + offset);

    const mask = getMaskForDate(dt, schCur, schNext);
    const names = shiftNamesFromMask(mask, shifts);

    tbody.appendChild(
      el(
        "tr",
        {},
        el("td", {}, fmtDate(dt)),
        el("td", {}, daysLong[dt.getDay()]),
        el("td", {}, names.length ? names.join(", ") : "—")
      )
    );
  }
}

function getMaskForDate(dt, schCur, schNext) {
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const dayIdx = dt.getDate() - 1;

  if (y === schCur.year && m === schCur.month) {
    return schCur.days[dayIdx] || 0;
  }
  if (schNext && y === schNext.year && m === schNext.month) {
    return (schNext.days && schNext.days[dayIdx]) || 0;
  }
  // If neither matches (shouldn’t happen with 5-day lookahead), return 0 (off)
  return 0;
}

/* ===== Current month calendar ===== */
export async function renderCalendar(
  sch,
  titleId = "monthTitle",
  targetId = "calendar"
) {
  const shifts = await fetchShifts();
  const title = $(`#${titleId}`);
  if (title) title.textContent = `${monthName(sch.month)} ${sch.year}`;
  const grid = $(`#${targetId}`);
  if (!grid) return;
  grid.innerHTML = "";

  // headers
  for (const d of daysShort)
    grid.appendChild(el("div", { class: "cal-head" }, d));

  // leading blanks
  const firstDow = new Date(sch.year, sch.month - 1, 1).getDay();
  for (let i = 0; i < firstDow; i++)
    grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  // days (no standby in this schema)
  for (let day = 1; day <= sch.days.length; day++) {
    const mask = sch.days[day - 1] || 0;

    grid.appendChild(
      el(
        "div",
        { class: "cal-cell" },
        el("div", { class: "day" }, String(day)),
        el("div", { class: "chips" }, ...shiftChips(mask, shifts))
      )
    );
  }
}

// alias used by boot
export const currentMonthCalendar = renderCalendar;
