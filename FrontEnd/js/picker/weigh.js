/* ===== Weigh flow ===== */
import { $, $$ } from "./helpers.js";
import { toast, celebrate } from "./helpers.js";
import { state, makeOrder, allShelves, user } from "./state.js";
import { planRoute } from "./routing.js";
import { renderTop } from "./dashboard.js";
import { renderChecklist, markChecklist } from "./checklist.js";

export function setWeighControlsEnabled(enabled){
  $("#wInput")?.toggleAttribute("disabled", !enabled);
  $("#wUnit")?.toggleAttribute("disabled", !enabled);
  $("#btnConfirmItem")?.classList.toggle("disabled", !enabled);
  $("#btnSkipItem")?.classList.toggle("disabled", !enabled);
}
export function doneAll(){ 
  return state.currentOrder && (state.picked.length + state.skipped.length >= state.currentOrder.items.length); 
}
export function updateFinishVisibility(){
  const btn=$("#btnFinishOrder");
  if(!btn) return;
  btn.classList.toggle("hidden", !doneAll());
  setWeighControlsEnabled(!doneAll()); // lock when all handled
}

export function startWeighFlow(){
  if(!state.pickerIsActive){ toast("Inactive – cannot start weigh"); return; }
  if(!state.currentOrder){ toast("No order assigned yet"); return; }
  state.routeOrder=planRoute(state.startShelf,state.currentOrder.items.map(i=>i.shelf)).order;
  state.routeIndex=0; state.picked=[]; state.skipped=[];
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary();
  updateFinishVisibility();

  $$('#lcMap .shelf-node').forEach(n=>n.classList.remove('active'));
  const c=document.querySelector(`#lcMap .shelf-node[data-shelf="${state.routeOrder[0]}"]`);
  if(c) c.classList.add('active');

  renderChecklist(); // highlight current
}

export function currentItem(){
  if(!state.currentOrder) return null;
  const shelf=state.routeOrder[state.routeIndex];
  return state.currentOrder.items.find(i=>i.shelf===shelf);
}
export function renderWeighPanel(){
  const it=currentItem();
  $("#wOrderId").textContent=state.currentOrder?.id ?? "—";
  $("#wShelf").textContent=it?it.shelf:"—";
  $("#wItemName").textContent=it?it.name:"—";
  $("#wTarget").textContent=it?`${it.qty}${it.unit==="kg"?" kg":" u"}`:"—";
  $("#wUnit").value=it?.unit || "kg";
  $("#wInput").value="";
}
export function renderWeighAccum(){
  const el=$("#weighAccum"); el.innerHTML="";
  state.picked.forEach(p=>{
    const d=document.createElement("div");
    d.className="item";
    d.textContent=`${p.name} • ${p.measured}${p.unit==="kg"?" kg":" u"} (target ${p.qty}${p.unit==="kg"?" kg":" u"})`;
    el.appendChild(d);
  });
  $("#miniSummary").textContent = state.currentOrder
    ? `#${state.currentOrder.id}\nPicked: ${state.picked.length}/${state.currentOrder.items.length}`
    : `No order assigned`;
}
export function withinTol(target,measured,unit){
  if(unit==="kg"){ const tol=0.05*target; return Math.abs(measured-target)<=tol; }
  return Number(measured)===Number(target);
}
export function renderWeighSummary(){
  const lines=[];
  if(!state.currentOrder){ $("#weighSummary").textContent="—"; updateFinishVisibility(); return; }
  state.picked.forEach(p=>lines.push(`${p.name} | ${p.measured}${p.unit==="kg"?" kg":" u"} | target ${p.qty}${p.unit==="kg"?" kg":" u"} | ${p.shelf}`));
  const total=state.picked.filter(p=>p.unit==="kg").reduce((s,p)=>s+Number(p.measured||0),0);
  lines.unshift(`Order #${state.currentOrder.id}`,'-----------------------');
  lines.push('-----------------------',`Total kg: ${total.toFixed(2)}`);
  lines.push(`Status: ${doneAll()? "Ready for courier (mock)" : "In progress"}`);
  $("#weighSummary").textContent=lines.join("\n");
  updateFinishVisibility();
}

export function bindWeighButtons(){
  $("#btnMockIoT")?.addEventListener("click",()=>{ const it=currentItem(); if(!it) return;
    $("#wInput").value=it.unit==="kg"? Number(it.qty).toFixed(2): Number(it.qty);
  });
  $("#btnConfirmItem")?.addEventListener("click",()=>{ const it=currentItem(); if(!it) return;
    const measured=Number($("#wInput").value||0), unit=$("#wUnit").value;
    if(!measured){ toast("Enter a measurement"); return; }
    if(!withinTol(Number(it.qty),measured,unit)){ if(!confirm("Outside tolerance (±5% kg / exact units). Approve anyway?")) return; }
    state.picked.push({...it, measured, unit});
    markChecklist(it.sku, "done");
    state.routeIndex=Math.min(state.routeIndex+1, state.routeOrder.length-1);
    renderWeighPanel(); renderWeighAccum(); renderWeighSummary(); celebrate();
    updateFinishVisibility(); renderChecklist();
    $$('#lcMap .shelf-node').forEach(n=>n.classList.remove('active'));
    const c=document.querySelector(`#lcMap .shelf-node[data-shelf="${state.routeOrder[state.routeIndex]}"]`);
    if(c) c.classList.add('active');
  });
  $("#btnSkipItem")?.addEventListener("click",()=>{ const it=currentItem(); if(!it) return;
    state.skipped.push(it); markChecklist(it.sku, "skipped");
    state.routeIndex=Math.min(state.routeIndex+1, state.routeOrder.length-1);
    renderWeighPanel(); renderWeighAccum(); renderWeighSummary();
    updateFinishVisibility(); renderChecklist();
  });

  $("#btnFinishOrder")?.addEventListener("click", finishOrder);
}

export function finishOrder(){
  if(!state.currentOrder){ toast("No order to finish"); return; }
  if(!doneAll()){ if(!confirm("Not all items handled. Continue anyway?")) return; }
  window.print();
  toast("Order completed (mock) and sent to courier 🚚");
  celebrate();
  user.shiftOrdersDone+=1; user.xp+=Math.floor(Math.random()*26)+15;
  renderTop(state.pickerIsActive);

  // Lock, hide finish, clear
  setWeighControlsEnabled(false);
  $("#btnFinishOrder")?.classList.add("hidden");
  $("#weighSummary").textContent += "\n\n✅ Finished. Start a new order to continue.";
  $("#miniSummary").textContent = "Finished. Use Quick start or toggle Active to get a new order.";

  state.currentOrder=null; state.picked=[]; state.skipped=[]; state.routeOrder=[]; state.routeIndex=0;
  state.checklist=[]; renderChecklist();

  // back to dashboard
  import("./ui.js").then(m=>m.goView("#view-dashboard"));
}

/* public helper for external triggers */
export function startWeighFromPick(){
  import("./ui.js").then(m=>{
    m.goView("#view-weigh");
    startWeighFlow();
  });
}
