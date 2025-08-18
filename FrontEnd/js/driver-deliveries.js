// deliveries.js — Upcoming deliveries as cards with Approve/Skip. No libs.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const [k, v] of Object.entries(a)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function")
      n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of kids.flat())
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};
const fmtDate = (ts) =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fb;
  } catch {
    return fb;
  }
};

function seed() {
  if (load("demo_pick_seeded", false)) return;
  const now = Date.now();
  const cities = [
    "Tel Aviv",
    "Jerusalem",
    "Haifa",
    "Rishon LeZion",
    "Ashdod",
    "Beer Sheva",
    "Netanya",
    "Holon",
    "Herzliya",
    "Kfar Saba",
    "Ashkelon",
    "Rehovot",
    "Modiin",
  ];
  const loads = [
    "Food crates",
    "Pharmaceuticals",
    "Electronics",
    "Furniture",
    "Textiles",
    "Auto parts",
    "Fresh produce",
    "Beverages",
    "Construction materials",
  ];

  const deliveries = [];
  for (let i = 0; i < 36; i++) {
    const etaStart =
      now + 1000 * 60 * (30 + i * 45 + Math.round(Math.random() * 180)); // spaced in future
    const windowMins = 60 + Math.round(Math.random() * 120);
    const destination = cities[Math.floor(Math.random() * cities.length)];
    const distanceKm = +(5 + Math.random() * 110).toFixed(1);
    const weightKg = +(50 + Math.random() * 3500).toFixed(0);
    const pay = +(
      60 +
      distanceKm * (3.5 + Math.random() * 4) +
      weightKg * 0.05
    ).toFixed(0);

    deliveries.push({
      id: "DLV-" + (710000 + i),
      origin: "Central Depot, Petah Tikva",
      destination,
      distanceKm,
      windowStart: etaStart,
      windowEnd: etaStart + windowMins * 60 * 1000,
      paymentNIS: pay,
      loadType: loads[Math.floor(Math.random() * loads.length)],
      weightKg,
      notes:
        Math.random() < 0.25
          ? "Fragile — handle with care"
          : Math.random() < 0.15
          ? "Requires lift gate"
          : "",
      approved: false,
      skipped: false,
    });
  }
  save("demo_pick_deliveries", deliveries);
  save("demo_pick_seeded", true);
}
seed();

/* ============ State ============ */
const st = { q: "", sort: "eta_asc", window: "any", page: 1, pageSize: 12 };

const els = {
  cards: $("#cards"),
  empty: $("#empty"),
  q: $("#q"),
  sort: $("#sort"),
  window: $("#window"),
  btnReset: $("#btnReset"),
  loadMore: $("#loadMore"),
};

/* ============ Filters ============ */
function filterWindow(d, mode) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (mode === "today") {
    end.setDate(start.getDate() + 1);
  } else if (mode === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(start.getDate() + 1);
  } else if (mode === "3days") {
    end.setDate(start.getDate() + 3);
  } else if (mode === "7days") {
    end.setDate(start.getDate() + 7);
  } else return true; // any

  return d.windowStart >= +start && d.windowStart < +end;
}

function applyFilters(list) {
  const q = st.q.trim().toLowerCase();
  let out = list.filter((d) => !d.approved && !d.skipped);
  if (q)
    out = out.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q)
    );
  if (st.window !== "any") out = out.filter((d) => filterWindow(d, st.window));

  const s = st.sort;
  out.sort((a, b) => {
    if (s === "eta_asc") return a.windowStart - b.windowStart;
    if (s === "payment_desc") return b.paymentNIS - a.paymentNIS;
    if (s === "distance_asc") return a.distanceKm - b.distanceKm;
    if (s === "weight_desc") return b.weightKg - a.weightKg;
    return 0;
  });

  return out;
}

/* ============ Actions ============ */
function approve(delivery) {
  const data = load("demo_pick_deliveries", []);
  const idx = data.findIndex((x) => x.id === delivery.id);
  if (idx >= 0) {
    data[idx].approved = true;
    save("demo_pick_deliveries", data);
  }

  // Drop a notification for the dashboard
  try {
    const n = load("demo_notifications", []);
    n.unshift({
      id: crypto.randomUUID(),
      type: "system",
      message: `You approved ${delivery.id} → ${
        delivery.destination
      } (${fmtDate(delivery.windowStart)})`,
      createdAt: Date.now(),
      read: false,
    });
    save("demo_notifications", n);
  } catch {}

  render(true);
}

function skip(delivery) {
  const data = load("demo_pick_deliveries", []);
  const idx = data.findIndex((x) => x.id === delivery.id);
  if (idx >= 0) {
    data[idx].skipped = true;
    save("demo_pick_deliveries", data);
  }
  render(true);
}

/* ============ Render ============ */
function render(resetPage = false) {
  const all = load("demo_pick_deliveries", []);
  const filtered = applyFilters(all);
  if (resetPage) st.page = 1;

  const pageItems = filtered.slice(0, st.page * st.pageSize);

  els.cards.innerHTML = "";
  for (const d of pageItems) {
    els.cards.appendChild(renderCard(d));
  }

  els.empty.style.display = filtered.length ? "none" : "block";
  els.loadMore.style.display =
    pageItems.length < filtered.length ? "inline-block" : "none";
}

function renderCard(d) {
  const durMins = Math.round((d.windowEnd - d.windowStart) / 60000);

  return el(
    "div",
    { class: "card", "data-id": d.id },
    el(
      "header",
      {},
      el("strong", {}, d.destination),
      el(
        "span",
        { class: "badge", title: "ETA window start" },
        new Date(d.windowStart).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    ),
    el("div", { class: "note" }, d.notes || "—"),
    el(
      "div",
      { class: "meta" },
      metric("Distance", `${d.distanceKm} km`),
      metric("Payment", `${d.paymentNIS} ₪`),
      metric("Load", d.loadType),
      metric("Weight", `${d.weightKg} kg`),
      metric(
        "Window",
        `${fmtDate(d.windowStart)} → ${fmtDate(d.windowEnd)} (${durMins}m)`
      ),
      metric("From", d.origin)
    ),
    el(
      "div",
      { class: "actions" },
      el(
        "button",
        {
          class: "btn-no-success small",
          onclick: () => alert(`Details for ${d.id} (WIP)`),
        },
        "Details"
      ),
      el(
        "button",
        { class: "btn-primary small", onclick: () => approve(d) },
        "Approve"
      )
    )
  );
}

function metric(label, value) {
  return el(
    "div",
    { class: "item" },
    el("div", { class: "label" }, label),
    el("div", { class: "value" }, value)
  );
}

/* ============ Events ============ */
function bind() {
  els.q.addEventListener("input", () => {
    st.q = els.q.value;
    render(true);
  });
  els.sort.addEventListener("change", () => {
    st.sort = els.sort.value;
    render(true);
  });
  els.window.addEventListener("change", () => {
    st.window = els.window.value;
    render(true);
  });
  els.btnReset.addEventListener("click", () => {
    st.q = "";
    st.sort = "eta_asc";
    st.window = "any";
    st.page = 1;
    els.q.value = "";
    els.sort.value = "eta_asc";
    els.window.value = "any";
    render(true);
  });
  els.loadMore.addEventListener("click", () => {
    st.page++;
    render();
  });
}

/* ============ Boot ============ */
document.addEventListener("DOMContentLoaded", () => {
  bind();
  render(true);
});
