/* ===================== Helpers ===================== */
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const choice=a=>a[rand(0,a.length-1)];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
// typing guard: ignore global shortcuts when user is editing a field
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

/* ===================== Orders ===================== */
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
let QUEUE_SIZE=8;
let ORDER_QUEUE=Array.from({length:QUEUE_SIZE},(_,i)=>makeOrder(1000+i));
let currentOrder=ORDER_QUEUE[0];
let startShelf=choice(allShelves);

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
}

/* ===================== Circular Map (SVG) ===================== */
const CMAP_SIZE = 520;
const CMAP_CX = CMAP_SIZE/2;
const CMAP_CY = CMAP_SIZE/2;
const CMAP_INNER = 70;
const CMAP_STEP  = 70;

function shelfXY(id){
  const m = /^([A-Z])(\d+)$/.exec(id);
  const sector = m[1], ring = Number(m[2]);
  const sectorIdx = SECTORS.indexOf(sector);
  const angle = (2*Math.PI * sectorIdx) / SECTORS.length;
  const radius = CMAP_INNER + (ring-1)*CMAP_STEP;
  return { x: CMAP_CX + radius * Math.cos(angle),
           y: CMAP_CY + radius * Math.sin(angle) };
}

function buildStageMap(){
  const host = document.getElementById("stageMap");
  if(!host){ console.warn("stageMap not found"); return; }
  host.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("id", "circleMap");
  svg.setAttribute("viewBox", `0 0 ${CMAP_SIZE} ${CMAP_SIZE}`);
  svg.style.width = "100%";
  svg.style.height = "100%";
  host.appendChild(svg);

  // rings
  RINGS.forEach((_, idx) => {
    const circ = document.createElementNS(svgNS, "circle");
    circ.setAttribute("cx", CMAP_CX);
    circ.setAttribute("cy", CMAP_CY);
    circ.setAttribute("r", CMAP_INNER + idx*CMAP_STEP);
    circ.setAttribute("class", "ring");
    svg.appendChild(circ);
  });

  // spokes + labels
  SECTORS.forEach((s, si) => {
    const ang = (2*Math.PI * si)/SECTORS.length;
    const outer = CMAP_INNER + (RINGS.length-1)*CMAP_STEP + 24;

    const x2 = CMAP_CX + outer * Math.cos(ang);
    const y2 = CMAP_CY + outer * Math.sin(ang);

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", CMAP_CX);
    line.setAttribute("y1", CMAP_CY);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", "spoke");
    svg.appendChild(line);

    const labelR = CMAP_INNER + RINGS.length*CMAP_STEP + 18;
    const lx = CMAP_CX + labelR * Math.cos(ang);
    const ly = CMAP_CY + labelR * Math.sin(ang);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", lx);
    label.setAttribute("y", ly);
    label.setAttribute("class", "sector-label");
    label.setAttribute("text-anchor","middle");
    label.setAttribute("dominant-baseline","middle");
    label.textContent = s;
    svg.appendChild(label);
  });

  // shelves
  allShelves.forEach(id=>{
    const {x,y} = shelfXY(id);

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "shelf-node");
    g.setAttribute("data-shelf", id);

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 12);
    dot.setAttribute("class", "shelf-dot");
    g.appendChild(dot);

    const txt = document.createElementNS(svgNS, "text");
    txt.setAttribute("x", x);
    txt.setAttribute("y", y+4);
    txt.setAttribute("class", "shelf-text");
    txt.setAttribute("text-anchor","middle");
    txt.setAttribute("dominant-baseline","middle");
    txt.textContent = id;
    g.appendChild(txt);

    svg.appendChild(g);
  });
}

/* ===================== Dashboard / Traffic Monitor ===================== */
function renderDashboardViews(){
  // goals
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

  // rename title (backup)
  const loadCardTitle = document.querySelector('#view-dashboard .between h2');
  if (loadCardTitle) loadCardTitle.textContent = "Traffic Monitor 🚦";

  // show only high traffic as red
  const map=$("#ringMap"); map.innerHTML="";
  const HIGH = 3; // threshold for “high traffic”

  SECTORS.forEach(s=>RINGS.forEach(r=>{
    const id=`${s}${r}`;
    const load=congestion[id]; // 0..3

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

/* ===================== Queue ===================== */
function refillQueue(size){
  ORDER_QUEUE=Array.from({length:size},(_,i)=>makeOrder(1000+i));
  currentOrder=ORDER_QUEUE[0];
  startShelf=choice(allShelves);
}
function renderQueue(){
  const q=$("#orderQueue"); q.innerHTML="";
  ORDER_QUEUE.forEach(o=>{
    const card=document.createElement("div"); card.className="order-card";
    card.innerHTML=`<div class="head">
        <div><b>#${o.id}</b> • ${o.items.length} items</div>
        <div class="row"><button class="btn outline" data-accept="${o.id}">Take</button></div>
      </div>
      <div class="items">
        ${o.items.map(it=>`<span class="it">${it.name} • ${it.qty}${it.unit==="kg"?"kg":"u"} (${it.shelf})</span>`).join("")}
      </div>`;
    q.appendChild(card);
  });
  const sel=$("#orderSelect"); sel.innerHTML="";
  ORDER_QUEUE.forEach(o=>{
    const opt=document.createElement("option");
    opt.value=o.id; opt.textContent=`${o.id} • ${o.items.length} items`;
    sel.appendChild(opt);
  });
  sel.value=currentOrder.id;

  q.querySelectorAll("[data-accept]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.getAttribute("data-accept");
      currentOrder=ORDER_QUEUE.find(x=>x.id===id); startShelf=choice(allShelves);
      $("#orderSelect").value=id; toast(`You took order #${id}`,"ok");
      goView("#view-pick"); renderPick(); focusRouteOnStage();
    });
  });
}
$("#queueCount").addEventListener("input",e=>{
  const n=Number(e.target.value); $("#queueCountVal").textContent=n; QUEUE_SIZE=n; refillQueue(n); renderQueue();
});
$("#btnWorkOnSelected").addEventListener("click",()=>{
  const id=$("#orderSelect").value;
  currentOrder=ORDER_QUEUE.find(o=>o.id===id)||currentOrder;
  startShelf=choice(allShelves);
  toast(`Working on ${id}`,"ok");
  goView("#view-pick"); renderPick(); focusRouteOnStage();
});

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
  const turn=(last!==0&&dir!==0&&dir!==last)?TURN_PENALTY:0;
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
  $("#pickOrderId").textContent=currentOrder.id; $("#startShelf").textContent=startShelf;
  const items=$("#pickItems"); items.innerHTML="";
  currentOrder.items.forEach(it=>{
    const d=document.createElement("div"); d.className='item';
    d.textContent=`${it.name} • ${it.qty}${it.unit==="kg"?" kg":" u"} • ${it.shelf}`;
    items.appendChild(d);
  });

  // Controls may be hidden; attach only if exist
  const angleEl = $("#wAngle"), radiusEl = $("#wRadius"), turnEl = $("#turnPenalty");
  const btnPlan = $("#btnPlan"), btnStartWeigh = $("#btnStartWeigh");

  if (angleEl) angleEl.oninput = e => { W_ANGLE=Number(e.target.value); $("#wAngleVal").textContent=W_ANGLE.toFixed(1); renderRoute(); focusRouteOnStage(); };
  if (radiusEl) radiusEl.oninput = e => { W_RADIUS=Number(e.target.value); $("#wRadiusVal").textContent=W_RADIUS.toFixed(1); renderRoute(); focusRouteOnStage(); };
  if (turnEl) turnEl.oninput = e => { TURN_PENALTY=Number(e.target.value); $("#turnPenaltyVal").textContent=TURN_PENALTY.toFixed(1); renderRoute(); focusRouteOnStage(); };
  if (btnPlan) btnPlan.onclick = ()=>{ renderRoute(); focusRouteOnStage(); };
  if (btnStartWeigh) btnStartWeigh.onclick = ()=>{ goView("#view-weigh"); startWeighFlow(); };

  // extra Start weigh button in Current Order
  const altBtn = $("#btnStartWeighAlt");
  if (altBtn) altBtn.onclick = ()=>{ goView("#view-weigh"); startWeighFlow(); };

  renderRoute(); focusRouteOnStage();
}

function renderRoute(){
  const targets=currentOrder.items.map(i=>i.shelf);
  const {order,debug}=planRoute(startShelf,targets);
  const list=$("#routeList"); list.innerHTML="";
  order.forEach(id=>{
    const li=document.createElement("li");
    li.innerHTML=`Go to <b>${id}</b>`;
    list.appendChild(li);
  });
  $("#routeDebug").textContent=debug.join("\n");

  // highlight route on SVG
  $$('#circleMap .shelf-node').forEach(n=>n.classList.remove('route'));
  order.forEach(id=>{
    const n=document.querySelector(`#circleMap .shelf-node[data-shelf="${id}"]`);
    if(n) n.classList.add('route');
  });
}

function focusRouteOnStage(step=0){
  const route = Array.from($("#routeList").children)
    .map(li=>li.textContent.replace("Go to","").trim());
  $$('#circleMap .shelf-node').forEach(n=>n.classList.remove('active'));
  const first = route[step];
  const node = document.querySelector(`#circleMap .shelf-node[data-shelf="${first}"]`);
  if(node) node.classList.add('active');
}

/* ===================== Weigh flow ===================== */
let routeOrder=[], routeIndex=0, picked=[], skipped=[];
function startWeighFlow(){
  routeOrder=planRoute(startShelf,currentOrder.items.map(i=>i.shelf)).order;
  routeIndex=0; picked=[]; skipped=[];
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary();

  $$('#circleMap .shelf-node').forEach(n=>n.classList.remove('active'));
  const c=document.querySelector(`#circleMap .shelf-node[data-shelf="${routeOrder[0]}"]`);
  if(c) c.classList.add('active');
}
function currentItem(){
  const shelf=routeOrder[routeIndex];
  return currentOrder.items.find(i=>i.shelf===shelf);
}
function renderWeighPanel(){
  const it=currentItem();
  $("#wOrderId").textContent=currentOrder.id;
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
  $("#miniSummary").textContent = `#${currentOrder.id}\nPicked: ${picked.length}/${currentOrder.items.length}`;
}
function withinTol(target,measured,unit){
  if(unit==="kg"){ const tol=0.05*target; return Math.abs(measured-target)<=tol; }
  return Number(measured)===Number(target);
}
function doneAll(){ return picked.length + skipped.length >= currentOrder.items.length; }
function renderWeighSummary(){
  const lines=[]; lines.push(`Order #${currentOrder.id}`); lines.push(`-----------------------`);
  picked.forEach(p=>lines.push(`${p.name} | ${p.measured}${p.unit==="kg"?" kg":" u"} | target ${p.qty}${p.unit==="kg"?" kg":" u"} | ${p.shelf}`));
  const total=picked.filter(p=>p.unit==="kg").reduce((s,p)=>s+Number(p.measured||0),0);
  lines.push(`-----------------------`); lines.push(`Total kg: ${total.toFixed(2)}`);
  lines.push(`Status: ${doneAll()? "Ready for courier (mock)" : "In progress"}`);
  $("#weighSummary").textContent=lines.join("\n");
}
$("#btnMockIoT").onclick=()=>{ const it=currentItem(); if(!it) return;
  $("#wInput").value=it.unit==="kg"? Number(it.qty).toFixed(2): Number(it.qty); };
$("#btnConfirmItem").onclick=()=>{ const it=currentItem(); if(!it) return;
  const measured=Number($("#wInput").value||0), unit=$("#wUnit").value;
  if(!measured){ toast("Enter a measurement","warn"); return; }
  if(!withinTol(Number(it.qty),measured,unit)){ if(!confirm("Outside tolerance (±5% kg / exact units). Approve anyway?")) return; }
  picked.push({...it, measured, unit});
  routeIndex=Math.min(routeIndex+1, routeOrder.length-1);
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary(); celebrate();
  $$('#circleMap .shelf-node').forEach(n=>n.classList.remove('active'));
  const c=document.querySelector(`#circleMap .shelf-node[data-shelf="${routeOrder[routeIndex]}"]`);
  if(c) c.classList.add('active');
};
$("#btnSkipItem").onclick=()=>{ const it=currentItem(); if(!it) return;
  skipped.push(it); routeIndex=Math.min(routeIndex+1, routeOrder.length-1);
  renderWeighPanel(); renderWeighAccum(); renderWeighSummary(); };

/* ===================== Finish & Competition ===================== */
$("#btnFinishOrder").onclick=finishOrder;
function finishOrder(){
  if(!doneAll()){ if(!confirm("Not all items handled. Continue anyway?")) return; }
  window.print();
  toast("Order completed (mock) and sent to courier 🚚","ok");
  celebrate();
  user.shiftOrdersDone+=1; user.xp+=rand(15,40);
  renderTop(); renderLeaders();
}

/* ===================== Leaders & Wallet ===================== */
function renderLeaders(){
  const el=$("#leaders"); el.innerHTML="";
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
  const w=$("#walletList"); w.innerHTML="";
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
$("#btnQuickStart").onclick=()=>{ goView("#view-queue"); toast("Pick an order to start!", "ok"); };

// click to activate shelf
document.addEventListener("click", (e)=>{
  const g = e.target.closest("#circleMap .shelf-node");
  if(!g) return;
  $$('#circleMap .shelf-node').forEach(n=>n.classList.remove('active'));
  g.classList.add('active');
});

/* ===================== Views nav (guarded keyboard) ===================== */
function goView(sel){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $(sel).classList.add("active");
  $$(".stab").forEach(b=>b.classList.remove("active"));
  document.querySelector(`.stab[data-target="${sel}"]`)?.classList.add("active");
}
$$(".stab").forEach(b=>b.addEventListener("click",()=>goView(b.dataset.target)));

document.addEventListener("keydown",(e)=>{
  // ignore global shortcuts while typing in inputs/selects/textarea
  if (isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) return;

  const key=e.key;
  if(/^[1-6]$/.test(key)){
    const index=Number(key)-1; const btn=$$(".stab")[index];
    if(btn){ btn.click(); e.preventDefault(); }
    return;
  }
  if(key==="Enter"){
    if($("#view-pick").classList.contains("active")){
      const startBtn = $("#btnStartWeigh") || $("#btnStartWeighAlt");
      if (startBtn) startBtn.click();
      e.preventDefault();
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
  renderQueue();
  renderLeaders();
  renderWallet();
  goView("#view-dashboard");

  if (window.matchMedia("(max-width: 960px)").matches) {
    document.body.classList.remove("sidebar-open");
  }
}
document.addEventListener("DOMContentLoaded", init);
