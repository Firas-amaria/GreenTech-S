// core.js — shared helpers & constants

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const [k, v] of Object.entries(a || {})) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
};

export const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
export const load = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; }
};

export const daysLong  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export const bitForShiftIndex = (idx) => 1 << (3 - idx); // M(8),A(4),E(2),N(1)

export const shiftDefs = [
  { label: "M", bit: 8, name: "Morning"   },
  { label: "A", bit: 4, name: "Afternoon" },
  { label: "E", bit: 2, name: "Evening"   },
  { label: "N", bit: 1, name: "Night"     },
];
export const labelForBit = (b) => (shiftDefs.find(x => x.bit === b)?.label ?? "?");

export const countBits = (m) => ((m & 8)?1:0)+((m & 4)?1:0)+((m & 2)?1:0)+((m & 1)?1:0);
export function clampToTwo(mask) {
  const order = [8,4,2,1]; let out = 0, c = 0;
  for (const b of order) if ((mask & b) && c < 2) { out |= b; c++; }
  return out;
}

export function to12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suf = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suf}`;
}
export const monthName = (m1) => new Date(2000, m1 - 1, 1).toLocaleString(undefined, { month: "long" });
export const fmtDate = (d) => d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
export function nextMonthOf(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1;
  const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
  return { y: ny, m: nm };
}
