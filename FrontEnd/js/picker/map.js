// js/picker/map.js
import { SECTORS, RINGS, allShelves } from "./state.js";

export const MAP_ID = "lcMap";

export function buildLogisticMap(){
  const host = document.getElementById("stageMap");
  if (!host) return;
  host.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const W = 900, H = 600;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("id", MAP_ID);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.width = "100%";
  svg.style.height = "100%";
  host.appendChild(svg);

  // ----- defs: arrow marker -----
  const defs = document.createElementNS(svgNS, "defs");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id","arrow");
  marker.setAttribute("viewBox","0 0 10 10");
  marker.setAttribute("refX","7");
  marker.setAttribute("refY","5");
  marker.setAttribute("markerWidth","6");
  marker.setAttribute("markerHeight","6");
  marker.setAttribute("orient","auto-start-reverse");
  const tri = document.createElementNS(svgNS, "path");
  tri.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  tri.setAttribute("fill", "#7fb6ff");
  marker.appendChild(tri);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // ----- zones (top/bottom blocks) -----
  zone(0,0,300,120,"zone ambient","A. Ambient Produce");
  zone(300,0,300,120,"zone chilledFv","B. Chilled Fruits/Veg");
  zone(600,0,300,120,"zone chilledAnimal","C. Chilled Animal Products");
  zone(450,480,200,120,"zone staging","Consolidation / Staging");
  zone(650,480,250,120,"zone frozen","D. Frozen");

  // ----- racetrack outer loop -----
  const LOOP = { x:80, y:120, w:740, h:360, r:60 };
  const track = rect(LOOP.x, LOOP.y, LOOP.w, LOOP.h, "rt-outer");
  track.setAttribute("rx", LOOP.r);
  track.setAttribute("ry", LOOP.r);
  svg.appendChild(track);

  // one-way arrows
  [
    {x1: LOOP.x+70, y1: LOOP.y, x2: LOOP.x+LOOP.w-70, y2: LOOP.y},                    // →
    {x1: LOOP.x+LOOP.w, y1: LOOP.y+70, x2: LOOP.x+LOOP.w, y2: LOOP.y+LOOP.h-70},      // ↓
    {x1: LOOP.x+LOOP.w-70, y1: LOOP.y+LOOP.h, x2: LOOP.x+70, y2: LOOP.y+LOOP.h},      // ←
    {x1: LOOP.x, y1: LOOP.y+LOOP.h-70, x2: LOOP.x, y2: LOOP.y+70},                    // ↑
  ].forEach(a=>{
    const l = line(a.x1,a.y1,a.x2,a.y2,"rt-arrow");
    l.setAttribute("marker-end","url(#arrow)");
    svg.appendChild(l);
  });

  // ----- central aisles (A..Z) -----
  const INNER = { x: LOOP.x+60, y: LOOP.y+30, w: LOOP.w-120, h: LOOP.h-60 };
  const COLS = SECTORS.length;

  // auto-fit aisle width: 26 aisles still visible
  const AISLE_W = Math.max(24, Math.min(60, Math.floor(INNER.w / (COLS * 1.2))));
  const GAP = (INNER.w - COLS*AISLE_W) / (COLS-1 <= 0 ? 1 : (COLS-1));
  const AISLE_H = INNER.h;
  const AISLE_Y = INNER.y;

  // label row above aisles
  const LABEL_Y = AISLE_Y - 12;

  const centers = []; // center x per aisle, index maps to SECTORS[i]
  SECTORS.forEach((letter, i) => {
    const x = INNER.x + i * (AISLE_W + GAP);

    // aisle block
    const a = rect(x, AISLE_Y, AISLE_W, AISLE_H, "aisle");
    svg.appendChild(a);

    // aisle letter label
    const tl = document.createElementNS(svgNS, "text");
    tl.setAttribute("x", x + AISLE_W/2);
    tl.setAttribute("y", LABEL_Y);
    tl.setAttribute("class", "sector-label");
    tl.setAttribute("text-anchor","middle");
    tl.setAttribute("dominant-baseline","ideographic");
    tl.textContent = letter;
    svg.appendChild(tl);

    centers.push(x + AISLE_W/2);
  });

  // ----- numbered nodes down each aisle -----
  const STEP_Y = AISLE_H / (RINGS.length + 1);
  allShelves.forEach(id => {
    const m = /^([A-Z])(\d+)$/.exec(id);
    if (!m) return;
    const s = m[1];
    const r = Number(m[2]);

    const col = SECTORS.indexOf(s);
    if (col < 0) return;

    const cx = centers[col];
    const cy = AISLE_Y + r * STEP_Y;

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "shelf-node");
    g.setAttribute("data-shelf", id);

    const d = document.createElementNS(svgNS, "rect");
    d.setAttribute("x", cx - 10);
    d.setAttribute("y", cy - 10);
    d.setAttribute("rx", 4);
    d.setAttribute("ry", 4);
    d.setAttribute("width", 20);
    d.setAttribute("height", 20);
    d.setAttribute("class", "shelf-dot");
    g.appendChild(d);

    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", cx);
    t.setAttribute("y", cy + 4);
    t.setAttribute("class", "shelf-text");
    t.setAttribute("text-anchor","middle");
    t.setAttribute("dominant-baseline","middle");
    t.textContent = id; // e.g., A1, B7, Z10
    g.appendChild(t);

    svg.appendChild(g);
  });

  /* helpers */
  function rect(x,y,w,h,cls){ const r=document.createElementNS(svgNS,"rect"); r.setAttribute("x",x); r.setAttribute("y",y); r.setAttribute("width",w); r.setAttribute("height",h); r.setAttribute("class",cls); return r; }
  function line(x1,y1,x2,y2,cls){ const l=document.createElementNS(svgNS,"line"); l.setAttribute("x1",x1); l.setAttribute("y1",y1); l.setAttribute("x2",x2); l.setAttribute("y2",y2); l.setAttribute("class",cls); return l; }
  function zone(x,y,w,h,cls,label){
    const r = rect(x,y,w,h,cls); svg.appendChild(r);
    const t=document.createElementNS(svgNS,"text");
    t.setAttribute("x", x + w/2); t.setAttribute("y", y + h/2);
    t.setAttribute("class","zone-label"); t.setAttribute("text-anchor","middle"); t.setAttribute("dominant-baseline","middle");
    t.textContent = label; svg.appendChild(t);
  }
}
