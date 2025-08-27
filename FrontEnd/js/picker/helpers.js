/* ===== Helpers & Effects ===== */
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => document.querySelectorAll(s);
export const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
export const choice = (a)=>a[rand(0,a.length-1)];
export const shuffle = (a)=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
export const isTyping = (el) => {
  const t = el?.tagName?.toLowerCase();
  return t === "input" || t === "textarea" || t === "select" || el?.isContentEditable;
};

export function toast(msg){
  const t=document.createElement("div");
  t.style.position="fixed"; t.style.bottom="20px"; t.style.left="50%"; t.style.transform="translateX(-50%)";
  t.style.background="rgba(0,0,0,.6)"; t.style.border="1px solid var(--border)"; t.style.padding="10px 14px";
  t.style.color="#fff"; t.style.borderRadius="12px"; t.style.zIndex=99999; t.style.backdropFilter="blur(4px)";
  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),1600);
}
export function celebrate(){
  for(let i=0;i<90;i++){
    const s=document.createElement("div"); s.className="confetti";
    s.style.left=rand(0,100)+"vw"; s.style.top="-20px";
    s.style.background=`hsl(${rand(0,360)} 90% 60%)`; s.style.animationDelay=(Math.random()*0.5)+"s";
    s.style.transform=`translateY(${rand(-100,0)}px)`; $("#confetti").appendChild(s);
    setTimeout(()=>s.remove(),2200);
  }
}
