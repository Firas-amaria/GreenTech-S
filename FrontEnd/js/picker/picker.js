/* ===================== Helpers ===================== */
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const choice=a=>a[rand(0,a.length-1)];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const isTyping = (el) => {
  const t = el?.tagName?.toLowerCase();
  return t === "input" || t === "textarea" || t === "select" || el?.isContentEditable;
};

/* ===================== Sidebar toggle ===================== */
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

/* ===================== Data model (mock) ===================== */
const SECTORS=["A","B","C","D","E","F","G","H"];
const RINGS=[1,2,3,4,5];
const allShelves=[]; SECTORS.forEach(s=>RINGS.forEach(r=>allShelves.push(`${s}${r}`)));
const congestion={}; allShelves.forEach(s=>congestion[s]=rand(0,3));

let W_ANGLE=1.0, W_RADIUS=0.9, TURN_PENALTY=0.5;

/* Mock user */
const user={
  name: choice(["David","Noa","Erez","Sahar","Walaa","Maya","Guy"]),
  level: rand(2,7),
  xp: rand(200,900),
  xpNext: 1000,
  shiftOrdersDone: rand(4,18),
  badges:[
    {emo:"🕒",text:"Speedster"},
    {emo:"🧭",text:"Zero Zigzag"},
    {emo:"📦",text:"10 Orders Streak"}
  ],
  streak: rand(1,6)
};

/* ===================== Orders (no queue; generate on demand) ===================== */
function makeOrder(id){
  const cnt=rand(2,5), items=[], used=shuffle(allShelves).slice(0,cnt);
  for(let i=0;i<cnt;i++){
    const unit = Math.random()<0.7? "kg":"unit";
    const qty  = unit==="kg"? (rand(5,25)/10).toFixed(1) : rand(1,3);
    items.push({
      sku:`SKU-${id}-${i}`,
      name:choice(["Cucumber","Tomato","Lettuce","Carrot","Pepper","Apple","Banana","Grapes","Avocado","Orange"]),
      qty:qty.toString(),
      unit,
      farmer:choice(["Farmer A","Farmer B","Farmer C","Farmer D","Farmer E"]),
      shelf:used[i]
    });
  }
  return {id:`ORD-${id}`, items};
}
let currentOrder=null;
let startShelf=choice(allShelves);
let pickerIsActive=true; // Dashboard toggle

function autoAssignOrder(){
  if(!pickerIsActive){ currentOrder=null; renderPickLock(); return; }
  currentOrder = makeOrder(rand(1000,9999));   // fresh order each time
  startShelf = choice(allShelves);
  initChecklist(currentOrder);
  toast(`Auto-assigned ${currentOrder.id}`,"ok");
  renderPick();
  goView("#view-pick");
}

/* ===================== HUD ===================== */
function renderTop(){
  $("#uName").textContent=user.name;
  $("#uTitle").textContent=`Level ${user.level} • Citrus Ninja`;
  $("#xpNow").textContent=user.xp; $("#xpNext").textContent=user.xpNext;
  $("#xpFill").style.width=`${Math.min(100,Math.floor(100*user.xp/user.xpNext))}%`;
  $("#streakNum").textContent=user.streak;
  $("#statOrders").textContent=user.shiftOrdersDone;
  $("#statAvg").textContent=`${rand(9,14)}:${String(rand(0,59)).padStart(2,"0")}`;
  $("#statRecords").textContent=rand(0,5);

  const b=$("#badges"); b.innerHTML="";
  user.badges.forEach(x=>{
    const d=document.createElement("div"); d.className="badge";
    d.innerHTML=`<span class="emo">${x.emo}</span><span>${x.text}</span>`;
    b.appendChild(d);
  });

  const tgl = $("#pickerActive");
  const lbl = $("#pickerActiveLabel");
  if (tgl){
    tgl.checked = pickerIsActive;
    lbl.textContent = pickerIsActive ? "Active" : "Inactive";
    lbl.style.background = pickerIsActive ? "#063c2a" : "#3d1c1c";
    lbl.style.border = "1px solid var(--border)";
  }
}

/* ===================== Racetrack + Spokes Map (SVG) ===================== */
const MAP_ID = "lcMap";
const MAP_W = 800, MAP_H = 520;
const MARGIN = 30;
const LOOP_W = 70;
const INNER_X = MARGIN + LOOP_W;
const INNER_Y = MARGIN + LOOP_W;
const OUTER_X = MARGIN;
const OUTER_Y = MARGIN;
const OUTER_W = MAP_W - 2*MARGIN;
const OUTER_H = MAP_H - 2*MARGIN;
const INNER_W = OUTER_W - 2*LOOP_W;
const INNER_H = OUTER_H - 2*LOOP_W;

const SPOKE_LEN = 230;
const DEPTH_STEP = Math.floor(SPOKE_LEN / RINGS.length);

const POS_T = [0.28, 0.72];
const POS_R = [0.30, 0.70];
const POS_B = [0.28, 0.72];
const POS_L = [0.30, 0.70];

function sectorAnchor(s){
  switch(s){
    case "A": return ["T", POS_T[0]];
    case "B": return ["T", POS_T[1]];
    case "C": return ["R", POS_R[0]];
    case "D": return ["R", POS_R[1]];
    case "E": return ["B", POS_B[1]];
    case "F": return ["B", POS_B[0]];
    case "G": return ["L", POS_L[1]];
    case "H": return ["L", POS_L[0]];
    default:  return ["T", 0.5];
  }
}
function spokeMouth(s){
  const [side, t] = sectorAnchor(s);
  let x=0, y=0, dx=0, dy=0;
  if(side==="T"){ x = INNER_X + t*INNER_W; y = INNER_Y; dx = 0; dy = +1; }
  else if(side==="R"){ x = INNER_X + INNER_W; y = INNER_Y + t*INNER_H; dx = -1; dy = 0; }
  else if(side==="B"){ x = INNER_X + t*INNER_W; y = INNER_Y + INNER_H; dx = 0; dy = -1; }
  else{ x = INNER_X; y = INNER_Y + t*INNER_H; dx = +1; dy = 0; }
  return { x, y, dx, dy };
}
function shelfXY(id){
  const m = /^([A-Z])(\d+)$/.exec(id);
  const sector = m[1], r = Number(m[2]);
  const {x, y, dx, dy} = spokeMouth(sector);
  const depth = Math.min(Math.max(r,1), RINGS.length)*DEPTH_STEP;
  return { x: x + dx * depth, y: y + dy * depth };
}
function buildStageMap(){
  const host = document.getElementById("stageMap");
  if(!host){ console.warn("stageMap not found"); return; }
  host.innerHTML = "";
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("id", MAP_ID);
  svg.setAttribute("viewBox", `0 0 ${MAP_W} ${MAP_H}`);
  svg.style.width = "100%";
  svg.style.height = "100%";
  host.appendChild(svg);

  // defs
  const defs = document.createElementNS(svgNS, "defs");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id","arrow"); marker.setAttribute("viewBox","0 0 10 10");
  marker.setAttribute("refX","7"); marker.setAttribute("refY","5");
  marker.setAttribute("markerWidth","6"); marker.setAttribute("markerHeight","6");
  marker.setAttribute("orient","auto-start-reverse");
  const tri = document.createElementNS(svgNS, "path");
  tri.setAttribute("d","M 0 0 L 10 5 L 0 10 z");
  tri.setAttribute("fill","#7fb6ff");
  marker.appendChild(tri); defs.appendChild(marker); svg.appendChild(defs);

  const outer = document.createElementNS(svgNS, "rect");
  outer.setAttribute("x", OUTER_X); outer.setAttribute("y", OUTER_Y);
  outer.setAttribute("width", OUTER_W); outer.setAttribute("height", OUTER_H);
  outer.setAttribute("class","rt-outer");
  svg.appendChild(outer);

  const inner = document.createElementNS(svgNS, "rect");
  inner.setAttribute("x", INNER_X); inner.setAttribute("y", INNER_Y);
  inner.setAttribute("width", INNER_W); inner.setAttribute("height", INNER_H);
  inner.setAttribute("class","rt-inner");
  svg.appendChild(inner);

  // one-way arrows on the loop
  const arrowLines = [
    {x1: INNER_X+20, y1: INNER_Y-LOOP_W/2, x2: INNER_X+INNER_W-20, y2: INNER_Y-LOOP_W/2},
    {x1: INNER_X+INNER_W+LOOP_W/2, y1: INNER_Y+20, x2: INNER_X+INNER_W+LOOP_W/2, y2: INNER_Y+INNER_H-20},
    {x1: INNER_X+INNER_W-20, y1: INNER_Y+INNER_H+LOOP_W/2, x2: INNER_X+20, y2: INNER_Y+INNER_H+LOOP_W/2},
    {x1: INNER_X-LOOP_W/2, y1: INNER_Y+INNER_H-20, x2: INNER_X-LOOP_W/2, y2: INNER_Y+20},
  ];
  arrowLines.forEach(a=>{
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1",a.x1); l.setAttribute("y1",a.y1);
    l.setAttribute("x2",a.x2); l.setAttribute("y2",a.y2);
    l.setAttribute("class","rt-arrow");
    l.setAttribute("marker-end","url(#arrow)");
    svg.appendChild(l);
  });

  // spokes + labels
  SECTORS.forEach((s)=>{
    const {x,y,dx,dy} = spokeMouth(s);
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x); line.setAttribute("y1", y);
    line.setAttribute("x2", x + dx * SPOKE_LEN); line.setAttribute("y2", y + dy * SPOKE_LEN);
    line.setAttribute("class","spoke");
    svg.appendChild(line);

    const lx = x - 14*dy + 14*dx;
    const ly = y - 14*dx - 14*dy;
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", lx); label.setAttribute("y", ly);
    label.setAttribute("class", "sector-label");
    label.setAttribute("text-anchor","middle"); label.setAttribute("dominant-baseline","middle");
    label.textContent = s; svg.appendChild(label);
  });

  // shelves
  allShelves.forEach(id=>{
    const {x,y} = shelfXY(id);
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "shelf-node");
    g.setAttribute("data-shelf", id);

    const dot = document.createElementNS(svgNS, "rect");
    dot.setAttribute("x", x-10); dot.setAttribute("y", y-10);
    dot.setAttribute("rx", 4); dot.setAttribute("ry", 4);
    dot.setAttribute("width", 20); dot.setAttribute("height", 20);
    dot.setAttribute("class", "shelf-dot");
    g.appendChild(dot);

    const txt = document.createElementNS(svgNS, "text");
    txt.setAttribute("x", x); txt.setAttribute("y", y+4);
    txt.setAttribute("class", "shelf-text");
    txt.setAttribute("text-anchor","middle"); txt.setAttribute("dominant-baseline","middle");
    txt.textContent = id; g.appendChild(txt);

    svg.appendChild(g);
  });
}

/* ===================== Dashboard / Traffic Monitor ===================== */
function renderDashboardViews(){
  const goals=[
    {t:"Complete 10 orders",v:Math.min(user.shiftOrdersDone,10),max:10},
    {t:"Keep zigzag low",v:rand(0,8),max:8},
    {t:"Break a personal record",v:rand(0,1),max:1}
  ];
  const gEl=$("#dailyGoals"); gEl.innerHTML="";
  goals.forEach(g=>{
    const pct=Math.min(100,Math.floor(100*g.v/g.max));
    const li=document.createElement("li"); li.className="goal";
    li.innerHTML=`<div class="left"><span class="chip">${g.v}/${g.max}</span> ${g.t}</div>
                  <div class="bar"><div class="fill" style="width:${pct}%"></div></div>`;
    gEl.appendChild(li);
  });

  const map=$("#ringMap"); map.innerHTML="";
  const HIGH = 3;
  SECTORS.forEach(s=>RINGS.forEach(r=>{
    const id=`${s}${r}`;
    const load=congestion[id];
    const cell=document.createElement("div");
    cell.className="cell";
    cell.style.background="transparent";
    cell.style.border="1px solid var(--border)";
    cell.style.position="relative";

    if(load >= HIGH){
      cell.style.background = "linear-gradient(180deg, #3a0c0c, #280707)";
      cell.style.boxShadow = "0 0 14px rgba(239,68,68,.35) inset";
      const dot = document.createElement("span");
      dot.style.position="absolute";
      dot.style.right="6px"; dot.style.top="6px";
      dot.style.width="8px"; dot.style.height="8px";
      dot.style.borderRadius="999px";
      dot.style.background="#ef4444";
      dot.style.boxShadow="0 0 12px rgba(239,68,68,.75)";
      cell.appendChild(dot);
    }

    cell.innerHTML += `<div class="shelf" style="opacity:${load>=HIGH?1:.35}">${id}</div>`;
    map.appendChild(cell);
  }));
}

/* ===================== Route planning ===================== */
function sectorIndex(s){return SECTORS.indexOf(s)}
function parseShelf(id){const m=/^([A-Z])(\d+)$/.exec(id);return {s:m[1],r:Number(m[2])}}
function shelfToPolar(id){
  const{ s,r}=parseShelf(id);
  const a=sectorIndex(s)/SECTORS.length;
  const rad=Math.min(Math.max(r,1),RINGS.length)/RINGS.length;
  return {a: a, rad: rad, s};
}
function angDist(a,b){const d=Math.abs(a-b);return Math.min(d,1-d)}
function moveDir(fs,ts){
  const fi=sectorIndex(fs),ti=sectorIndex(ts),n=SECTORS.length;
  const cw=(ti-fi+n)%n, ccw=(fi-ti+n)%n;
  if(cw===0&&ccw===0)return 0;
  return (cw<=ccw)?+1:-1;
}
function travelCost(from,to,last=0){
  const A=shelfToPolar(from),B=shelfToPolar(to);
  const base=W_ANGLE*angDist(A.a,B.a)+W_RADIUS*Math.abs(A.rad-B.rad);
  const cong=(congestion[to]||0)*0.5;
  const dir=moveDir(A.s,B.s);
  const turn=(last!==0&&dir!==0&&dir!==last)?TURN_PENALTY=0.5:0; // keep penalty
  return {cost:base+cong+turn,dir};
}
function planRoute(start,targets){
  const ord=[],left=[...targets],dbg=[];
  let cur=start,last=0;
  while(left.length){
    let best=null,cst=1e9,bdir=0;
    left.forEach(id=>{
      const{cost,dir}=travelCost(cur,id,last);
      if(cost<cst){cst=cost;best=id;bdir=dir}
    });
    ord.push(best);
    dbg.push(`from ${cur} → ${best} (cost=${cst.toFixed(3)}, dir=${bdir>=0?"CW":"CCW"})`);
    left.splice(left.indexOf(best),1);
    last=bdir||last; cur=best;
  }
  return {order:ord,debug:dbg};
}

/* ===================== Pick view ===================== */
function renderPick(){
  const lockMsg = $("#pickLockMessage");
  if(!pickerIsActive){
    $("#pickOrderId").textContent="—";
    $("#startShelf").textContent="—";
    $("#pickItems").innerHTML="";
    $("#routeList").innerHTML="";
    $("#routeDebug").textContent="";
    if (lockMsg) lockMsg.textContent = "Inactive: switch to Active on the Dashboard to get an order.";
    return;
  }
  if(!currentOrder){
    if (lockMsg) lockMsg.textContent = "Waiting for system to assign…";
    return autoAssignOrder();
  }

  $("#pickOrderId").textContent=currentOrder.id; $("#startShelf").textContent=startShelf;
  const items=$("#pickItems"); items.innerHTML="";
  currentOrder.items.forEach(it=>{
    const d=document.createElement("div"); d.className='item';
    d.textContent=`${it.name} • ${it.qty}${it.unit==="kg"?" kg":" u"} • ${it.shelf}`;
    items.appendChild(d);
  });

  renderRoute(); focusRouteOnStage();
  renderChecklist(); // keep current highlight in sync
  if (lockMsg) lockMsg.textContent = "Assigned by system. Proceed to Weigh when done.";
}
function renderRoute(){
  if(!currentOrder) return;
  const targets=currentOrder.items.map(i=>i.shelf);
  const {order,debug}=planRoute(startShelf,targets);
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
function focusRouteOnStage(step=0){
  const route = Array.from($("#routeList").children)
    .map(li=>li.textContent.replace("Go to","").trim());
  $$('#'+MAP_ID+' .shelf-node').forEach(n=>n.classList.remove('active'));
  const first = route[step];
  const node = document.querySelector(`#${MAP_ID} .shelf-node[data-shelf="${first}"]`);
  if(node) node.classList.add('active');
}

/* ===================== Weigh flow ===================== */
let routeOrder=[], routeIndex=0, picked=[], skipped=[];
/* ===================== Checklist ===================== */
let checklist = []; // [{sku, name, shelf, status: 'pending' | 'done' | 'skipped'}]

function initChecklist(order){
  checklist = order.items.map(it => ({
    sku: it.sku, name: it.name, shelf: it.shelf, status: 'pending'
  }));
  renderChecklist();
}

function renderChecklist(){
  const list = document.getElementById("checklistList");
  const prog = document.getElementById("checklistProgress");
  if(!list || !prog){ return; }

  // derive "current" shelf from route
  const curShelf = routeOrder?.[routeIndex];

  list.innerHTML = "";
  checklist.forEach(it=>{
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

  const handled = checklist.filter(x=>x.status!=="pending").length;
  prog.textContent = `${handled} / ${checklist.length}`;
}

function markChecklist(sku, status){
  const it = checklist.find(x=>x.sku===sku);
  if(it){ it.status = status; renderChecklist(); }
}

function setWeighControlsEnabled(enabled){
  $("#wInput")?.toggleAttribute("disabled", !enabled);
  $("#wUnit")?.toggleAttribute("disabled", !enabled);
  $("#btnConfirmItem")?.classList.toggle("disabled", !enabled);
  $("#btnSkipItem")?.classList.toggle("disabled", !enabled);
}
function doneAll(){ return currentOrder && (picked.length + skipped.length >= currentOrder.items.length); }
function updateFinishVisibility(){
  const btn=$("#btnFinishOrder");
  if(!btn) return;
  btn.classList.toggle("hidden", !doneAll());
  setWeighControlsEnabled(!doneAll()); // lock when all items handled
}

function startWeighFlow(){
  if(!pickerIsActive){ toast("Inactive – cannot start weigh","warn"); return; }
  if(!currentOrder){ toast("No order assigned yet","warn"); return; }
  routeOrder=planRoute(startShelf,currentOrder.items.map(i=>i.shelf)).order;
  routeIndex=0; picked=[]; skipped=[];
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary();
  updateFinishVisibility();

  $$('#'+MAP_ID+' .shelf-node').forEach(n=>n.classList.remove('active'));
  const c=document.querySelector(`#${MAP_ID} .shelf-node[data-shelf="${routeOrder[0]}"]`);
  if(c) c.classList.add('active');

  renderChecklist(); // highlight current shelf in checklist
}
function currentItem(){
  if(!currentOrder) return null;
  const shelf=routeOrder[routeIndex];
  return currentOrder.items.find(i=>i.shelf===shelf);
}
function renderWeighPanel(){
  const it=currentItem();
  $("#wOrderId").textContent=currentOrder?.id ?? "—";
  $("#wShelf").textContent=it?it.shelf:"—";
  $("#wItemName").textContent=it?it.name:"—";
  $("#wTarget").textContent=it?`${it.qty}${it.unit==="kg"?" kg":" u"}`:"—";
  $("#wUnit").value=it?.unit || "kg";
  $("#wInput").value="";
}
function renderWeighAccum(){
  const el=$("#weighAccum"); el.innerHTML="";
  picked.forEach(p=>{
    const d=document.createElement("div");
    d.className="item";
    d.textContent=`${p.name} • ${p.measured}${p.unit==="kg"?" kg":" u"} (target ${p.qty}${p.unit==="kg"?" kg":" u"})`;
    el.appendChild(d);
  });
  $("#miniSummary").textContent = currentOrder
    ? `#${currentOrder.id}\nPicked: ${picked.length}/${currentOrder.items.length}`
    : `No order assigned`;
}
function withinTol(target,measured,unit){
  if(unit==="kg"){ const tol=0.05*target; return Math.abs(measured-target)<=tol; }
  return Number(measured)===Number(target);
}
function renderWeighSummary(){
  const lines=[];
  if(!currentOrder){ $("#weighSummary").textContent="—"; updateFinishVisibility(); return; }
  picked.forEach(p=>lines.push(`${p.name} | ${p.measured}${p.unit==="kg"?" kg":" u"} | target ${p.qty}${p.unit==="kg"?" kg":" u"} | ${p.shelf}`));
  const total=picked.filter(p=>p.unit==="kg").reduce((s,p)=>s+Number(p.measured||0),0);
  lines.unshift(`Order #${currentOrder.id}`,'-----------------------');
  lines.push('-----------------------',`Total kg: ${total.toFixed(2)}`);
  lines.push(`Status: ${doneAll()? "Ready for courier (mock)" : "In progress"}`);
  $("#weighSummary").textContent=lines.join("\n");
  updateFinishVisibility();
}
$("#btnMockIoT")?.addEventListener("click",()=>{ const it=currentItem(); if(!it) return;
  $("#wInput").value=it.unit==="kg"? Number(it.qty).toFixed(2): Number(it.qty); });
$("#btnConfirmItem")?.addEventListener("click",()=>{ const it=currentItem(); if(!it) return;
  const measured=Number($("#wInput").value||0), unit=$("#wUnit").value;
  if(!measured){ toast("Enter a measurement","warn"); return; }
  if(!withinTol(Number(it.qty),measured,unit)){ if(!confirm("Outside tolerance (±5% kg / exact units). Approve anyway?")) return; }
  picked.push({...it, measured, unit});
  markChecklist(it.sku, "done");                 // ✅ checklist
  routeIndex=Math.min(routeIndex+1, routeOrder.length-1);
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary(); celebrate();
  updateFinishVisibility();
  renderChecklist();                              // ✅ refresh current highlight
  $$('#'+MAP_ID+' .shelf-node').forEach(n=>n.classList.remove('active'));
  const c=document.querySelector(`#${MAP_ID} .shelf-node[data-shelf="${routeOrder[routeIndex]}"]`);
  if(c) c.classList.add('active');
});
$("#btnSkipItem")?.addEventListener("click",()=>{ const it=currentItem(); if(!it) return;
  skipped.push(it);
  markChecklist(it.sku, "skipped");              // ✅ checklist
  routeIndex=Math.min(routeIndex+1, routeOrder.length-1);
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary();
  updateFinishVisibility();
  renderChecklist();                              // ✅ refresh current highlight
});

/* ===================== Finish & Competition ===================== */
$("#btnFinishOrder")?.addEventListener("click", finishOrder);
function finishOrder(){
  if(!currentOrder){ toast("No order to finish","warn"); return; }
  if(!doneAll()){ if(!confirm("Not all items handled. Continue anyway?")) return; }
  window.print();
  toast("Order completed (mock) and sent to courier 🚚","ok");
  celebrate();
  user.shiftOrdersDone+=1; user.xp+=rand(15,40);
  renderTop(); renderLeaders();

  // Lock the weigh panel until a new order is assigned
  setWeighControlsEnabled(false);
  $("#btnFinishOrder")?.classList.add("hidden");
  $("#weighSummary").textContent += "\n\n✅ Finished. Start a new order to continue.";
  $("#miniSummary").textContent = "Finished. Use Quick start or toggle Active to get a new order.";

  // Clear current order so weighing cannot proceed until new order
  currentOrder=null; picked=[]; skipped=[]; routeOrder=[]; routeIndex=0;
  checklist=[]; renderChecklist();

  // Take user back to Dashboard (they can Quick start from stage)
  goView("#view-dashboard");
}

/* ===================== Leaders & Wallet ===================== */
function renderLeaders(){
  const el=$("#leaders"); if(!el) return;
  el.innerHTML="";
  const base=Array.from({length:6}).map(()=>({
    name:choice(["Noa","Erez","Maya","Yosef","Tamar","Walaa","David","Reem","Sahar","Nir"]),
    score:rand(5,20),
    img:`https://i.pravatar.cc/80?img=${rand(1,70)}`
  }));
  const me={name:user.name+" (you)",score:user.shiftOrdersDone,img:"https://i.pravatar.cc/80?img=12"};
  const data=[...base,me].sort((a,b)=>b.score-a.score);
  data.forEach((p,idx)=>{
    const d=document.createElement("div"); d.className="leader";
    d.innerHTML=`<div class="left"><img src="${p.img}" alt="">
      <div><b>#${idx+1} ${p.name}</b><br><small class="muted">Orders this shift</small></div>
      </div><div class="score">${p.score}</div>`;
    el.appendChild(d);
  });
}
function renderWallet(){
  const w=$("#walletList"); if(!w) return; w.innerHTML="";
  const tx=Array.from({length:6}).map(_=>({
    t:choice(["Speed bonus","Order","Penalty","Streak bonus","Quality bonus"]),
    v:(Math.random()<0.8?+1:-1)*rand(10,60)
  }));
  let bal=3200+tx.reduce((s,x)=>s+x.v,0);
  tx.forEach(x=>{
    const li=document.createElement("li");
    li.innerHTML=`<span>${x.t}</span><b style="color:${x.v>=0?"#22c55e":"#ef4444"}">${x.v>=0?"+":""}${x.v} ₪</b>`;
    w.appendChild(li);
  });
  const r=$("#rateList"); r.innerHTML="";
  ["Hourly: ₪45","Per order: ₪3","Record: ₪5","Daily streak: ₪8"].forEach(x=>{
    const li=document.createElement("li"); li.innerHTML=`<span>${x}</span><span></span>`; r.appendChild(li);
  });
  const liF=document.createElement("li"); liF.className="muted-row";
  liF.innerHTML=`<span>Shift competition bonus (future)</span><span>—</span>`;
  r.appendChild(liF);
  const li=document.createElement("li"); li.innerHTML=`<span><b>Estimated balance</b></span><b>${bal} ₪</b>`;
  r.appendChild(li);
}

/* ===================== Stage CTA & interactions ===================== */
$("#btnQuickStart").onclick=()=>{
  if(!pickerIsActive){ toast("Inactive: toggle Active on Dashboard","warn"); goView("#view-dashboard"); return; }
  autoAssignOrder();
};
document.addEventListener("click", (e)=>{
  const g = e.target.closest(`#${MAP_ID} .shelf-node`);
  if(!g) return;
  $$('#'+MAP_ID+' .shelf-node').forEach(n=>n.classList.remove('active'));
  g.classList.add('active');
});

/* Start weigh button in Pick view */
$("#btnStartWeighAlt")?.addEventListener("click", ()=>{
  if(!pickerIsActive){ toast("Inactive – cannot start weigh","warn"); return; }
  if(!currentOrder){ toast("No order assigned yet","warn"); return; }
  goView("#view-weigh");
  startWeighFlow();
});

/* ===================== Dashboard toggle ===================== */
$("#pickerActive")?.addEventListener("change",(e)=>{
  pickerIsActive = e.target.checked;
  renderTop();
  if(pickerIsActive){ autoAssignOrder(); } else { renderPickLock(); }
});
function renderPickLock(){
  $("#pickOrderId").textContent="—";
  $("#startShelf").textContent="—";
  $("#pickItems").innerHTML="";
  $("#routeList").innerHTML="";
  $("#routeDebug").textContent="";
  const lock = $("#pickLockMessage");
  if(lock) lock.textContent = "Inactive: no orders will be assigned.";
}

/* ===================== Views nav ===================== */
function goView(sel){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $(sel).classList.add("active");
  $$(".stab").forEach(b=>b.classList.remove("active"));
  document.querySelector(`.stab[data-target="${sel}"]`)?.classList.add("active");
}
$$(".stab").forEach(b=>b.addEventListener("click",()=>goView(b.dataset.target)));

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
      startWeighFlow(); e.preventDefault();
    }
    return;
  }
  if(key.toLowerCase()==="w"){
    if($("#view-weigh").classList.contains("active")){
      finishOrder(); e.preventDefault();
    }
    return;
  }
});

/* ===================== Toast & Confetti ===================== */
function toast(msg,type="info"){
  const t=document.createElement("div");
  t.style.position="fixed"; t.style.bottom="20px"; t.style.left="50%"; t.style.transform="translateX(-50%)";
  t.style.background="rgba(0,0,0,.6)"; t.style.border="1px solid var(--border)"; t.style.padding="10px 14px";
  t.style.color="#fff"; t.style.borderRadius="12px"; t.style.zIndex=99999; t.style.backdropFilter="blur(4px)";
  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),1600);
}
function celebrate(){
  const c=$("#confetti");
  for(let i=0;i<90;i++){
    const s=document.createElement("div"); s.className="confetti";
    s.style.left=rand(0,100)+"vw"; s.style.top="-20px";
    s.style.background=`hsl(${rand(0,360)} 90% 60%)`; s.style.animationDelay=(Math.random()*0.5)+"s";
    s.style.transform=`translateY(${rand(-100,0)}px)`; c.appendChild(s);
    setTimeout(()=>s.remove(),2200);
  }
}

/* ===================== Init ===================== */
function init(){
  renderTop();
  buildStageMap();
  renderDashboardViews();
  renderLeaders();
  renderWallet();
  goView("#view-dashboard");

  if(pickerIsActive){ autoAssignOrder(); }

  if (window.matchMedia("(max-width: 960px)").matches) {
    document.body.classList.remove("sidebar-open");
  }
}
document.addEventListener("DOMContentLoaded", init);
