/* ===== Route planning on racetrack+spokes ===== */
import { SECTORS, RINGS, congestion, weights } from "./state.js";

export function sectorIndex(s){return SECTORS.indexOf(s)}
export function parseShelf(id){const m=/^([A-Z])(\d+)$/.exec(id);return {s:m[1],r:Number(m[2])}}
export function shelfToPolar(id){
  const{ s,r}=parseShelf(id);
  const a=sectorIndex(s)/SECTORS.length;
  const rad=Math.min(Math.max(r,1),RINGS.length)/RINGS.length;
  return {a, rad, s};
}
export function angDist(a,b){const d=Math.abs(a-b);return Math.min(d,1-d)}
export function moveDir(fs,ts){
  const fi=sectorIndex(fs),ti=sectorIndex(ts),n=SECTORS.length;
  const cw=(ti-fi+n)%n, ccw=(fi-ti+n)%n;
  if(cw===0&&ccw===0)return 0;
  return (cw<=ccw)?+1:-1;
}
export function travelCost(from,to,last=0){
  const A=shelfToPolar(from),B=shelfToPolar(to);
  const base=weights.W_ANGLE*angDist(A.a,B.a)+weights.W_RADIUS*Math.abs(A.rad-B.rad);
  const cong=(congestion[to]||0)*0.5;
  const dir=moveDir(A.s,B.s);
  const turn=(last!==0&&dir!==0&&dir!==last)?weights.TURN_PENALTY:0;
  return {cost:base+cong+turn,dir};
}
export function planRoute(start,targets){
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
