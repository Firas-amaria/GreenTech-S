/* ===== Checklist (persistent) ===== */
import { $, $$ } from "./helpers.js";
import { state } from "./state.js";

export function initChecklist(order){
  state.checklist = order.items.map(it => ({
    sku: it.sku, name: it.name, shelf: it.shelf, status: 'pending'
  }));
  renderChecklist();
}
export function markChecklist(sku, status){
  const it = state.checklist.find(x=>x.sku===sku);
  if(it){ it.status = status; renderChecklist(); }
}
export function renderChecklist(){
  const list = $("#checklistList");
  const prog = $("#checklistProgress");
  if(!list || !prog){ return; }

  const curShelf = state.routeOrder?.[state.routeIndex];
  list.innerHTML = "";
  state.checklist.forEach(it=>{
    const li = document.createElement("li");
    li.className = "chk";
    if(it.status === "done") li.classList.add("done");
    if(it.status === "skipped") li.classList.add("skipped");
    if(it.status === "pending" && curShelf && it.shelf === curShelf) li.classList.add("current");
    li.innerHTML = `
      <span class="box"></span>
      <div style="display:grid; gap:2px">
        <span class="name">${it.name}</span>
        <small>📍 ${it.shelf}</small>
      </div>
    `;
    list.appendChild(li);
  });

  const handled = state.checklist.filter(x=>x.status!=="pending").length;
  prog.textContent = `${handled} / ${state.checklist.length}`;
}
