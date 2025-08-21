// plan.js — 2-step planner with Step 1 as (shift x day) matrix having On / Standby per cell

import {
  el, $, $$, monthName, countBits, clampToTwo, bitForShiftIndex, nextMonthOf
} from "./core.js";
import { keyForMonth } from "./storage.js";
import { fetchShifts } from "./render.js"; // just for names/times

/* ---------- Step 1 state helpers ---------- */

// default weekly work mask per DOW (Sun..Sat)
function defaultWeeklyWork() {
  // M=8, A=4, E=2, N=1
  const p = [0, 0, 0, 0, 0, 0, 0];
  p[1] = clampToTwo(8 | 4); // Mon M+A
  p[2] = p[1];               // Tue
  p[3] = p[1];               // Wed
  p[4] = p[1];               // Thu
  p[5] = 8;                  // Fri M
  p[6] = 1;                  // Sat N
  return p;                  // Sun off
}

// load/save wrappers
function loadSafe(key, fb) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fb; } catch { return fb; } }
function saveSafe(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ---------- Public entry ---------- */
export function openPlanModal() {
  ensureModalHost();

  const overlay = el("div", { class: "modal-overlay" });
  const box = el("div", { class: "modal-box" });

const title    = el("h3", { class: "modal-title" }, "Plan Next Month");
const stepInfo = el("div", { class: "modal-step"  }, "Step 1 of 2 — Weekly matrix (On / Standby per shift/day)");
const content  = el("div", { class: "modal-content" });   // <-- make content scrollable
  const actions = el("div", { class: "modal-actions" },
    el("button", { class: "btn-no-success", onclick: close }, "Cancel"),
    el("button", { id: "btnStepNext", class: "btn-primary" }, "Next")
  );

  box.append(title, stepInfo, content, actions);
  document.body.append(overlay, box);

  renderStep1Matrix(content).then(({ getWeekly }) => {
    $("#btnStepNext").addEventListener("click", () => {
      const { weeklyWorkMask, weeklyStandbyBit } = getWeekly();
      const { y, m } = nextMonthOf(new Date());
      const monthMask    = buildMonthFromWeekly(y, m, weeklyWorkMask);
      const monthSbShift = buildMonthStandbyFromWeekly(y, m, weeklyStandbyBit);
      renderStep2Exceptions(box, stepInfo, content, actions, y, m, monthMask, monthSbShift, weeklyWorkMask, weeklyStandbyBit, close);
    });
  });

  function close() { overlay.remove(); box.remove(); }
}

/* ---------- Step 1: Shift x Day matrix with On / Standby ---------- */
async function renderStep1Matrix(container) {
  const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const shifts = await fetchShifts(); // order: M, A, E, N

  // state per weekday:
  const weeklyWorkMask = [...loadSafe("weekly_work_mask_v2", defaultWeeklyWork())]; // number bitmask
  const weeklyStandbyBit = [...loadSafe("weekly_standby_bit_v2", new Array(7).fill(0))]; // 0 | 8 | 4 | 2 | 1

  const tbl = el("table", { class: "compact", style: "width:100%;" });
  const thead = el("thead", {}, el("tr", {},
    el("th", {}, "Shift / Day"),
    ...daysShort.map(d => el("th", {}, d))
  ));
  const tbody = el("tbody");

  // build rows per shift
  shifts.forEach((s, si) => {
    const bit = bitForShiftIndex(si);
    const row = el("tr", {},
      el("td", {}, el("strong", {}, s.name), el("div", { class: "subtle" }, `${s.start} – ${s.end}`))
    );

    for (let dow = 0; dow < 7; dow++) {
      const cell = el("td", {});
      const btnOn = el("button", { type:"button", class:"tiny btn-no-success" }, "On");
      const btnSb = el("button", { type:"button", class:"tiny btn-no-success", style:"margin-left:6px" }, "Standby");

      const paint = () => {
        const on = (weeklyWorkMask[dow] & bit) !== 0;
        const isSb = weeklyStandbyBit[dow] === bit;

        btnOn.classList.toggle("btn-primary", on);
        btnOn.classList.toggle("btn-no-success", !on);

        btnSb.classList.toggle("btn-primary", isSb);
        btnSb.classList.toggle("btn-no-success", !isSb);
      };

      btnOn.addEventListener("click", () => {
        // toggle this shift as working, respecting max 2 total including standby
        const work = weeklyWorkMask[dow] || 0;
        const sb = weeklyStandbyBit[dow] ? 1 : 0;
        const isOn = (work & bit) !== 0;

        if (!isOn) {
          // turning ON – check capacity
          if (countBits(work) + sb >= 2) return; // no room
          weeklyWorkMask[dow] = clampToTwo(work | bit);
        } else {
          weeklyWorkMask[dow] = clampToTwo(work & ~bit);
        }
        paint();
      });

      btnSb.addEventListener("click", () => {
        // toggle standby for this exact shift
        const work = weeklyWorkMask[dow] || 0;
        const hasSb = weeklyStandbyBit[dow] !== 0;
        const isThis = weeklyStandbyBit[dow] === bit;

        if (!isThis) {
          // selecting new standby: ensure capacity with work count
          if (countBits(work) + 1 > 2) return; // no room
          weeklyStandbyBit[dow] = bit;
        } else {
          // clear standby
          weeklyStandbyBit[dow] = 0;
        }
        paint();
      });

      paint();
      cell.append(btnOn, btnSb);
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  // notes
  const legend = el("div", { class:"subtle", style:"margin:8px 0" },
    "Each cell controls a specific shift on a weekday. ",
    "You can select up to two total per day (working shifts + standby)."
  );

  tbl.append(thead, tbody);
  container.innerHTML = "";
  container.append(legend, tbl);
  injectTinyBtnStyleOnce();

  return {
    getWeekly() {
      saveSafe("weekly_work_mask_v2", weeklyWorkMask);
      saveSafe("weekly_standby_bit_v2", weeklyStandbyBit);
      return { weeklyWorkMask, weeklyStandbyBit };
    }
  };
}

/* ---------- Step 2: Exceptions grid (per day chips + standby shift chips) ---------- */
function renderStep2Exceptions(box, stepInfo, content, actions, y, m, monthMask, monthStandbyBit, weeklyWorkMask, weeklyStandbyBit, close) {
  const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  stepInfo.textContent = "Step 2 of 2 — Fine-tune per day (M/A/E/N + Standby shift, ≤ 2 total)";

  const len = monthMask.length;
  const firstDow = new Date(y, m - 1, 1).getDay();

  const controls = el("div", { class: "cal-toggle" },
    el("div", { class: "btn-row" },
      el("button", { class: "btn-no-success small", onclick: () => toggleWeekends(false) }, "Uncheck weekends"),
      el("button", { class: "btn-no-success small", onclick: () => toggleWeekends(true) }, "Check weekends"),
      el("button", { class: "btn-no-success small", onclick: () => setAll(true) }, "Select all (work)"),
      el("button", { class: "btn-no-success small", onclick: () => setAll(false) }, "Clear all (work)")
    ),
    el("div", { class: "subtle" },
      "Top row toggles working shifts (M/A/E/N). Bottom pill sets the standby shift (pick one). ",
      "You can’t exceed two total per day (work + standby)."
    )
  );

  const grid = el("div", { class: "calendar" });
  for (const d of daysShort) grid.appendChild(el("div", { class: "cal-head" }, d));
  for (let i = 0; i < firstDow; i++) grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  for (let day = 1; day <= len; day++) {
    const cell = el("div", { class: "cal-cell", "data-day": String(day) },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips chips-work" }),
      el("div", { class: "chips chips-standby", style:"margin-top:6px" })
    );

    const paint = () => {
      monthMask[day - 1] = clampToTwo(monthMask[day - 1] || 0);
      const workHost = $(".chips-work", cell);
      const sbHost = $(".chips-standby", cell);
      const sbBit = monthStandbyBit[day - 1] || 0;

      /* work chips */
      workHost.replaceChildren(...[8,4,2,1].map(bit => {
        const on = (monthMask[day-1] & bit) !== 0;
        const btn = el("button", { type:"button", class:`chip ${on ? "on" : ""}` }, bit===8?"M":bit===4?"A":bit===2?"E":"N");
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const before = monthMask[day-1] || 0;
          const totalBefore = countBits(before) + (sbBit ? 1 : 0);
          if (!on && totalBefore >= 2) return; // no room
          monthMask[day-1] = clampToTwo(on ? (before & ~bit) : (before | bit));
          paint();
        });
        return btn;
      }));

      /* standby chips (radio-style) */
      sbHost.replaceChildren(...[8,4,2,1].map(bit => {
        const sel = sbBit === bit;
        const disabled = !sel && (countBits(monthMask[day-1] || 0) >= 2);
        const btn = el("button", { type:"button", class:`chip ${sel ? "on" : ""} ${disabled ? "disabled" : ""}` }, `Standby ${bit===8?"M":bit===4?"A":bit===2?"E":"N"}`);
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (disabled) return;
          monthStandbyBit[day-1] = sel ? 0 : bit;
          paint();
        });
        return btn;
      }));
    };

    paint();
    grid.appendChild(cell);
  }

  content.innerHTML = "";
  content.append(controls, grid);

  actions.innerHTML = "";
  actions.append(
    el("button", { class: "btn-no-success", onclick: () => {
      renderStep1Matrix(content).then(({ getWeekly }) => {
        stepInfo.textContent = "Step 1 of 2 — Weekly matrix (On / Standby per shift/day)";
        actions.innerHTML = "";
        actions.append(
          el("button", { class: "btn-no-success" }, "Cancel"),
          el("button", {
            class: "btn-primary",
            onclick: () => {
              const { weeklyWorkMask: wM, weeklyStandbyBit: wSB } = getWeekly();
              const mm = buildMonthFromWeekly(y, m, wM);
              const msb = buildMonthStandbyFromWeekly(y, m, wSB);
              renderStep2Exceptions(box, stepInfo, content, actions, y, m, mm, msb, wM, wSB, close);
            }
          }, "Next")
        );
      });
    }}, "Back"),
    el("button", {
      class: "btn-primary",
      onclick: () => {
        // validate
        for (let i = 0; i < len; i++) {
          const total = countBits(clampToTwo(monthMask[i] || 0)) + (monthStandbyBit[i] ? 1 : 0);
          if (total > 2) { alert(`Day ${i+1}: exceeds daily limit.`); return; }
        }
        const obj = {
          year: y, month: m,
          days: monthMask.map(clampToTwo),
          standbyShift: monthStandbyBit.map(v => v|0),
          createdAt: Date.now()
        };
        saveSafe(keyForMonth(y, m), obj);
        content.innerHTML = "";
        content.append(
          el("h4", {}, `Saved schedule for ${monthName(m)} ${y}`),
          el("pre", { style:"background:#f8f8f8; padding:8px; border:1px solid #eee; max-height:260px; overflow:auto;" },
            JSON.stringify(obj, null, 2)
          )
        );
        actions.innerHTML = "";
        actions.append(el("button", { class:"btn-primary", onclick: () => { const modal = $(".modal-box"); modal?.previousSibling?.remove(); modal?.remove(); }}, "Done"));
      }
    }, "Save")
  );

  function setAll(on){
    for (let d=1; d<=len; d++){
      const dow = new Date(y, m-1, d).getDay();
      monthMask[d-1] = on ? (weeklyWorkMask[dow] || 0) : 0;
    }
    repaintAll();
  }
  function toggleWeekends(on){
    for (let d=1; d<=len; d++){
      const dow = new Date(y, m-1, d).getDay();
      if (dow===0 || dow===6) monthMask[d-1] = on ? (weeklyWorkMask[dow] || 0) : 0;
    }
    repaintAll();
  }
  function repaintAll(){
    $$(".cal-cell[data-day]").forEach((cell) => {
      const d = +cell.getAttribute("data-day");
      const workHost = $(".chips-work", cell);
      const sbHost   = $(".chips-standby", cell);
      const paintOne = () => {
        monthMask[d-1] = clampToTwo(monthMask[d-1] || 0);
        const sbBit = monthStandbyBit[d-1] || 0;

        workHost.replaceChildren(...[8,4,2,1].map(bit => {
          const on = (monthMask[d-1] & bit) !== 0;
          const btn = el("button", { type:"button", class:`chip ${on?"on":""}` }, bit===8?"M":bit===4?"A":bit===2?"E":"N");
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const before = monthMask[d-1] || 0;
            const totalBefore = countBits(before) + (sbBit?1:0);
            if (!on && totalBefore >= 2) return;
            monthMask[d-1] = clampToTwo(on ? (before & ~bit) : (before | bit));
            paintOne();
          });
          return btn;
        }));

        sbHost.replaceChildren(...[8,4,2,1].map(bit => {
          const sel = sbBit === bit;
          const disabled = !sel && (countBits(monthMask[d-1] || 0) >= 2);
          const btn = el("button", { type:"button", class:`chip ${sel?"on":""} ${disabled?"disabled":""}` }, `Standby ${bit===8?"M":bit===4?"A":bit===2?"E":"N"}`);
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (disabled) return;
            monthStandbyBit[d-1] = sel ? 0 : bit;
            paintOne();
          });
          return btn;
        }));
      };
      paintOne();
    });
  }
}

/* ---------- builders ---------- */
function buildMonthFromWeekly(y, m, weeklyMask) {
  const len = new Date(y, m, 0).getDate();
  const out = new Array(len);
  for (let d=1; d<=len; d++){
    const dow = new Date(y, m-1, d).getDay();
    out[d-1] = clampToTwo(weeklyMask[dow] || 0);
  }
  return out;
}
function buildMonthStandbyFromWeekly(y, m, weeklySbBit) {
  const len = new Date(y, m, 0).getDate();
  const out = new Array(len);
  for (let d=1; d<=len; d++){
    const dow = new Date(y, m-1, d).getDay();
    out[d-1] = weeklySbBit[dow] || 0;
  }
  return out;
}

/* ---------- modal host + tiny button style ---------- */
function ensureModalHost() {
  let host = document.getElementById("modal-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "modal-host";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
}
let _tinyInjected = false;
function injectTinyBtnStyleOnce() {
  if (_tinyInjected) return;
  _tinyInjected = true;
  const s = document.createElement("style");
  s.textContent = `.tiny{padding:3px 8px;font-size:.8rem;line-height:1;border-radius:999px}`;
  document.head.appendChild(s);
}
