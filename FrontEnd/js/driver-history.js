// history.js — Shipment History page (no libs). Uses localStorage fake data.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function")
      n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of children.flat())
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
};
const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
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

const STATUS_LABEL = {
  pending: "Pending",
  picked_up: "Picked up",
  on_route: "On route",
  arrived: "Arrived",
  problem: "Problem",
  cancelled: "Cancelled",
};

// Seed a larger fake history only once
function seedHistory() {
  if (load("demo_history_seeded", false)) return;
  const now = Date.now();
  const destinations = [
    "Tel Aviv",
    "Jerusalem",
    "Haifa",
    "Rishon LeZion",
    "Ashdod",
    "Beer Sheva",
    "Netanya",
    "Holon",
    "Petah Tikva",
    "Ramat Gan",
    "Herzliya",
    "Kfar Saba",
    "Ashkelon",
    "Rehovot",
    "Modiin",
  ];
  const statuses = [
    "arrived",
    "arrived",
    "arrived",
    "on_route",
    "picked_up",
    "pending",
    "problem",
    "cancelled",
  ]; // bias to arrived
  const history = [];

  for (let i = 0; i < 120; i++) {
    const when = now - 1000 * 60 * 60 * (i * (1 + Math.random() * 6)); // spaced out hours back
    const rating = Math.random() < 0.1 ? 0 : 3 + Math.floor(Math.random() * 3); // 0 (unrated) or 3..5
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    history.push({
      deliveryId: "DLV-" + (800000 + i),
      date: when,
      distanceKm: +(8 + Math.random() * 90).toFixed(1),
      destination:
        destinations[Math.floor(Math.random() * destinations.length)],
      status,
      rating,
      notes:
        status === "problem"
          ? "Reported issue at checkpoint."
          : status === "cancelled"
          ? "Cancelled by dispatcher."
          : rating >= 5
          ? "Customer very satisfied."
          : rating === 4
          ? "On time delivery."
          : rating === 3
          ? "Minor delay due to traffic."
          : "—",
    });
  }

  // If ratings from dashboard exist, prepend a few so lists feel consistent
  const r = load("demo_ratings", []);
  for (const x of r.slice(0, 5)) {
    history.unshift({
      deliveryId: x.deliveryId,
      date: x.date,
      distanceKm: x.distanceKm,
      destination: x.destination,
      status: "arrived",
      rating: x.rating,
      notes: x.notes || "—",
    });
  }

  save("demo_history", history);
  save("demo_history_seeded", true);
}
seedHistory();

/* =========================
   State & Elements
========================= */
const state = {
  q: "",
  status: "",
  minRating: 0,
  page: 1,
  pageSize: 25,
  sortBy: "date",
  sortDir: "desc", // 'asc' | 'desc'
};

const els = {
  q: $("#q"),
  status: $("#status"),
  minRating: $("#minRating"),
  pageSize: $("#pageSize"),
  btnReset: $("#btnReset"),
  tbody: $("#tblHistory tbody"),
  pageInfo: $("#pageInfo"),
  prev: $("#prev"),
  next: $("#next"),
  thead: $("#tblHistory thead"),
};

/* =========================
   Filtering / Sorting / Paging
========================= */
function applyFilters(data) {
  const q = state.q.trim().toLowerCase();
  const out = data.filter((row) => {
    if (state.status && row.status !== state.status) return false;
    if (+state.minRating > 0 && (row.rating || 0) < +state.minRating)
      return false;
    if (
      q &&
      !(
        row.deliveryId.toLowerCase().includes(q) ||
        row.destination.toLowerCase().includes(q)
      )
    )
      return false;
    return true;
  });
  return out.sort(sorter(state.sortBy, state.sortDir));
}

function sorter(by, dir) {
  const mul = dir === "desc" ? -1 : 1;
  return (a, b) => {
    let va = a[by],
      vb = b[by];
    if (by === "date" || by === "distanceKm" || by === "rating") {
      return (va - vb) * mul;
    }
    return String(va).localeCompare(String(vb)) * mul;
  };
}

function paginate(arr) {
  const start = (state.page - 1) * state.pageSize;
  return arr.slice(start, start + state.pageSize);
}

/* =========================
   Render
========================= */
function render() {
  const all = load("demo_history", []);
  const filtered = applyFilters(all);
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  els.tbody.innerHTML = "";
  for (const r of paginate(filtered)) {
    const stars =
      r.rating > 0 ? "★".repeat(r.rating) + "☆".repeat(5 - r.rating) : "—";
    const chipClass =
      r.status === "arrived"
        ? "chip ok"
        : r.status === "on_route" ||
          r.status === "picked_up" ||
          r.status === "pending"
        ? "chip warn"
        : "chip bad";

    const row = el(
      "tr",
      {},
      el("td", {}, r.deliveryId),
      el("td", {}, fmtDate(r.date)),
      el("td", {}, `${r.distanceKm} km`),
      el("td", {}, r.destination),
      el(
        "td",
        {},
        el("span", { class: chipClass, title: r.status }, labelStatus(r.status))
      ),
      el("td", {}, stars),
      el("td", {}, r.notes || "—"),
      el(
        "td",
        { class: "actions" },
        el(
          "button",
          {
            class: "btn-primary small",
            onclick: () => alert(`Open details for ${r.deliveryId} (WIP)`),
          },
          "View"
        )
      )
    );
    els.tbody.appendChild(row);
  }

  els.pageInfo.textContent = `Page ${state.page} of ${totalPages} • ${filtered.length} result(s)`;
  els.prev.disabled = state.page <= 1;
  els.next.disabled = state.page >= totalPages;
}

function labelStatus(s) {
  return STATUS_LABEL[s] || s;
}

/* =========================
   Events
========================= */
function bind() {
  els.q.addEventListener("input", () => {
    state.q = els.q.value;
    state.page = 1;
    render();
  });
  els.status.addEventListener("change", () => {
    state.status = els.status.value;
    state.page = 1;
    render();
  });
  els.minRating.addEventListener("change", () => {
    state.minRating = +els.minRating.value;
    state.page = 1;
    render();
  });
  els.pageSize.addEventListener("change", () => {
    state.pageSize = +els.pageSize.value;
    state.page = 1;
    render();
  });
  els.btnReset.addEventListener("click", () => {
    state.q = "";
    state.status = "";
    state.minRating = 0;
    state.page = 1;
    state.pageSize = 25;
    els.q.value = "";
    els.status.value = "";
    els.minRating.value = "0";
    els.pageSize.value = "25";
    render();
  });
  els.prev.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      render();
    }
  });
  els.next.addEventListener("click", () => {
    state.page++;
    render();
  });

  // Click-to-sort on header cells
  const headers = [
    "deliveryId",
    "date",
    "distanceKm",
    "destination",
    "status",
    "rating",
  ];
  $$("th", els.thead).forEach((th, i) => {
    const key = headers[i];
    if (!key) return;
    th.style.cursor = "pointer";
    th.title = "Click to sort";
    th.addEventListener("click", () => {
      if (state.sortBy === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortBy = key;
        state.sortDir =
          key === "deliveryId" || key === "destination" || key === "status"
            ? "asc"
            : "desc";
      }
      render();
    });
  });
}

/* =========================
   Boot
========================= */
document.addEventListener("DOMContentLoaded", () => {
  bind();
  render();
});
