// Package Editor window
// Shows all top-level fields read-only + schema fields editable.
// Saves back via PUT /packages/:id
import { auth, onAuthStateChanged } from "./firebase-init.js";

// ===== Config =====
const API_BASE = "http://localhost:4000/api/tm-packages";
const ENDPOINTS = {
  pkgSchema:        ()            => `${API_BASE}/package-schema`,
  listPackages:     ()            => `${API_BASE}/packages`,
  upsertPackage:    (id)          => `${API_BASE}/packages/${encodeURIComponent(id)}`,
};

let ID_TOKEN = null;
let PACKAGE_ID = new URL(location.href).searchParams.get("id") || "";
let packageSchema = [];
let current = null;
let draftName = "";
let draftValues = {};

const q = (s,r=document)=>r.querySelector(s);
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d=0) => (Number.isFinite(+n) ? Number(n).toFixed(d) : "—");
const asDate = (ts) => (ts && typeof ts._seconds === "number")
  ? new Date(ts._seconds*1000 + Math.floor((ts._nanoseconds||0)/1e6)).toLocaleString()
  : "—";

async function apiFetch(url, { method="GET", body, headers={} } = {}) {
  if (!ID_TOKEN) throw new Error("Missing auth token");
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ID_TOKEN}`, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `${res.status} ${res.statusText}`);
  return data;
}

// ===== Auth & init =====
onAuthStateChanged(auth, async (user) => {
  if (!user) { alert("Please log in."); window.close(); return; }
  ID_TOKEN = await user.getIdToken(false);
  try { await init(); } catch (e) { console.error(e); alert(e.message); }
});

async function init() {
  if (!PACKAGE_ID) throw new Error("Missing ?id");
  const [schema, list] = await Promise.all([
    apiFetch(ENDPOINTS.pkgSchema()),
    apiFetch(ENDPOINTS.listPackages()),
  ]);
  packageSchema = Array.isArray(schema) ? schema : [];
  current = (Array.isArray(list) ? list : []).find(p => p.id === PACKAGE_ID);
  if (!current) throw new Error(`Package "${PACKAGE_ID}" not found.`);

  const base = Object.fromEntries(packageSchema.map(f => [f.id, f.defaultValue ?? null]));
  draftValues = { ...base, ...(current.values || {}) };
  draftName = current.name ?? current.id ?? current.key ?? "";

  renderAll();
}

// ===== Render =====
function renderAll() {
  q("#title").textContent = `Package: ${PACKAGE_ID}`;

  // Core
  const c = current;
  const rows = [
    ["ID", c.id],
    ["Key", c.key],
    ["Inner dims (cm)", c.innerDimsCm ? `${c.innerDimsCm.l}×${c.innerDimsCm.w}×${c.innerDimsCm.h}` : "—"],
    ["Headroom %", Number.isFinite(c.headroomPct) ? fmt(c.headroomPct*100, 0) : "—"],
    ["Usable (L)", Number.isFinite(c.usableLiters) ? fmt(c.usableLiters,2) : (Number.isFinite(c?.derived?.usableLiters) ? fmt(c.derived.usableLiters,2) : "—")],
    ["Max weight (kg)", Number.isFinite(c.maxWeightKg) ? fmt(c.maxWeightKg,2) : "—"],
    ["Tare (kg)", Number.isFinite(c.tareWeightKg) ? fmt(c.tareWeightKg,2) : "—"],
    ["Mixing allowed", typeof c.mixingAllowed === "boolean" ? (c.mixingAllowed ? "Yes" : "No") : "—"],
    ["Vented", typeof c.vented === "boolean" ? (c.vented ? "Yes" : "No") : "—"],
    ["Max SKUs per box", Number.isFinite(c.maxSkusPerBox) ? String(c.maxSkusPerBox) : "—"],
    ["Created", asDate(c.createdAt)],
    ["Updated", asDate(c.updatedAt)],
  ];
  const core = q("#core-rows");
  core.innerHTML = "";
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<label>${escapeHtml(label)}</label><div>${escapeHtml(String(value ?? "—"))}</div>`;
    core.appendChild(row);
  });

  // Editable
  q("#pkg-name").value = draftName;
  const container = q("#schema-rows");
  container.innerHTML = "";
  packageSchema.forEach(f => {
    const row = document.createElement("div");
    row.className = "row";
    const val = draftValues[f.id];
    row.innerHTML = `
      <label>${escapeHtml(f.label)}</label>
      <input type="${f.type === 'number' ? 'number' : 'text'}" value="${val ?? ""}" data-fid="${escapeHtml(f.id)}" />
    `;
    container.appendChild(row);
  });

  container.oninput = (e) => {
    const input = e.target.closest("input[data-fid]");
    if (!input) return;
    const fid = input.getAttribute("data-fid");
    const field = packageSchema.find(x => x.id === fid);
    draftValues[fid] = (field?.type === "number")
      ? (input.value === "" ? null : Number(input.value))
      : input.value;
  };
  q("#pkg-name").oninput = (e) => { draftName = e.target.value; };

  // Raw
  q("#raw").textContent = JSON.stringify(current, null, 2);
}

// ===== Actions =====
q("#btn-reload")?.addEventListener("click", async () => {
  try {
    const list = await apiFetch(ENDPOINTS.listPackages());
    current = list.find(p => p.id === PACKAGE_ID) || current;
    const base = Object.fromEntries(packageSchema.map(f => [f.id, f.defaultValue ?? null]));
    draftValues = { ...base, ...(current.values || {}) };
    draftName = current.name ?? current.id ?? current.key ?? "";
    renderAll();
  } catch (e) { console.error(e); alert(e.message); }
});

q("#btn-save")?.addEventListener("click", async () => {
  try {
    const payload = { name: (draftName || "").trim() || "New Package", values: { ...draftValues } };
    await apiFetch(ENDPOINTS.upsertPackage(PACKAGE_ID), { method: "PUT", body: payload });
    // refresh this window's data + ask opener to reload
    try { window.opener?.TM?.reload && window.opener.TM.reload(); } catch {}
    const list = await apiFetch(ENDPOINTS.listPackages());
    current = list.find(p => p.id === PACKAGE_ID) || current;
    renderAll();
    alert("Saved.");
  } catch (e) { console.error(e); alert(`Save failed: ${e.message}`); }
});
