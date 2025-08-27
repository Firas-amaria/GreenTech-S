// state.js

/* ---------- Config: aisles (letters) and positions (numbers) ---------- */
export const NUM_SECTORS = 26;      // A..Z
export const NUM_POSITIONS = 10;    // 1..N per aisle

/* ---------- Derived identifiers ---------- */
export const SECTORS = Array.from({ length: NUM_SECTORS }, (_, i) =>
  String.fromCharCode(65 + i) // 65 === 'A'
);
export const RINGS = Array.from({ length: NUM_POSITIONS }, (_, i) => i + 1);

// Flat list like ["A1","A2",...,"Z10"]
export const allShelves = [];
SECTORS.forEach(s => RINGS.forEach(r => allShelves.push(`${s}${r}`)));

/* ---------- Congestion per shelf (0=free .. 3=high) ---------- */
export const congestion = {};
allShelves.forEach(id => { congestion[id] = Math.floor(Math.random() * 4); });

/* ---------- Routing weights ---------- */
export const W_ANGLE = 1.0;
export const W_RADIUS = 0.9;
export const TURN_PENALTY = 0.5;
export const weights = { W_ANGLE, W_RADIUS, TURN_PENALTY };

/* ---------- Tiny utils (local to state.js) ---------- */
const rint = (a,b) => Math.floor(Math.random()*(b-a+1)) + a;
const pick = arr => arr[rint(0, arr.length-1)];
const shuffle = arr => arr.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);

/* ---------- Mock user (for dashboard) ---------- */
export const user = {
  name: pick(["David","Noa","Erez","Sahar","Walaa","Maya","Guy","Tamar","Nir","Reem"]),
  level: rint(2,7),
  xp: rint(200,900),
  xpNext: 1000,
  shiftOrdersDone: rint(4,18),
  badges: [
    { emo:"🕒", text:"Speedster" },
    { emo:"🧭", text:"Zero Zigzag" },
    { emo:"📦", text:"10 Orders Streak" }
  ],
  streak: rint(1,6)
};

/* ---------- Runtime app state (used across modules) ---------- */
export const state = {
  pickerIsActive: true,
  currentOrder: null,
  startShelf: pick(allShelves),

  // weigh flow working vars
  routeOrder: [],
  routeIndex: 0,
  picked: [],
  skipped: [],

  // checklist (rendered by checklist.js)
  checklist: []
};

/* ---------- Order factory used by UI / weigh ---------- */
const PRODUCT_NAMES = ["Cucumber","Tomato","Lettuce","Carrot","Pepper","Apple","Banana","Grapes","Avocado","Orange"];
const FARMERS = ["Farmer A","Farmer B","Farmer C","Farmer D","Farmer E"];

/** Create a mock order with 2–5 items on unique shelves */
export function makeOrder(id = rint(1000, 9999)) {
  const count = rint(2,5);
  const shelves = shuffle(allShelves).slice(0, count);

  const items = shelves.map((shelf, i) => {
    const unit = Math.random() < 0.7 ? "kg" : "unit";
    const qty  = unit === "kg" ? (rint(5,25)/10).toFixed(1) : rint(1,3);
    return {
      sku: `SKU-${id}-${i}`,
      name: pick(PRODUCT_NAMES),
      qty: qty.toString(),
      unit,
      farmer: pick(FARMERS),
      shelf
    };
  });

  return { id: `ORD-${id}`, items };
}
