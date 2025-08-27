/* ===== UI: sidebar, tabs, toggles, quick start ===== */
import { $, $$, isTyping, toast } from "./helpers.js";
import { state, makeOrder, allShelves } from "./state.js";
import { renderTop } from "./dashboard.js";
import { initChecklist } from "./checklist.js";
import { renderPick } from "./pick.js";

export function goView(sel){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $(sel).classList.add("active");
  $$(".stab").forEach(b=>b.classList.remove("active"));
  document.querySelector(`.stab[data-target="${sel}"]`)?.classList.add("active");
}

export function bindSidebar(){
  const bodyEl = document.body;
  const sidebarToggle = $("#sidebarToggle");
  function toggleSidebar(force){
    const open = force ?? !bodyEl.classList.contains("sidebar-open");
    bodyEl.classList.toggle("sidebar-open", open);
  }
  if (sidebarToggle) sidebarToggle.addEventListener("click", ()=>toggleSidebar());
  document.addEventListener("keydown",(e)=>{
    if(e.ctrlKey && (e.key.toLowerCase()==='b')){ e.preventDefault(); toggleSidebar(); }
  });
}

export function bindTabs(){
  $$(".stab").forEach(b=>b.addEventListener("click",()=>goView(b.dataset.target)));
}

export function bindActiveToggle(onAutoAssign){
  $("#pickerActive")?.addEventListener("change",(e)=>{
    state.pickerIsActive = e.target.checked;
    renderTop(state.pickerIsActive);
    if(state.pickerIsActive){ onAutoAssign(); } else {
      $("#pickOrderId").textContent="—";
      $("#startShelf").textContent="—";
      $("#pickItems").innerHTML="";
      $("#routeList").innerHTML="";
      $("#routeDebug").textContent="";
      const lock=$("#pickLockMessage"); if(lock) lock.textContent="Inactive: no orders will be assigned.";
    }
  });
}

export function bindKeyboard(onStartWeigh, onFinish){
  document.addEventListener("keydown",(e)=>{
    if (isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) return;
    const key=e.key;
    if(/^[1-5]$/.test(key)){
      const index=Number(key)-1; const btn=$$(".stab")[index];
      if(btn){ btn.click(); e.preventDefault(); }
      return;
    }
    if(key==="Enter"){
      if($("#view-pick").classList.contains("active")){
        onStartWeigh(); e.preventDefault();
      }
      return;
    }
    if(key.toLowerCase()==="w"){
      if($("#view-weigh").classList.contains("active")){
        onFinish(); e.preventDefault();
      }
      return;
    }
  });
}

export function autoAssignOrder(){
  if(!state.pickerIsActive){ state.currentOrder=null; return; }
  state.currentOrder = makeOrder(Math.floor(Math.random()*9000)+1000);
  state.startShelf = allShelves[Math.floor(Math.random()*allShelves.length)];
  initChecklist(state.currentOrder);
  toast(`Auto-assigned ${state.currentOrder.id}`);
  renderTop(state.pickerIsActive);
  renderPick();
  goView("#view-pick");
}
