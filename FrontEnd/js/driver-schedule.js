// schedule.js — Monthly bitmask schedule with "Plan Next Month" flow (no libs).

//const { createElement } = require("react");

/* ===== Helpers ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const [k, v] of Object.entries(a || {})) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function")
      n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of kids.flat())
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fb;
  } catch {
    return fb;
  }
};
const daysLong = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ===== Shifts (4 per day) ===== */
async function fetchShifts() {
  // Could be API-backed; keep sync/fake for demo
  return [
    { name: "Morning", start: "07:00", end: "09:00" },
    { name: "Afternoon", start: "12:00", end: "13:00" },
    { name: "Evening", start: "18:00", end: "19:00" },
    { name: "Night", start: "21:00", end: "23:00" },
  ];
}
// Map: Morning(3), Afternoon(2), Evening(1), Night(0)
const bitForShiftIndex = (idx) => 1 << (3 - idx);

/* ===== Seed schedules (current month if missing) ===== */
function keyForMonth(y, m1to12) {
  return `demo_month_schedule_${y}_${String(m1to12).padStart(2, "0")}`;
}

function daysInMonth(y, m1to12) {
  return new Date(y, m1to12, 0).getDate();
}

function ensureMonthSchedule(y, m1to12) {
  const k = keyForMonth(y, m1to12);
  let sch = load(k, null);
  if (sch) return sch;

  // Default pattern: Mon-Fri Morning+Afternoon, Sat Night, Sun off
  const pattern = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat bitmasks
  pattern[1] = bitForShiftIndex(0) | bitForShiftIndex(1); // Mon Morn+After
  pattern[2] = pattern[1];
  pattern[3] = pattern[1];
  pattern[4] = pattern[1];
  pattern[5] = bitForShiftIndex(0); // Fri Morning
  pattern[6] = bitForShiftIndex(3); // Sat Night

  const len = daysInMonth(y, m1to12);
  const arr = [];
  for (let d = 1; d <= len; d++) {
    const dow = new Date(y, m1to12 - 1, d).getDay();
    arr.push(pattern[dow]); // fill by weekday
  }
  sch = { year: y, month: m1to12, days: arr, createdAt: Date.now() };
  save(k, sch);
  return sch;
}

/* ===== Rendering: Today / Upcoming / Month ===== */
async function renderToday(sch) {
  const tbody = $("#tblToday tbody");
  tbody.innerHTML = "";
  const shifts = await fetchShifts();

  const today = new Date();
  const d = today.getDate();
  const mask = sch.days[d - 1] || 0;

  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i];
    const bit = bitForShiftIndex(i);
    const on = (mask & bit) !== 0;
    const row = el(
      "tr",
      {},
      el("td", {}, s.name),
      el("td", {}, `${to12h(s.start)} - ${to12h(s.end)}`),
      el("td", {}, on ? "✅" : "—")
    );
    tbody.appendChild(row);
  }
}

async function renderUpcoming(sch) {
  const tbody = $("#tblUpcoming tbody");
  tbody.innerHTML = "";
  const shifts = await fetchShifts();

  const today = new Date();
  for (let offset = 1; offset <= 5; offset++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + offset);

    // If month changes, ensure schedule exists for that month
    const y = dt.getFullYear(),
      m = dt.getMonth() + 1;
    const k = keyForMonth(y, m);
    const month = load(k, null) || ensureMonthSchedule(y, m);

    const mask = month.days[dt.getDate() - 1] || 0;
    const names = shiftNamesFromMask(mask, shifts);
    const row = el(
      "tr",
      {},
      el("td", {}, fmtDate(dt)),
      el("td", {}, daysLong[dt.getDay()]),
      el("td", {}, names.length ? names.join(", ") : "—")
    );
    tbody.appendChild(row);
  }
}

async function renderCalendar(
  sch,
  titleId = "monthTitle",
  targetId = "calendar"
) {
  const shifts = await fetchShifts();
  const title = $(`#${titleId}`);
  title.textContent = `${monthName(sch.month)} ${sch.year}`;

  const grid = $(`#${targetId}`);
  grid.innerHTML = "";

  // Weekday headers
  for (const d of daysShort)
    grid.appendChild(el("div", { class: "cal-head" }, d));

  // We’ll lay out day cells; include leading blanks for first weekday
  const firstDow = new Date(sch.year, sch.month - 1, 1).getDay();
  const totalDays = sch.days.length;
  for (let i = 0; i < firstDow; i++)
    grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  for (let day = 1; day <= totalDays; day++) {
    const mask = sch.days[day - 1] || 0;
    const chips = shiftChips(mask, shifts);
    const cell = el(
      "div",
      { class: "cal-cell" },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips" }, ...chips)
    );
    grid.appendChild(cell);
  }
}

/* ===== Plan Next Month (modal) ===== */
function openPlanModal() {
  const host = $("#modal-host");
  host.innerHTML = "";

  const overlay = el("div", { class: "modal-overlay" });
  const box = el("div", { class: "modal-box" });

  const title = el("h3", { class: "modal-title" }, "Plan Next Month");
  const stepInfo = el(
    "div",
    { class: "subtle" },
    "Step 1 of 2 — Pick weekly pattern (shifts per weekday)"
  );
  const content = el("div", { class: "grid-week" }); // will fill with table
  const actions = el(
    "div",
    { class: "modal-actions" },
    el("button", { class: "btn-no-success", onclick: close }, "Cancel"),
    el("button", { id: "btnStepNext", class: "btn-primary" }, "Next")
  );

  box.append(title, stepInfo, content, actions);
  document.body.append(overlay, box);

  // STEP 1 UI: weekly checkboxes
  renderWeeklyPattern(content).then(({ getPattern }) => {
    $("#btnStepNext").addEventListener("click", () => {
      // Move to Step 2
      const pattern = getPattern(); // [sun..sat] bitmasks
      const { y, m } = nextMonthOf(new Date());
      const preview = buildMonthFromPattern(y, m, pattern); // array of bitmasks
      renderExceptionsStep(
        box,
        stepInfo,
        content,
        actions,
        y,
        m,
        preview,
        pattern,
        close
      );
    });
  });

  function close() {
    overlay.remove();
    box.remove();
  }
}

async function renderWeeklyPattern(container) {
  const shifts = await fetchShifts();
  const tbl = el("table", { class: "compact" });
  const thead = el(
    "thead",
    {},
    el(
      "tr",
      {},
      el("th", {}, "Shift / Day"),
      ...daysShort.map((d) => el("th", {}, d))
    )
  );
  const tbody = el("tbody");

  // Attempt pre-fill from saved last pattern
  const last = load("demo_weekly_pattern", new Array(7).fill(0)); // [Sun..Sat] bitmasks

  shifts.forEach((s, si) => {
    const row = el(
      "tr",
      {},
      el(
        "td",
        {},
        el("strong", {}, s.name),
        el("div", { class: "subtle" }, `${to12h(s.start)} - ${to12h(s.end)}`)
      )
    );
    for (let dow = 0; dow < 7; dow++) {
      const cb = el("input", { type: "checkbox" });
      cb.checked = (last[dow] & bitForShiftIndex(si)) !== 0;
      const td = el("td", {}, cb);
      row.appendChild(td);
    }
    tbody.appendChild(row);
  });

  tbl.append(thead, tbody);
  container.innerHTML = "";
  container.appendChild(tbl);

  return {
    getPattern() {
      // Build [Sun..Sat] bitmasks from the table
      const pattern = new Array(7).fill(0);
      const rows = $$("tbody tr", tbl);
      rows.forEach((r, si) => {
        const cbs = $$("input[type=checkbox]", r);
        cbs.forEach((cb, dow) => {
          if (cb.checked) pattern[dow] |= bitForShiftIndex(si);
        });
      });
      save("demo_weekly_pattern", pattern);
      return pattern;
    },
  };
}

function renderExceptionsStep(
  box,
  stepInfo,
  content,
  actions,
  y,
  m,
  monthArr,
  pattern,
  close
) {
  stepInfo.textContent = "Step 2 of 2 — Uncheck days you don’t want to work";

  const len = monthArr.length;
  const firstDow = new Date(y, m - 1, 1).getDay();

  // Controls
  const controls = el(
    "div",
    { class: "cal-toggle" },
    el(
      "div",
      { class: "btn-row" },
      el(
        "button",
        { class: "btn-no-success small", onclick: () => toggleWeekends(false) },
        "Uncheck weekends"
      ),
      el(
        "button",
        { class: "btn-no-success small", onclick: () => toggleWeekends(true) },
        "Check weekends"
      ),
      el(
        "button",
        { class: "btn-no-success small", onclick: () => setAll(true) },
        "Select all"
      ),
      el(
        "button",
        { class: "btn-no-success small", onclick: () => setAll(false) },
        "Clear all"
      )
    ),
    el(
      "div",
      { class: "subtle" },
      "Click a day to toggle work on/off. Use the M/A/E/N chips for per-shift control."
    )
  );

  // Grid
  const grid = el("div", { class: "calendar" });
  for (const d of daysShort)
    grid.appendChild(el("div", { class: "cal-head" }, d));
  for (let i = 0; i < firstDow; i++)
    grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  for (let day = 1; day <= len; day++) {
    const dow = new Date(y, m - 1, day).getDay();
    const baseMask = pattern[dow] || 0; // used when toggling whole day on

    const cell = el(
      "div",
      { class: "cal-cell", "data-day": String(day) },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips" }) // fill below
    );

    // helper to (re)paint this day’s chips
    const paint = () => {
      const cur = monthArr[day - 1] || 0;
      const chipsHost = $(".chips", cell);
      chipsHost.replaceChildren(
        ...simpleChips(cur, (bit, nextOn) => {
          const before = monthArr[day - 1] || 0;
          monthArr[day - 1] = nextOn ? before | bit : before & ~bit;
          paint(); // repaint this day’s chips to reflect the change
        })
      );
    };
    paint();

    // clicking the *cell* toggles whole day off/on (per the weekday baseMask)
    cell.addEventListener("click", (ev) => {
      // ignore clicks that originated on a chip button (handled above)
      if (ev.target && ev.target.classList.contains("chip")) return;
      monthArr[day - 1] = monthArr[day - 1] ? 0 : baseMask;
      paint();
    });

    grid.appendChild(cell);
  }

  // Replace content with controls + grid
  content.innerHTML = "";
  content.append(controls, grid);

  // Actions: Back / Save
  actions.innerHTML = "";
  actions.append(
    el(
      "button",
      { class: "btn-no-success", onclick: () => openPlanModal() },
      "Back"
    ),
    el(
      "button",
      {
        class: "btn-primary",
        onclick: () => {
          // Save schedule
          const obj = {
            year: y,
            month: m,
            days: monthArr,
            createdAt: Date.now(),
          };
          save(keyForMonth(y, m), obj);

          // Show preview popup (JSON) then close and refresh page
          const pretty = JSON.stringify(monthArr, null, 2);
          const preview = el(
            "div",
            {},
            el("h4", {}, `Saved schedule for ${monthName(m)} ${y}`),
            el(
              "pre",
              {
                style:
                  "background:#f8f8f8; padding:8px; border:1px solid #eee; max-height:240px; overflow:auto;",
              },
              pretty
            )
          );

          // Swap content to confirmation
          content.innerHTML = "";
          content.appendChild(preview);
          actions.innerHTML = "";
          actions.append(
            el(
              "button",
              {
                class: "btn-primary",
                onclick: () => {
                  close();
                  boot();
                },
              },
              "Done"
            )
          );
        },
      },
      "Save"
    )
  );

  function setAll(on) {
    for (let day = 1; day <= len; day++) {
      const dow = new Date(y, m - 1, day).getDay();
      monthArr[day - 1] = on ? pattern[dow] || 0 : 0;
    }
    // Repaint chips with handlers intact
    $$(".cal-cell[data-day]").forEach((cell) => {
      const d = +cell.getAttribute("data-day");
      const chipsHost = $(".chips", cell);
      const repaint = () => {
        const cur = monthArr[d - 1] || 0;
        chipsHost.replaceChildren(
          ...simpleChips(cur, (bit, nextOn) => {
            const before = monthArr[d - 1] || 0;
            monthArr[d - 1] = nextOn ? before | bit : before & ~bit;
            repaint();
          })
        );
      };
      repaint();
    });
  }

  function toggleWeekends(on) {
    for (let day = 1; day <= len; day++) {
      const dow = new Date(y, m - 1, day).getDay();
      if (dow === 0 || dow === 6) {
        // Sun or Sat
        monthArr[day - 1] = on ? pattern[dow] || 0 : 0;
      }
    }
    // Repaint chips with handlers intact
    $$(".cal-cell[data-day]").forEach((cell) => {
      const d = +cell.getAttribute("data-day");
      const chipsHost = $(".chips", cell);
      const repaint = () => {
        const cur = monthArr[d - 1] || 0;
        chipsHost.replaceChildren(
          ...simpleChips(cur, (bit, nextOn) => {
            const before = monthArr[d - 1] || 0;
            monthArr[d - 1] = nextOn ? before | bit : before & ~bit;
            repaint();
          })
        );
      };
      repaint();
    });
  }
}

function buildMonthFromPattern(y, m, pattern) {
  const len = daysInMonth(y, m);
  const arr = new Array(len);
  for (let d = 1; d <= len; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    arr[d - 1] = pattern[dow] || 0;
  }
  return arr;
}

/* ===== Boot / Wireup ===== */
async function boot() {
  const now = new Date();
  const y = now.getFullYear(),
    m = now.getMonth() + 1;

  const sch = ensureMonthSchedule(y, m);
  $("#lblContext").textContent = `Showing ${monthName(m)} ${y}`;
  await renderToday(sch);
  await renderUpcoming(sch);
  await renderCalendar(sch);

  $("#btnPlanNext").onclick = openPlanModal;
}
document.addEventListener("DOMContentLoaded", boot);

/* ===== UI Helpers ===== */
function to12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suf = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suf}`;
}
function monthName(m1) {
  return new Date(2000, m1 - 1, 1).toLocaleString(undefined, { month: "long" });
}
function fmtDate(d) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function shiftNamesFromMask(mask, shifts) {
  const out = [];
  for (let i = 0; i < shifts.length; i++) {
    const bit = bitForShiftIndex(i);
    if (mask & bit) out.push(shifts[i].name);
  }
  return out;
}
function shiftChips(mask, shifts) {
  const kids = [];
  for (let i = 0; i < shifts.length; i++) {
    const bit = bitForShiftIndex(i);
    kids.push(
      el("span", { class: `chip ${mask & bit ? "on" : ""}` }, shifts[i].name[0])
    ); // M/A/E/N initials
  }
  return kids;
}

/* ===== Interactive simpleChips (per-shift toggles) ===== */
function simpleChips(mask, onToggle) {
  // M(8) A(4) E(2) N(1)
  const defs = [
    { label: "M", bit: 8 },
    { label: "A", bit: 4 },
    { label: "E", bit: 2 },
    { label: "N", bit: 1 },
  ];

  const nodes = [];
  let anyOn = false;

  for (const { label, bit } of defs) {
    const isOn = (mask & bit) !== 0;
    anyOn = anyOn || isOn;

    const btn = el(
      "button",
      { type: "button", class: `chip ${isOn ? "on" : ""}` },
      label
    );

    if (typeof onToggle === "function") {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation(); // don’t trigger the cell’s day on/off toggle
        onToggle(bit, !isOn);
      });
    }

    nodes.push(btn);
  }

  if (!anyOn) nodes.push(el("span", { class: "chip off" }, "—"));
  return nodes;
}

function nextMonthOf(date) {
  const y = date.getFullYear(),
    m = date.getMonth() + 1;
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return { y: ny, m: nm };
}
