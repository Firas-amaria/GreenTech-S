// boot.js — page wire-up (API-powered)
import { $, monthName } from "./core.js";
import { renderToday, renderUpcoming, currentMonthCalendar } from "./render.js";
import { openPlanModal } from "./plan.js";

/* -------- API helpers -------- */
async function getAuthToken() {
  // Try a few common places. Adjust to your app.
  // 1) If you have a global helper (e.g., from your firebase init)
  if (typeof window.getCurrentUserToken === "function") {
    try {
      return await window.getCurrentUserToken();
    } catch {}
  }
  // 2) If you stash a token yourself
  const t = localStorage.getItem("idToken") || localStorage.getItem("token");
  if (t) return t;
  // 3) Last resort: no token found
  throw new Error("No auth token available. Please login again.");
}

async function apiGet(path) {
  const token = await getAuthToken();
  const res = await fetch(path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${msg}`);
  }
  return res.json();
}

/* -------- small util -------- */
function ensureModalHost() {
  let host = document.getElementById("modal-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "modal-host";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
}

// Don't let one failing section block the rest
async function safe(fn, label) {
  try {
    await fn();
  } catch (e) {
    console.error(`[boot] ${label} failed:`, e);
  }
}

/* -------- main boot -------- */
export async function boot() {
  // 1) Fetch schedules from backend
  const data = await apiGet("/api/driver/getDriverSchedule");
  // data shape (minimal):
  // { currentMonth: number, activeSchedule: number[], nextSchedule: number[]|[] }

  // 2) Build "current month" schedule object compatible with renderers
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = data.currentMonth;
  const schCurrent = {
    year: currentYear,
    month: currentMonth,
    days: Array.isArray(data.activeSchedule) ? data.activeSchedule : [],
    // standby not in this schema; keep zeros so existing UI doesn't choke
    standbyShift: new Array((data.activeSchedule || []).length).fill(0),
    createdAt: Date.now(),
  };

  // 3) Build a "next month" shell (so renderUpcoming can later use it)
  const nextDate = new Date(currentYear, currentMonth - 1 + 1, 1);
  const schNext = {
    year: nextDate.getFullYear(),
    month: nextDate.getMonth() + 1,
    days: Array.isArray(data.nextSchedule) ? data.nextSchedule : [],
    standbyShift: new Array((data.nextSchedule || []).length).fill(0),
    createdAt: Date.now(),
  };

  // 4) Context label
  const ctx = $("#lblContext");
  if (ctx)
    ctx.textContent = `Showing ${monthName(schCurrent.month)} ${
      schCurrent.year
    }`;

  // 5) Render sections safely
  await safe(() => renderToday(schCurrent), "renderToday");

  // NOTE: we'll update renderUpcoming next to accept (schCurrent, schNext)
  // For now, call it with current to keep the page stable; upcoming will be fixed when we rewrite render.js.
  await safe(() => renderUpcoming(schCurrent, schNext), "renderUpcoming");

  await safe(
    () => currentMonthCalendar(schCurrent, "monthTitle", "calendar"),
    "currentMonthCalendar"
  );

  // 6) Button: Plan Next Month
  const btn = $("#btnPlanNext");
  if (btn)
    btn.onclick = () => {
      ensureModalHost();
      // We'll update plan.js next to use PUT /api/driver/putNextSchedule
      openPlanModal(schNext);
    };
}

/* Auto-run boot when DOM is ready */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    boot().catch((err) => console.error("[boot] init failed:", err));
  });
} else {
  boot().catch((err) => console.error("[boot] init failed:", err));
}
