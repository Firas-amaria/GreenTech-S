// schedule.js — Monthly bitmask schedule with "Plan Next Month" flow (no libs).

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
  for (const c of kids.flat()) {
    if (c == null || c === false) continue; // <-- skip null/false to avoid appendChild error
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
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
const daysLong = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ===== Shifts (4 per day) ===== */
async function fetchShifts() {
  // Could be API-backed; keep sync/fake for demo
  return [
    { name: "Morning",   start: "07:00", end: "09:00" },
    { name: "Afternoon", start: "12:00", end: "13:00" },
    { name: "Evening",   start: "18:00", end: "19:00" },
    { name: "Night",     start: "21:00", end: "23:00" },
  ];
}
// Map: Morning(3), Afternoon(2), Evening(1), Night(0)
const bitForShiftIndex = (idx) => 1 << (3 - idx);

/* ===== Max 2 shifts/day helpers (standby counts as 1) ===== */
const countBits = (m) => ((m & 8)?1:0)+((m & 4)?1:0)+((m & 2)?1:0)+((m & 1)?1:0);
function clampToTwo(mask) {
  const order = [8,4,2,1]; // M > A > E > N priority
  let out = 0, c = 0;
  for (const b of order) { if ((mask & b) && c < 2) { out |= b; c++; } }
  return out;
}

/* ===== Standby shift defs & helpers ===== */
const shiftDefs = [
  { label: "M", bit: 8, name: "Morning"   },
  { label: "A", bit: 4, name: "Afternoon" },
  { label: "E", bit: 2, name: "Evening"   },
  { label: "N", bit: 1, name: "Night"     },
];
const labelForBit = (b) => (shiftDefs.find(x => x.bit === b)?.label ?? "?");

/* ===== Seed schedules (current month if missing) ===== */
function keyForMonth(y, m1to12) {
  return `demo_month_schedule_${y}_${String(m1to12).padStart(2, "0")}`;
}
function daysInMonth(y, m1to12) { return new Date(y, m1to12, 0).getDate(); }
function ensureMonthSchedule(y, m1to12) {
  const k = keyForMonth(y, m1to12);
  let sch = load(k, null);
  if (sch) {
    // normalize legacy data
    sch.days = (sch.days || []).map(clampToTwo);
    // migrate boolean standby[] -> standbyShift[] (bit or 0)
    if (!Array.isArray(sch.standbyShift) || sch.standbyShift.length !== sch.days.length) {
      if (Array.isArray(sch.standby) && sch.standby.length === sch.days.length) {
        sch.standbyShift = sch.standby.map(v => (v ? 1 : 0)); // default Night bit for old true
        delete sch.standby;
      } else {
        sch.standbyShift = new Array(sch.days.length).fill(0);
      }
    }
    save(k, sch);
    return sch;
  }

  // Default pattern: Mon–Fri M+A, Sat N, Sun off
  const pattern = [0,0,0,0,0,0,0];
  pattern[1] = clampToTwo(bitForShiftIndex(0) | bitForShiftIndex(1)); // Mon M+A
  pattern[2] = pattern[1]; pattern[3] = pattern[1]; pattern[4] = pattern[1];
  pattern[5] = clampToTwo(bitForShiftIndex(0)); // Fri M
  pattern[6] = clampToTwo(bitForShiftIndex(3)); // Sat N

  const len = daysInMonth(y, m1to12);
  const arr = Array.from({length:len}, (_,i)=>pattern[new Date(y, m1to12-1, i+1).getDay()]);
  sch = { year:y, month:m1to12, days:arr, standbyShift:new Array(len).fill(0), createdAt:Date.now() };
  save(k, sch);
  return sch;
}

/* ===== Rendering: Today / Upcoming / Month ===== */
async function renderToday(sch) {
  const tbody = $("#tblToday tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  const shifts = await fetchShifts();
  const today = new Date(); const d = today.getDate(); const mask = sch.days[d - 1] || 0;
  for (let i = 0; i < shifts.length; i++) {
    const s = shifts[i], bit = bitForShiftIndex(i), on = (mask & bit) !== 0;
    tbody.appendChild(el("tr", {},
      el("td", {}, s.name),
      el("td", {}, `${to12h(s.start)} - ${to12h(s.end)}`),
      el("td", {}, on ? "✅" : "—")
    ));
  }
}

async function renderUpcoming(sch) {
  const tbody = $("#tblUpcoming tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  const shifts = await fetchShifts();
  const today = new Date();
  for (let offset = 1; offset <= 5; offset++) {
    const dt = new Date(today); dt.setDate(today.getDate() + offset);
    const y = dt.getFullYear(), m = dt.getMonth() + 1;
    const month = load(keyForMonth(y,m), null) || ensureMonthSchedule(y,m);
    const mask = month.days[dt.getDate()-1] || 0;
    const names = shiftNamesFromMask(mask, shifts);
    const sbBit = month.standbyShift?.[dt.getDate()-1] || 0;
    const standbyText = sbBit ? ` (Standby: ${labelForBit(sbBit)})` : "";
    tbody.appendChild(el("tr", {},
      el("td", {}, fmtDate(dt)),
      el("td", {}, daysLong[dt.getDay()]),
      el("td", {}, (names.length ? names.join(", ") : "—") + standbyText)
    ));
  }
}

async function renderCalendar(
  sch,
  titleId = "monthTitle",
  targetId = "calendar"
) {
  const shifts = await fetchShifts();
  const title = $(`#${titleId}`); if (title) title.textContent = `${monthName(sch.month)} ${sch.year}`;

  const grid = $(`#${targetId}`); if (!grid) return;
  grid.innerHTML = "";

  // Weekday headers
  for (const d of daysShort)
    grid.appendChild(el("div", { class: "cal-head" }, d));

  // Leading blanks
  const firstDow = new Date(sch.year, sch.month - 1, 1).getDay();
  for (let i = 0; i < firstDow; i++)
    grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  // Day cells
  for (let day = 1; day <= sch.days.length; day++) {
    const mask = sch.days[day - 1] || 0;
    const sbBit = sch.standbyShift?.[day - 1] || 0;
    grid.appendChild(el(
      "div",
      { class: `cal-cell ${sbBit ? "standby" : ""}` },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips" }, ...shiftChips(mask, shifts)),
      sbBit ? el("div", { class: "subtle", style: "font-size:.8rem;margin-top:4px;" }, `Standby: ${labelForBit(sbBit)}`) : null
    ));
  }
}

/* Alias you asked for */
function currentMonthCalendar(sch, titleId="monthTitle", targetId="calendar") {
  return renderCalendar(sch, titleId, targetId);
}

/* ===== Plan Next Month (modal) ===== */
function openPlanModal() {
  // ensure a host exists
  let host = document.getElementById("modal-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "modal-host";
    document.body.appendChild(host);
  }
  host.innerHTML = "";

  const overlay = el("div", { class: "modal-overlay" });
  const box = el("div", { class: "modal-box" });

  const title = el("h3", { class: "modal-title" }, "Plan Next Month");
  const stepInfo = el(
    "div",
    { class: "subtle" },
    "Step 1 of 3 — Pick weekly pattern (shifts per weekday)"
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

      // live: max 2 per weekday
      cb.addEventListener("change", () => {
        const colMask = $$("tbody tr", tbl).map((r, idx) => {
          const bit = bitForShiftIndex(idx);
          return $$("input[type=checkbox]", r)[dow].checked ? bit : 0;
        }).reduce((a,b)=>a|b,0);
        if (colMask !== clampToTwo(colMask) && cb.checked) cb.checked = false;
      });

      row.appendChild(el("td", {}, cb));
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
      for (let d=0; d<7; d++) pattern[d] = clampToTwo(pattern[d]);
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
  stepInfo.textContent = "Step 2 of 3 — Uncheck days you don’t want to work (≤ 2 shifts/day)";

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
      "Click a day to toggle all-on/off. Use M/A/E/N chips to fine-tune (max 2 per day)."
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
    const baseMask = clampToTwo(pattern[dow] || 0);

    const cell = el(
      "div",
      { class: "cal-cell", "data-day": String(day) },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips" })
    );

    const paint = () => {
      const cur = clampToTwo(monthArr[day - 1] || 0);
      monthArr[day - 1] = cur;
      const host = $(".chips", cell);
      host.replaceChildren(
        ...simpleChips(cur, (bit, nextOn) => {
          const before = monthArr[day - 1] || 0;
          if (nextOn && countBits(before) >= 2 && !(before & bit)) return; // block >2
          const next = clampToTwo(nextOn ? (before | bit) : (before & ~bit));
          monthArr[day - 1] = next;
          paint(); // repaint
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

  // Actions: Back / Next
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
          renderStandbyStep(box, stepInfo, content, actions, y, m, monthArr, pattern, close);
        },
      },
      "Next"
    )
  );

  function setAll(on) {
    for (let day = 1; day <= len; day++) {
      const dow = new Date(y, m - 1, day).getDay();
      monthArr[day - 1] = on ? clampToTwo(pattern[dow] || 0) : 0;
    }
    repaintAll();
  }

  function toggleWeekends(on) {
    for (let day = 1; day <= len; day++) {
      const dow = new Date(y, m - 1, day).getDay();
      if (dow === 0 || dow === 6) {
        // Sun or Sat
        monthArr[day - 1] = on ? clampToTwo(pattern[dow] || 0) : 0;
      }
    }
    repaintAll();
  }

  function repaintAll() {
    $$(".cal-cell[data-day]").forEach((cell) => {
      const d = +cell.getAttribute("data-day");
      const host = $(".chips", cell);
      const repaint = () => {
        const cur = clampToTwo(monthArr[d - 1] || 0);
        monthArr[d - 1] = cur;
        host.replaceChildren(
          ...simpleChips(cur, (bit, nextOn) => {
            const before = monthArr[d - 1] || 0;
            if (nextOn && countBits(before) >= 2 && !(before & bit)) return;
            const next = clampToTwo(nextOn ? (before | bit) : (before & ~bit));
            monthArr[d - 1] = next;
            repaint();
          })
        );
      };
      repaint();
    });
  }
}

/* ===== Step 3: Standby selection (pick one of M/A/E/N per day, counts toward 2/day) ===== */
function renderStandbyStep(box, stepInfo, content, actions, y, m, monthArr, pattern, close) {
  stepInfo.textContent = "Step 3 of 3 — Pick a standby shift (M/A/E/N) per day (≤ 2 including standby)";

  const len = monthArr.length;
  const firstDow = new Date(y, m - 1, 1).getDay();

  // start from any previously saved month (if user came back later)
  const existing = load(keyForMonth(y, m), null);
  const standbyShift = existing?.standbyShift?.length === len
    ? [...existing.standbyShift]
    : new Array(len).fill(0); // 0|8|4|2|1

  const grid = el("div", { class: "calendar" });
  for (const d of daysShort) grid.appendChild(el("div", { class: "cal-head" }, d));
  for (let i=0;i<firstDow;i++) grid.appendChild(el("div", { class: "cal-cell", "aria-hidden":"true" }));

  for (let day=1; day<=len; day++){
    const chipsHost = el("div", { class: "chips" });
    const badge = el("div", { class: "subtle", style: "font-size:.8rem; margin-top:4px;" });
    const cell = el("div", { class: "cal-cell", "data-day": String(day) },
      el("div", { class: "day" }, String(day)),
      chipsHost,
      badge
    );

    const paint = () => {
      const workCount = countBits(clampToTwo(monthArr[day-1] || 0));
      const selected = standbyShift[day-1]; // bit or 0
      badge.textContent = selected ? `Standby: ${labelForBit(selected)}` : "No standby";
      cell.classList.toggle("standby", !!selected);

      // Render four chips M/A/E/N. Clicking selects that standby shift; clicking again clears.
      const nodes = shiftDefs.map(({label, bit}) => {
        const isSelected = selected === bit;
        const disabled = (!isSelected) && (workCount + 1 > 2); // adding standby would exceed 2/day
        const btn = el("button", {
          type:"button",
          class: `chip ${isSelected ? "on" : ""} ${disabled ? "disabled" : ""}`
        }, label);
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (disabled) return;
          standbyShift[day-1] = isSelected ? 0 : bit; // toggle
          paint();
        });
        return btn;
      });

      chipsHost.replaceChildren(...nodes);
    };

    paint();
    grid.appendChild(cell);
  }

  content.innerHTML = "";
  content.append(
    el("div", { class: "subtle", style:"margin-bottom:6px" },
      "Standby uses one of the two daily slots. You can add standby on off days. Click a letter to set/clear."
    ),
    grid
  );

  actions.innerHTML = "";
  actions.append(
    el("button", { class: "btn-no-success", onclick: () =>
      renderExceptionsStep(box, stepInfo, content, actions, y, m, monthArr, pattern, close)
    }, "Back"),
    el("button", { class: "btn-primary", onclick: () => {
      // Validate: work + standby <= 2 per day
      for (let i=0;i<len;i++){
        const work = countBits(clampToTwo(monthArr[i] || 0));
        const sb = standbyShift[i] ? 1 : 0;
        if (work + sb > 2) { alert(`Day ${i+1}: exceeds daily limit`); return; }
      }
      const picked = standbyShift.filter(Boolean).length;
      if (picked < 10) { alert(`Please choose at least 10 standby shifts. Currently: ${picked}`); return; }

      const obj = {
        year: y, month: m,
        days: monthArr.map(clampToTwo),
        standbyShift,
        createdAt: Date.now(),
      };
      save(keyForMonth(y, m), obj);

      // Confirmation
      const pretty = JSON.stringify(obj, null, 2);
      content.innerHTML = "";
      content.append(
        el("h4", {}, `Saved schedule for ${monthName(m)} ${y}`),
        el("pre", { style: "background:#f8f8f8; padding:8px; border:1px solid #eee; max-height:240px; overflow:auto;" }, pretty)
      );
      actions.innerHTML = "";
      actions.append(el("button", { class: "btn-primary", onclick: () => { close(); boot(); } }, "Done"));
    }}, "Save")
  );
}

function buildMonthFromPattern(y, m, pattern) {
  const len = daysInMonth(y, m);
  const arr = new Array(len);
  for (let d=1; d<=len; d++){
    const dow = new Date(y, m-1, d).getDay();
    arr[d-1] = clampToTwo(pattern[dow] || 0);
  }
  return arr;
}

/* ===== Boot / Wireup ===== */
async function boot() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;

  const sch = ensureMonthSchedule(y, m);
  const ctx = $("#lblContext"); if (ctx) ctx.textContent = `Showing ${monthName(m)} ${y}`;
  await renderToday(sch);
  await renderUpcoming(sch);
  await currentMonthCalendar(sch); // alias you requested

  const btn = $("#btnPlanNext"); if (btn) btn.onclick = openPlanModal;
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
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
function shiftNamesFromMask(mask, shifts) {
  const out = [];
  for (let i=0; i<shifts.length; i++){ const bit = bitForShiftIndex(i); if (mask & bit) out.push(shifts[i].name); }
  return out;
}
function shiftChips(mask, shifts) {
  const kids = [];
  for (let i=0; i<shifts.length; i++){
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

/* ===== Utils ===== */
function nextMonthOf(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1;
  const nm = m === 12 ? 1 : m + 1; const ny = m === 12 ? y + 1 : y;
  return { y: ny, m: nm };
}
