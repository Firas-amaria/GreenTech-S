// boot.js — page wire-up (robust)
import { $, monthName } from "./core.js";
import { ensureMonthSchedule } from "./storage.js";
import { renderToday, renderUpcoming, currentMonthCalendar } from "./render.js";
import { openPlanModal } from "./plan.js";

// Small helper: don't let one failing section block the rest
async function safe(fn, label) {
  try { await fn(); }
  catch (e) { console.error(`[boot] ${label} failed:`, e); }
}

// Ensure a single modal host exists (plan modal needs this)
function ensureModalHost() {
  let host = document.getElementById("modal-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "modal-host";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
}

export async function boot() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  // Make sure current-month schedule is present/migrated
  const sch = ensureMonthSchedule(y, m);

  // Context label
  const ctx = $("#lblContext");
  if (ctx) ctx.textContent = `Showing ${monthName(m)} ${y}`;

  // Render sections safely
  await safe(() => renderToday(sch), "renderToday");
  await safe(() => renderUpcoming(sch), "renderUpcoming");
  await safe(() => currentMonthCalendar(sch, "monthTitle", "calendar"), "currentMonthCalendar");

  // Wire up Plan Next Month (only after DOM exists)
  const btn = $("#btnPlanNext");
  if (btn) btn.onclick = () => {
    ensureModalHost();
    openPlanModal();
  };
}

/* Auto-run boot when DOM is ready */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
