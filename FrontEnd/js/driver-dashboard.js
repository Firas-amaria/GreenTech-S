// ../js/driver-dashboard.js
// Module that hydrates the Driver dashboard with FAKE demo data (no libs).

/* =========================
   Helpers
========================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
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
const load = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};

/* =========================
   Fake Data (seeded once)
========================= */
function seedFakeData() {
  if (!load("demo_driver_seeded", false)) {
    // Notifications: system/admin messages
    const notifications = [
      {
        id: crypto.randomUUID(),
        type: "system",
        message: "Your vehicle inspection is due this week.",
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
        read: false,
      },
      {
        id: crypto.randomUUID(),
        type: "admin",
        message: "Dispatch updated your route for tomorrow (Aug 19).",
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
        read: false,
      },
      {
        id: crypto.randomUUID(),
        type: "system",
        message: "Reminder: Submit your weekly availability by Friday.",
        createdAt: Date.now() - 1000 * 60 * 60 * 26,
        read: false,
      },
    ];

    // Active delivery (single)
    const now = Date.now();
    const activeDelivery = {
      deliveryId: "DLV-" + Math.floor(100000 + Math.random() * 900000),
      status: "picked_up", // pending | picked_up | on_route | arrived | problem
      origin: "Central Depot, Petah Tikva",
      destination: "12 Herzl St, Tel Aviv",
      distanceKm: 14.3,
      eta: now + 1000 * 60 * 35, // 35 mins from now
      contact: { name: "Dana Cohen", phone: "+972-50-555-1212" },
      notes: "Fragile goods. Handle with care.",
      lastUpdated: now,
    };

    // Latest ratings (last 8, we’ll show top 5 most recent)
    const ratings = Array.from({ length: 8 }).map((_, i) => {
      const when = now - 1000 * 60 * 60 * (i * 9 + 3);
      const r = 3 + Math.floor(Math.random() * 3); // 3..5
      return {
        deliveryId: "DLV-" + (900100 + i),
        date: when,
        distanceKm: +(10 + Math.random() * 40).toFixed(1),
        destination: ["Haifa", "Jerusalem", "Rishon", "Ashdod", "Be'er Sheva"][
          i % 5
        ],
        rating: r,
        notes:
          r >= 5
            ? "Great communication."
            : r === 4
            ? "Arrived on time."
            : "Slight delay due to traffic.",
      };
    });

    save("demo_notifications", notifications);
    save("demo_activeDelivery", activeDelivery);
    save("demo_ratings", ratings);
    save("demo_driver_seeded", true);
  }
}
seedFakeData();

/* =========================
   Notifications Table
========================= */
function renderNotifications() {
  const tbody = $("#tblNotification tbody");
  if (!tbody) return;

  const notifications = load("demo_notifications", []);
  // newest first, unread at top
  notifications.sort((a, b) =>
    a.read === b.read ? b.createdAt - a.createdAt : a.read - b.read
  );

  tbody.innerHTML = "";
  if (notifications.length === 0) {
    tbody.appendChild(
      el("tr", {}, el("td", { colspan: 2 }, "No notifications 🎉"))
    );
    return;
  }

  for (const n of notifications) {
    const row = el(
      "tr",
      { "data-id": n.id, class: n.read ? "is-read" : "is-unread" },
      el("td", {}, `${n.message} — ${fmtDate(n.createdAt)}`),
      el(
        "td",
        {},
        el(
          "div",
          { class: "actions" },
          el(
            "button",
            {
              class: "btn btn-sm",
              onclick: () => {
                n.read = true;
                save("demo_notifications", notifications);
                renderNotifications();
              },
              title: "Mark as read",
            },
            n.read ? "Read" : "Mark read"
          ),
          el(
            "button",
            {
              class: "btn btn-sm",
              onclick: () => alert("Open notification details (WIP)"),
              title: "Open details",
            },
            "Open"
          )
        )
      )
    );
    tbody.appendChild(row);
  }
}

/* =========================
   Active Delivery Card
========================= */
const STATUS_LABEL = {
  pending: "Pending",
  picked_up: "Picked up",
  on_route: "On route",
  arrived: "Arrived",
  problem: "Problem",
};

function minutesLeft(ts) {
  const diff = Math.max(0, ts - Date.now());
  const m = Math.round(diff / 60000);
  return m <= 1 ? "≈1 min" : `≈${m} mins`;
}

function findSectionByHeading(text) {
  const sec = $$(".section").find(
    (s) =>
      s.querySelector("h2")?.textContent.trim().toLowerCase() ===
      text.toLowerCase()
  );
  return sec || null;
}

function renderActiveDelivery() {
  const sec = findSectionByHeading("Active Delivery");
  if (!sec) return;

  // wipe previous content (keep the H2)
  $$(".active-card, .active-empty", sec).forEach((n) => n.remove());

  const data = load("demo_activeDelivery", null);
  if (!data) {
    sec.appendChild(
      el("div", { class: "active-empty" }, "No active delivery right now.")
    );
    return;
  }

  // Status control
  const statusSelect = el(
    "select",
    {
      class: "input",
      onchange: (e) => updateStatus(e.target.value),
    },
    ...Object.keys(STATUS_LABEL).map((value) =>
      el(
        "option",
        { value, selected: data.status === value },
        STATUS_LABEL[value]
      )
    )
  );

  const updateStatus = (newStatus) => {
    const curr = load("demo_activeDelivery", data);
    curr.status = newStatus;
    curr.lastUpdated = Date.now();
    save("demo_activeDelivery", curr);
    // re-render
    renderActiveDelivery();
  };

  const reportProblem = () => {
    // Simple “WIP” modal
    showModal({
      title: "Report a problem",
      body: "This feature is WIP for the demo. We’ll flag the delivery as a problem.",
      onConfirm: () => updateStatus("problem"),
      confirmText: "Set status: Problem",
    });
  };

  const card = el(
    "div",
    { class: "active-card" },
    el(
      "div",
      { class: "row" },
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "Delivery ID"),
        el("div", { class: "value" }, data.deliveryId)
      ),
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "Status"),
        statusSelect
      )
    ),
    el(
      "div",
      { class: "row" },
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "From"),
        el("div", { class: "value" }, data.origin)
      ),
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "Destination"),
        el("div", { class: "value" }, data.destination)
      )
    ),
    el(
      "div",
      { class: "row" },
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "ETA"),
        el(
          "div",
          { class: "value" },
          `${fmtDate(data.eta)} (${minutesLeft(data.eta)})`
        )
      ),
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "Distance"),
        el("div", { class: "value" }, `${data.distanceKm} km`)
      )
    ),
    el(
      "div",
      { class: "row" },
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "Contact"),
        el(
          "div",
          { class: "value" },
          `${data.contact.name} · ${data.contact.phone}`
        )
      ),
      el(
        "div",
        { class: "col" },
        el("div", { class: "label" }, "Notes"),
        el("div", { class: "value" }, data.notes || "—")
      )
    ),
    el(
      "div",
      { class: "actions mt-8" },
      el(
        "button",
        {
          class: "btn",
          onclick: () => updateStatus(nextForwardStatus(data.status)),
        },
        "Advance status"
      ),
      el(
        "button",
        { class: "btn btn-outline", onclick: reportProblem },
        "Report problem"
      )
    ),
    el("div", { class: "meta" }, `Last updated: ${fmtDate(data.lastUpdated)}`)
  );

  sec.appendChild(card);
}

function nextForwardStatus(s) {
  const flow = ["pending", "picked_up", "on_route", "arrived"];
  const i = flow.indexOf(s);
  if (i === -1) return "picked_up";
  if (i >= flow.length - 1) return flow[flow.length - 1];
  return flow[i + 1];
}

/* =========================
   Latest Ratings Table
========================= */
function renderRatings() {
  const tbody = $("#tblLatestRatings tbody");
  if (!tbody) return;

  const ratings = load("demo_ratings", []);
  ratings.sort((a, b) => b.date - a.date);

  tbody.innerHTML = "";

  for (const r of ratings.slice(0, 5)) {
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    const row = el(
      "tr",
      {},
      el("td", {}, r.deliveryId),
      el("td", {}, fmtDate(r.date)),
      el("td", {}, `${r.distanceKm} km`),
      el("td", {}, r.destination),
      el("td", {}, stars),
      el("td", {}, r.notes || "—")
    );
    tbody.appendChild(row);
  }

  if (tbody.children.length === 0) {
    tbody.appendChild(el("tr", {}, el("td", { colspan: 6 }, "No ratings yet")));
  }
}

/* =========================
   Minimal Modal (for “WIP”)
========================= */
function ensureModalHost() {
  let host = $("#demo-modal-host");
  if (!host) {
    host = el("div", { id: "demo-modal-host" });
    document.body.appendChild(host);
  }
  return host;
}
function showModal({ title, body, onConfirm, confirmText = "Confirm" }) {
  const host = ensureModalHost();
  host.innerHTML = "";
  const overlay = el("div", { class: "modal-overlay" });
  const box = el(
    "div",
    { class: "modal-box" },
    el("h3", { class: "modal-title" }, title),
    el("p", { class: "modal-body" }, body),
    el(
      "div",
      { class: "modal-actions" },
      el(
        "button",
        {
          class: "btn",
          onclick: () => {
            onConfirm?.();
            close();
          },
        },
        confirmText
      ),
      el("button", { class: "btn btn-outline", onclick: close }, "Close")
    )
  );
  function close() {
    overlay.remove();
    box.remove();
  }
  overlay.addEventListener("click", close);
  document.body.append(overlay, box);
}

/* =========================
   Boot
========================= */
function init() {
  renderNotifications();
  renderActiveDelivery();
  renderRatings();

  // Optional: add a dynamic “schedule” nudge if we’re in the last week of the month
  try {
    const today = new Date();
    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();
    if (lastDay - today.getDate() <= 7) {
      const n = load("demo_notifications", []);
      if (!n.some((x) => x.message.includes("weekly availability"))) {
        n.unshift({
          id: crypto.randomUUID(),
          type: "system",
          message: "Update next month schedule.",
          createdAt: Date.now(),
          read: false,
        });
        save("demo_notifications", n);
        renderNotifications();
      }
    }
  } catch {}
}

document.addEventListener("DOMContentLoaded", init);

/* =========================
   Tiny styles (optional)
   If you already have classes in CSS, these classnames will just hook in.
   You can copy the block below into your CSS if you want nicer defaults.
========================= */
// You can delete the block below if your CSS already handles these classes:
const style = document.createElement("style");
style.textContent = `
  .btn { cursor:pointer; padding:0.5rem 0.75rem; border-radius:10px; border:none; }
  .btn-outline { background:transparent; border:1px solid #ccc; }
  .btn-sm { padding:0.25rem 0.5rem; font-size:0.9rem; }
  .actions { display:flex; gap:0.5rem; align-items:center; }
  .row { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:0.75rem; margin-top:0.5rem; }
  .col { background:var(--card-bg, #fafafa); padding:0.5rem 0.75rem; border-radius:12px; }
  .label { font-size:0.8rem; opacity:0.7; }
  .value { font-weight:600; margin-top:0.15rem; }
  .mt-8 { margin-top:0.75rem; }
  tr.is-unread { font-weight:600; }
  /* Modal */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); backdrop-filter: blur(2px); }
  .modal-box { position:fixed; inset:0; margin:auto; width:min(520px, 92vw); height:auto; background:#fff; color:#111; border-radius:16px; padding:1rem 1.25rem; box-shadow:0 10px 30px rgba(0,0,0,.15); }
  .modal-title { margin:0 0 0.25rem 0; }
  .modal-actions { display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem; }
`;
document.head.appendChild(style);
