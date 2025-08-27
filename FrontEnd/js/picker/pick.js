/* ===== Picking view ===== */
import { $, $$ } from "./helpers.js";
import { state } from "./state.js";
import { planRoute } from "./routing.js";
import { renderChecklist } from "./checklist.js";
import { MAP_ID } from "./map.js";

export function renderPick(){
  const lockMsg = $("#pickLockMessage");
  if(!state.pickerIsActive){
    $("#pickOrderId").textContent="—";
    $("#startShelf").textContent="—";
    $("#pickItems").innerHTML="";
    $("#routeList").innerHTML="";
    $("#routeDebug").textContent="";
    if (lockMsg) lockMsg.textContent = "Inactive: switch to Active on the Dashboard to get an order.";
    return;
  }
  if(!state.currentOrder){
    if (lockMsg) lockMsg.textContent = "Waiting for system to assign…";
    return;
  }

  $("#pickOrderId").textContent=state.currentOrder.id;
  $("#startShelf").textContent=state.startShelf;

  const items=$("#pickItems"); items.innerHTML="";
  state.currentOrder.items.forEach(it=>{
    const d=document.createElement("div"); d.className='item';
    d.textContent=`${it.name} • ${it.qty}${it.unit==="kg"?" kg":" u"} • ${it.shelf}`;
    items.appendChild(d);
  });

  renderRoute(); focusRouteOnStage();
  renderChecklist();
  if (lockMsg) lockMsg.textContent = "Assigned by system. Proceed to Weigh when done.";
}

export function renderRoute(){
  if(!state.currentOrder) return;
  const targets=state.currentOrder.items.map(i=>i.shelf);
  const {order,debug}=planRoute(state.startShelf,targets);
  state.routeOrder = order;
  const list=$("#routeList"); list.innerHTML="";
  order.forEach(id=>{
    const li=document.createElement("li");
    li.innerHTML=`Go to <b>${id}</b>`;
    list.appendChild(li);
  });
  $("#routeDebug").textContent=debug.join("\n");

  $('#'+MAP_ID) && $$('#'+MAP_ID+' .shelf-node').forEach(n=>n.classList.remove('route'));
  order.forEach(id=>{
    const n=document.querySelector(`#${MAP_ID} .shelf-node[data-shelf="${id}"]`);
    if(n) n.classList.add('route');
  });
}

export function focusRouteOnStage(step=0){
  const route = Array.from($("#routeList").children)
    .map(li=>li.textContent.replace("Go to","").trim());
  $$('#'+MAP_ID+' .shelf-node').forEach(n=>n.classList.remove('active'));
  const first = route[step];
  const node = document.querySelector(`#${MAP_ID} .shelf-node[data-shelf="${first}"]`);
  if(node) node.classList.add('active');
}
