// plan.js — 2-step planner (no standby, saves nextSchedule to API)

import {
  el,
  $,
  $$,
  monthName,
  countBits,
  clampToTwo,
  bitForShiftIndex,
  nextMonthOf,
} from "./core.js";
import { fetchShifts } from "./render.js"; // for names/times only

/* ---------------- API helpers ---------------- */
async function getAuthToken() {
  if (typeof window.getCurrentUserToken === "function") {
    try {
      return await window.getCurrentUserToken();
    } catch {}
  }
  const t = localStorage.getItem("idToken") || localStorage.getItem("token");
  if (t) return t;
  throw new Error("No auth token. Please log in.");
}
async function apiPut(path, body) {
  const token = await getAuthToken();
  const res = await fetch(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`PUT ${path} failed: ${res.status} ${msg}`);
  }
  return res.json();
}

/* ---------- Step 1 state helpers ---------- */
// default weekly work mask per DOW (Sun..Sat)
function defaultWeeklyWork() {
  // M=8, A=4, E=2, N=1 (max 2 in total per day)
  const p = [0, 0, 0, 0, 0, 0, 0];
  p[1] = clampToTwo(8 | 4); // Mon M+A
  p[2] = p[1]; // Tue
  p[3] = p[1]; // Wed
  p[4] = p[1]; // Thu
  p[5] = 8; // Fri M
  p[6] = 1; // Sat N
  return p; // Sun off
}
// local cache (so reopening modal remembers your weekly pattern)
function loadSafe(key, fb) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fb;
  } catch {
    return fb;
  }
}
function saveSafe(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

/* ---------- Public entry ---------- */
/** @param schNext Optional {year, month, days[]} passed from boot() to prefill */
export function openPlanModal(schNext) {
  ensureModalHost();

  const overlay = el("div", { class: "modal-overlay" });
  const box = el("div", { class: "modal-box" });

  const title = el("h3", { class: "modal-title" }, "Plan Next Month");
  const stepInfo = el(
    "div",
    { class: "modal-step" },
    "Step 1 of 2 — Weekly matrix (On per shift/day)"
  );
  const content = el("div", { class: "modal-content" }); // scrollable
  const actions = el(
    "div",
    { class: "modal-actions" },
    el("button", { class: "btn-no-success", onclick: close }, "Cancel"),
    el("button", { id: "btnStepNext", class: "btn-primary" }, "Next")
  );

  box.append(title, stepInfo, content, actions);
  document.body.append(overlay, box);

  renderStep1Matrix(content).then(({ getWeekly }) => {
    $("#btnStepNext").addEventListener("click", () => {
      const { weeklyWorkMask } = getWeekly();
      const { y, m } = nextMonthOf(new Date());
      let monthMask = buildMonthFromWeekly(y, m, weeklyWorkMask);

      // Prefill from schNext if provided (and same month/length)
      if (
        schNext &&
        schNext.year === y &&
        schNext.month === m &&
        Array.isArray(schNext.days) &&
        schNext.days.length === monthMask.length
      ) {
        monthMask = schNext.days.map(clampToTwo);
      }

      renderStep2Exceptions(
        box,
        stepInfo,
        content,
        actions,
        y,
        m,
        monthMask,
        weeklyWorkMask,
        close
      );
    });
  });

  function close() {
    overlay.remove();
    box.remove();
  }
}

/* ---------- Step 1: Shift x Day matrix (On only) ---------- */
async function renderStep1Matrix(container) {
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const shifts = await fetchShifts(); // order: M, A, E, N

  const weeklyWorkMask = [
    ...loadSafe("weekly_work_mask_v3", defaultWeeklyWork()),
  ];

  const tbl = el("table", { class: "compact", style: "width:100%;" });
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

  shifts.forEach((s, si) => {
    const bit = bitForShiftIndex(si);
    const row = el(
      "tr",
      {},
      el(
        "td",
        {},
        el("strong", {}, s.name),
        el("div", { class: "subtle" }, `${s.start} – ${s.end}`)
      )
    );

    for (let dow = 0; dow < 7; dow++) {
      const cell = el("td", {});
      const btnOn = el(
        "button",
        { type: "button", class: "tiny btn-no-success" },
        "On"
      );

      const paint = () => {
        const on = (weeklyWorkMask[dow] & bit) !== 0;
        btnOn.classList.toggle("btn-primary", on);
        btnOn.classList.toggle("btn-no-success", !on);
      };

      btnOn.addEventListener("click", () => {
        const work = weeklyWorkMask[dow] || 0;
        const isOn = (work & bit) !== 0;

        if (!isOn) {
          if (countBits(work) >= 2) return; // max 2 per day
          weeklyWorkMask[dow] = clampToTwo(work | bit);
        } else {
          weeklyWorkMask[dow] = clampToTwo(work & ~bit);
        }
        paint();
      });

      paint();
      cell.append(btnOn);
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  });

  const legend = el(
    "div",
    { class: "subtle", style: "margin:8px 0" },
    "Each cell controls a specific shift on a weekday. Up to two total per day."
  );

  tbl.append(thead, tbody);
  container.innerHTML = "";
  container.append(legend, tbl);
  injectTinyBtnStyleOnce();

  return {
    getWeekly() {
      saveSafe("weekly_work_mask_v3", weeklyWorkMask);
      return { weeklyWorkMask };
    },
  };
}

/* ---------- Step 2: Exceptions grid (per day chips) ---------- */
function renderStep2Exceptions(
  box,
  stepInfo,
  content,
  actions,
  y,
  m,
  monthMask,
  weeklyWorkMask,
  close
) {
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  stepInfo.textContent = "Step 2 of 2 — Fine-tune per day (M/A/E/N, ≤ 2 total)";

  const len = monthMask.length;
  const firstDow = new Date(y, m - 1, 1).getDay();

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
    el("div", { class: "subtle" }, "Click M/A/E/N to toggle. Max two per day.")
  );

  const grid = el("div", { class: "calendar" });
  for (const d of daysShort)
    grid.appendChild(el("div", { class: "cal-head" }, d));
  for (let i = 0; i < firstDow; i++)
    grid.appendChild(el("div", { class: "cal-cell", "aria-hidden": "true" }));

  for (let day = 1; day <= len; day++) {
    const cell = el(
      "div",
      { class: "cal-cell", "data-day": String(day) },
      el("div", { class: "day" }, String(day)),
      el("div", { class: "chips chips-work" })
    );

    const paint = () => {
      monthMask[day - 1] = clampToTwo(monthMask[day - 1] || 0);
      const workHost = $(".chips-work", cell);

      workHost.replaceChildren(
        ...[8, 4, 2, 1].map((bit) => {
          const on = (monthMask[day - 1] & bit) !== 0;
          const btn = el(
            "button",
            { type: "button", class: `chip ${on ? "on" : ""}` },
            bit === 8 ? "M" : bit === 4 ? "A" : bit === 2 ? "E" : "N"
          );
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const before = monthMask[day - 1] || 0;
            const totalBefore = countBits(before);
            if (!on && totalBefore >= 2) return; // no room
            monthMask[day - 1] = clampToTwo(on ? before & ~bit : before | bit);
            paint();
          });
          return btn;
        })
      );
    };

    paint();
    grid.appendChild(cell);
  }

  content.innerHTML = "";
  content.append(controls, grid);

  actions.innerHTML = "";
  actions.append(
    el(
      "button",
      {
        class: "btn-no-success",
        onclick: () => {
          // back to weekly
          renderStep1Matrix(content).then(({ getWeekly }) => {
            stepInfo.textContent =
              "Step 1 of 2 — Weekly matrix (On per shift/day)";
            actions.innerHTML = "";
            actions.append(
              el(
                "button",
                { class: "btn-no-success", onclick: close },
                "Cancel"
              ),
              el(
                "button",
                {
                  class: "btn-primary",
                  onclick: () => {
                    const { weeklyWorkMask: wM } = getWeekly();
                    const mm = buildMonthFromWeekly(y, m, wM);
                    renderStep2Exceptions(
                      box,
                      stepInfo,
                      content,
                      actions,
                      y,
                      m,
                      mm,
                      wM,
                      close
                    );
                  },
                },
                "Next"
              )
            );
          });
        },
      },
      "Back"
    ),
    el(
      "button",
      {
        class: "btn-primary",
        onclick: async () => {
          // validate
          for (let i = 0; i < len; i++) {
            const total = countBits(clampToTwo(monthMask[i] || 0));
            if (total > 2) {
              alert(`Day ${i + 1}: exceeds daily limit.`);
              return;
            }
          }
          const payload = { nextSchedule: monthMask.map(clampToTwo) };

          try {
            const res = await apiPut("/api/driver/putNextSchedule", payload);
            // confirmation UI
            content.innerHTML = "";
            content.append(
              el("h4", {}, `Saved schedule for ${monthName(m)} ${y}`),
              el(
                "pre",
                {
                  style:
                    "background:#f8f8f8; padding:8px; border:1px solid #eee; maxHeight:'260px'; overflow:'auto'",
                },
                JSON.stringify(res, null, 2)
              )
            );
            actions.innerHTML = "";
            actions.append(
              el(
                "button",
                {
                  class: "btn-primary",
                  onclick: () => {
                    const modal = $(".modal-box");
                    modal?.previousSibling?.remove();
                    modal?.remove();
                  },
                },
                "Done"
              )
            );
          } catch (e) {
            alert(`Failed to save: ${e.message}`);
          }
        },
      },
      "Save"
    )
  );

  function setAll(on) {
    for (let d = 1; d <= len; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      monthMask[d - 1] = on ? weeklyWorkMask[dow] || 0 : 0;
    }
    repaintAll();
  }
  function toggleWeekends(on) {
    for (let d = 1; d <= len; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow === 0 || dow === 6)
        monthMask[d - 1] = on ? weeklyWorkMask[dow] || 0 : 0;
    }
    repaintAll();
  }
  function repaintAll() {
    $$(".cal-cell[data-day]").forEach((cell) => {
      const d = +cell.getAttribute("data-day");
      const workHost = $(".chips-work", cell);
      const paintOne = () => {
        monthMask[d - 1] = clampToTwo(monthMask[d - 1] || 0);
        workHost.replaceChildren(
          ...[8, 4, 2, 1].map((bit) => {
            const on = (monthMask[d - 1] & bit) !== 0;
            const btn = el(
              "button",
              { type: "button", class: `chip ${on ? "on" : ""}` },
              bit === 8 ? "M" : bit === 4 ? "A" : bit === 2 ? "E" : "N"
            );
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const before = monthMask[d - 1] || 0;
              const totalBefore = countBits(before);
              if (!on && totalBefore >= 2) return;
              monthMask[d - 1] = clampToTwo(on ? before & ~bit : before | bit);
              paintOne();
            });
            return btn;
          })
        );
      };
      paintOne();
    });
  }
}

/* ---------- builders ---------- */
function buildMonthFromWeekly(y, m, weeklyMask) {
  const len = new Date(y, m, 0).getDate();
  const out = new Array(len);
  for (let d = 1; d <= len; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    out[d - 1] = clampToTwo(weeklyMask[dow] || 0);
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
