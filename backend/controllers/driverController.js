const { db, admin } = require("../firebaseConfig");
const { DateTime } = require("luxon");

// ===== Timezone & month helpers (Asia/Jerusalem) =====
const ZONE = "Asia/Jerusalem";

function nowInZone() {
  return DateTime.now().setZone(ZONE);
}
function nextMonthOf(dt) {
  const n = dt.plus({ months: 1 });
  return { year: n.year, month: n.month };
}
function daysInMonth(year, month) {
  return DateTime.local(year, month, 1, { zone: ZONE }).daysInMonth;
}

// ===== Bitmask helpers (M=8, A=4, E=2, N=1; max 2 bits) =====
function countBits(m) {
  let c = 0;
  if (m & 8) c++;
  if (m & 4) c++;
  if (m & 2) c++;
  if (m & 1) c++;
  return c;
}
function clampToTwo(mask) {
  // Priority: M(8) > A(4) > E(2) > N(1)
  const order = [8, 4, 2, 1];
  let out = 0,
    c = 0;
  for (const b of order) {
    if (mask & b && c < 2) {
      out |= b;
      c++;
    }
  }
  return out;
}
function normalizeMask(v) {
  const n = Number.isFinite(v) ? v : 0;
  const bounded = Math.max(0, Math.min(15, n | 0));
  // Enforce max two bits
  return clampToTwo(bounded);
}
function normalizeArray(arr, len) {
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = normalizeMask(arr?.[i] ?? 0);
  return out;
}
function resizeArray(arr, len) {
  const out = (arr || []).slice(0, len).map(normalizeMask);
  while (out.length < len) out.push(0);
  return out;
}

// ===== Core Firestore ops =====
const COL = "delivererSchedule";

async function getOrInitDoc(uid, nowDT) {
  const ref = db.collection(COL).doc(uid);
  const snap = await ref.get();

  const nowMonth = nowDT.month;
  const nowYear = nowDT.year;
  const curLen = daysInMonth(nowYear, nowMonth);

  if (!snap.exists) {
    const data = {
      currentMonth: nowMonth,
      activeSchedule: new Array(curLen).fill(0),
      nextSchedule: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 1,
    };
    await ref.set(data);
    return { ref, data };
  }

  const data = snap.data() || {};
  let mutated = false;

  // Ensure fields exist with correct shapes
  if (
    typeof data.currentMonth !== "number" ||
    data.currentMonth < 1 ||
    data.currentMonth > 12
  ) {
    data.currentMonth = nowMonth;
    mutated = true;
  }
  if (!Array.isArray(data.activeSchedule)) {
    data.activeSchedule = new Array(curLen).fill(0);
    mutated = true;
  }
  if (!Array.isArray(data.nextSchedule)) {
    data.nextSchedule = [];
    mutated = true;
  }

  // Auto-rollover: if stored month != now month
  if (data.currentMonth !== nowMonth) {
    const { year: nextYear, month: nextMonth } = nextMonthOf(
      DateTime.local(nowYear, data.currentMonth, 1, { zone: ZONE })
    );
    const curLenNow = daysInMonth(nowYear, nowMonth);

    if (Array.isArray(data.nextSchedule) && data.nextSchedule.length > 0) {
      // Promote nextSchedule -> activeSchedule, sized to current month
      data.activeSchedule = resizeArray(data.nextSchedule, curLenNow);
      data.nextSchedule = [];
    } else {
      // No nextSchedule; start empty this month
      data.activeSchedule = new Array(curLenNow).fill(0);
      data.nextSchedule = [];
    }
    data.currentMonth = nowMonth;
    mutated = true;
  }

  // Normalize lengths & values
  const desiredActiveLen = daysInMonth(nowYear, data.currentMonth);
  const normActive = resizeArray(data.activeSchedule, desiredActiveLen);
  if (JSON.stringify(normActive) !== JSON.stringify(data.activeSchedule)) {
    data.activeSchedule = normActive;
    mutated = true;
  }

  // Keep nextSchedule length aligned to *next* month if it exists
  if (data.nextSchedule.length > 0) {
    const next = nowDT.plus({ months: 1 });
    const desiredNextLen = daysInMonth(next.year, next.month);
    const normNext = resizeArray(data.nextSchedule, desiredNextLen);
    if (JSON.stringify(normNext) !== JSON.stringify(data.nextSchedule)) {
      data.nextSchedule = normNext;
      mutated = true;
    }
  }

  if (mutated) {
    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await ref.set(data, { merge: true });
  }

  return { ref, data };
}

// ===== Controllers =====

/**
 * GET /api/driver/schedule
 * Response (minimal):
 * {
 *   currentMonth: number,
 *   activeSchedule: number[],
 *   nextSchedule: number[] | []
 * }
 */
async function getDriverSchedule(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const nowDT = nowInZone();
    const { data } = await getOrInitDoc(uid, nowDT);

    // Minimal payload (no years, no shifts)
    return res.json({
      currentMonth: data.currentMonth,
      activeSchedule: data.activeSchedule.map(normalizeMask),
      nextSchedule: (data.nextSchedule || []).map(normalizeMask),
    });
  } catch (err) {
    console.error("[getDriverSchedule] Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PUT /api/driver/schedule/next
 * Body: { nextSchedule: number[] }
 * Response: { nextSchedule: number[] }
 */
async function putNextSchedule(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    if (!Array.isArray(body.nextSchedule)) {
      return res
        .status(400)
        .json({ error: "nextSchedule must be an array of numbers." });
    }

    const nowDT = nowInZone();
    const { year: nextYear, month: nextMonth } = nextMonthOf(nowDT);
    const expectedLen = daysInMonth(nextYear, nextMonth);

    if (body.nextSchedule.length !== expectedLen) {
      return res.status(400).json({
        error: "Invalid nextSchedule length.",
        expectedLength: expectedLen,
        receivedLength: body.nextSchedule.length,
      });
    }

    // Normalize values (0..15, ≤2 bits)
    const normalized = normalizeArray(body.nextSchedule, expectedLen);

    // Ensure doc exists & is normalized first
    const { ref } = await getOrInitDoc(uid, nowDT);

    await ref.set(
      {
        nextSchedule: normalized,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ nextSchedule: normalized });
  } catch (err) {
    console.error("[putNextSchedule] Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  getDriverSchedule,
  putNextSchedule,
};
