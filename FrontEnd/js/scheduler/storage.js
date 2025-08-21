// storage.js — keys, month seeding & migration
import { clampToTwo, save, load, bitForShiftIndex } from "./core.js";

export function keyForMonth(y, m1to12) {
  return `demo_month_schedule_${y}_${String(m1to12).padStart(2, "0")}`;
}
export const daysInMonth = (y, m1to12) => new Date(y, m1to12, 0).getDate();

export function ensureMonthSchedule(y, m1to12) {
  const k = keyForMonth(y, m1to12);
  let sch = load(k, null);
  if (sch) {
    sch.days = (sch.days || []).map(clampToTwo);
    if (!Array.isArray(sch.standbyShift) || sch.standbyShift.length !== sch.days.length) {
      if (Array.isArray(sch.standby) && sch.standby.length === sch.days.length) {
        sch.standbyShift = sch.standby.map(v => (v ? 1 : 0)); // default Night for old true
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
  pattern[1] = clampToTwo(bitForShiftIndex(0) | bitForShiftIndex(1)); // Mon
  pattern[2] = pattern[1]; pattern[3] = pattern[1]; pattern[4] = pattern[1];
  pattern[5] = clampToTwo(bitForShiftIndex(0)); // Fri M
  pattern[6] = clampToTwo(bitForShiftIndex(3)); // Sat N

  const len = daysInMonth(y, m1to12);
  const arr = Array.from({length:len}, (_,i)=>pattern[new Date(y, m1to12-1, i+1).getDay()]);
  sch = { year:y, month:m1to12, days:arr, standbyShift:new Array(len).fill(0), createdAt:Date.now() };
  save(k, sch);
  return sch;
}
