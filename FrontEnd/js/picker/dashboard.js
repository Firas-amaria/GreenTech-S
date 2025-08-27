/* ===== HUD + Dashboard rendering ===== */
import { $, rand } from "./helpers.js";
import { user, SECTORS, RINGS, congestion } from "./state.js";

export function renderTop(pickerIsActive){
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

export function renderDashboardViews(){
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
    const id=`${s}${r}`; const load=congestion[id];
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

export function renderLeaders(){
  const el=$("#leaders"); if(!el) return;
  el.innerHTML="";
  const base=Array.from({length:6}).map(()=>({
    name:["Noa","Erez","Maya","Yosef","Tamar","Walaa","David","Reem","Sahar","Nir"][rand(0,9)],
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

export function renderWallet(){
  const w=$("#walletList"); if(!w) return; w.innerHTML="";
  const tx=Array.from({length:6}).map(_=>({
    t:["Speed bonus","Order","Penalty","Streak bonus","Quality bonus"][rand(0,4)],
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
