// routesCalculations.js
// All routing + packing calculations AND Google Maps helpers for THIS page.
// Now ensures departureTime is always in the FUTURE (bumps to next day if needed).

////////////////////  CONSTANTS  ////////////////////
export const SHIFT_DEPART_HHMM = "05:15";   // depart after 15-min pickup at LC
export const SHIFT_END_HHMM    = "07:00";   // must finish by 7am
export const WINDOW_MINUTES    = 105;       // total window (05:15 → 07:00)
export const PER_STOP_BUFFER_MIN = 5;       // extra buffer between orders

// Optional: service time model (can be tuned)
const SERVICE_MIN_PER_STOP     = 4;         // unload/confirm baseline
const SERVICE_MIN_PER_PACKAGE  = 1.0;       // per package factor

////////////////////  GOOGLE MAPS (PAGE-SCOPED)  ////////////////////
let map, directionsRenderer, directionsService;
let mapsReady = false;

// Load Google Maps via your backend endpoint and set global callback
export async function initMapsLoader({ API_BASE }) {
  try {
    const res = await fetch(`${API_BASE}/api/maps/google-maps-script`);
    const data = await res.json();

    // Callback defined BEFORE adding script
    window.initMapsGlobal = function () {
      initRouteMap();
    };

    const s = document.createElement("script");
    // async + defer and Google’s loading hint to silence warnings
    s.src = data.scriptUrl + "&language=en&v=weekly&loading=async&callback=initMapsGlobal";
    s.defer = true;
    s.async = true;
    document.head.appendChild(s);
  } catch (err) {
    console.error("Failed to load Google Maps script", err);
  }
}

function initRouteMap() {
  const el = document.getElementById("route-map");
  if (!el) {
    console.warn("initRouteMap: #route-map not found. Ensure modal is injected before init.");
    return;
  }
  if (mapsReady && map) return;

  map = new google.maps.Map(el, { center: { lat: 32.7335, lng: 35.2188 }, zoom: 11 });
  directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: false });
  directionsService  = new google.maps.DirectionsService();
  directionsRenderer.setMap(map);

  mapsReady = true;
  setTimeout(() => google.maps.event.trigger(map, "resize"), 200);

  // ESC closes modal
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRouteMap(); });
}

// Open the map modal and render a route (single or multi-stop)
export function openRouteMap({
  origin,
  destination,
  destinationAddress,
  waypoints = [],
  optimizeWaypoints = true,
  drivingOptions,
  onResult
}) {
  showModal();

  if (!mapsReady) {
    setInfo("❌ Google Maps not ready.");
    onResult && onResult({ error: "Google Maps not ready." });
    return;
  }

  const req = buildDirectionsRequest({
    origin,
    destination,
    destinationAddress,
    waypoints,
    optimizeWaypoints,
    drivingOptions,
  });
  if (!req) {
    setInfo("❌ Invalid route request.");
    onResult && onResult({ error: "Invalid route request." });
    return;
  }

  setInfo("⏳ Calculating route…");

  directionsService.route(req, (result, status) => {
    if (status === "OK" && result?.routes?.[0]) {
      drawRoute(result);
      const totals = summarizeRoute(result);
      setInfo(`🚗 Duration: <strong>${totals.durationText}</strong> (${totals.distanceText}) · Stops: <strong>${totals.stops}</strong>`);
      onResult && onResult({ directions: result, ...totals, closed: false });
    } else {
      console.error("Directions failed:", status);
      setInfo("❌ Could not calculate route.");
      onResult && onResult({ error: "Route calculation failed." });
    }
  });
}

export function closeRouteMap() {
  const modal = document.getElementById("route-modal");
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
  if (directionsRenderer) directionsRenderer.set("directions", null);
  setInfo("");
}

// ---- internals (maps) ----
function showModal() {
  const modal = document.getElementById("route-modal");
  if (!modal) {
    console.error("#route-modal not found. Inject modal first.");
    return;
  }
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");

  // Any element with data-close-modal closes
  const clickClose = (e) => { if (e.target?.hasAttribute?.("data-close-modal")) closeRouteMap(); };
  modal.removeEventListener("click", clickClose);
  modal.addEventListener("click", clickClose);
}

function setInfo(html) {
  const info = document.getElementById("route-info");
  if (info) info.innerHTML = html || "";
}

function sanitizeDrivingOptions(drivingOptions) {
  if (!drivingOptions) return null;
  const out = { ...drivingOptions };
  // trafficModel valid only with future/current departureTime
  if (!out.departureTime) {
    delete out.trafficModel;
  } else {
    // If the date ended up in the past, bump to future (safety guard)
    if (new Date(out.departureTime).getTime() < Date.now()) {
      out.departureTime = addDays(new Date(), 1);
    }
    if (typeof out.trafficModel === "string" && window.google?.maps?.TrafficModel) {
      const t = out.trafficModel.toUpperCase();
      if (google.maps.TrafficModel[t]) out.trafficModel = google.maps.TrafficModel[t];
      else delete out.trafficModel;
    }
  }
  return out;
}

function buildDirectionsRequest({ origin, destination, destinationAddress, waypoints, optimizeWaypoints, drivingOptions }) {
  if (!origin) return null;

  const normWps = (Array.isArray(waypoints) ? waypoints : []).map(w => {
    if (!w) return null;
    if (typeof w === "string") return { location: w, stopover: true };
    if (typeof w === "object" && Number.isFinite(w.lat) && Number.isFinite(w.lng)) {
      return { location: { lat: w.lat, lng: w.lng }, stopover: true };
    }
    return null;
  }).filter(Boolean);

  const drv = sanitizeDrivingOptions(drivingOptions);

  if (normWps.length) {
    const dest = destination || destinationAddress || normWps[normWps.length - 1].location || origin;
    return {
      origin,
      destination: dest,
      waypoints: normWps.slice(0, -1),
      optimizeWaypoints: !!optimizeWaypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: drv || undefined,
    };
  }

  const dest = destination || destinationAddress;
  if (!dest) return null;

  return { origin, destination: dest, travelMode: google.maps.TravelMode.DRIVING, drivingOptions: drv || undefined };
}

function drawRoute(result) {
  const mapEl = document.getElementById("route-map");
  if (mapEl) mapEl.style.display = "block";
  directionsRenderer.setDirections(result);
  const bounds = result.routes[0]?.bounds;
  if (bounds) map.fitBounds(bounds);
  requestAnimationFrame(() => {
    google.maps.event.trigger(map, "resize");
    if (bounds) map.fitBounds(bounds);
  });
}

function summarizeRoute(result) {
  const route = result.routes[0];
  const legs = route.legs || [];
  let totalSec = 0, totalMeters = 0;
  legs.forEach(l => {
    totalSec += (l.duration_in_traffic?.value || l.duration?.value || 0);
    totalMeters += (l.distance?.value || 0);
  });
  const durationMin  = totalSec / 60;
  const distanceKm   = totalMeters / 1000;
  const durationText = minsToText(durationMin);
  const distanceText = `${distanceKm.toFixed(1)} km`;
  return {
    durationMin, distanceKm, durationText, distanceText,
    stops: legs.length,
    waypointOrder: route.waypoint_order || [],
  };
}

////////////////////  PACKING (your logic)  ////////////////////
function buildBox({ key, l, w, h, maxWeightKg, headroomPct = 0.15 }) {
  const liters = (l * w * h) / 1000;
  return { key, innerDimsCm:{ l,w,h }, headroomPct, usableLiters: liters * (1 - headroomPct), maxWeightKg };
}
const BOXES = [
  buildBox({ key: "Small",  l: 20, w: 20, h: 20, maxWeightKg: 6 }),
  buildBox({ key: "Medium", l: 30, w: 30, h: 30, maxWeightKg: 12 }),
  buildBox({ key: "Large",  l: 60, w: 60, h: 60, maxWeightKg: 25 }),
];

function litersFor(ITEM_PACK, itemId, kg) {
  const meta = ITEM_PACK[itemId];
  if (!meta?.bulkDensityKgPerL) throw new Error(`Missing packing meta for ${itemId}`);
  return kg / meta.bulkDensityKgPerL;
}
const fragRank = f => (f === "fragile" ? 0 : f === "normal" ? 1 : 2);

function canPlace(ITEM_PACK, boxType, boxContents, addLine) {
  const meta = ITEM_PACK[addLine.itemId] || {};
  const totalKg = boxContents.reduce((s,c)=>s+c.kg,0) + addLine.kg;
  const totalL  = boxContents.reduce((s,c)=>s+c.liters,0) + addLine.liters;
  if (totalKg > boxType.maxWeightKg) return false;
  if (totalL  > boxType.usableLiters) return false;
  const kgOfThisItem = boxContents.filter(c => c.itemId === addLine.itemId)
                                  .reduce((s,c)=>s+c.kg,0) + addLine.kg;
  if (meta.maxWeightPerBoxKg && kgOfThisItem > meta.maxWeightPerBoxKg) return false;
  if (meta.minBoxType) {
    const order = ["Small","Medium","Large"];
    if (order.indexOf(boxType.key) < order.indexOf(meta.minBoxType)) return false;
  }
  if (meta.allowMixing === false) {
    if (boxContents.length && boxContents.some(c => c.itemId !== addLine.itemId)) return false;
  }
  return true;
}

function packOrder(order, ITEM_PACK) {
  const pieces = (order.items || []).map(it => {
    const kg = Number(it.quantity || 0);
    const liters = litersFor(ITEM_PACK, it.itemId, kg);
    const meta = ITEM_PACK[it.itemId] || {};
    return { itemId: it.itemId, kg, liters, fragility: meta.fragility || "normal" };
  }).sort((a,b) => {
    const f = fragRank(a.fragility) - fragRank(b.fragility);
    if (f !== 0) return f;
    return b.liters - a.liters;
  });

  const boxes = [];
  for (const p of pieces) {
    let placed = false;
    for (const box of boxes) {
      if (canPlace(ITEM_PACK, box.type, box.contents, p)) { box.contents.push(p); placed = true; break; }
    }
    if (placed) continue;
    for (const bt of BOXES) {
      if (canPlace(ITEM_PACK, bt, [], p)) { boxes.push({ type: bt, contents: [p] }); placed = true; break; }
    }
    if (!placed) throw new Error(`Cannot place ${p.itemId} with current rules/boxes`);
  }

  return boxes.map((b, i) => ({
    boxNo: i + 1,
    boxType: b.type.key,
    estFillLiters: +b.contents.reduce((s,c)=>s+c.liters,0).toFixed(2),
    estWeightKg:   +b.contents.reduce((s,c)=>s+c.kg,0).toFixed(2),
    contents: b.contents.map(c => ({ itemId: c.itemId, kg: c.kg }))
  }));
}

export function computePackingForOrder(orderData, ITEM_PACK) {
  try {
    const boxes = packOrder({
      items: (orderData.items || []).map(i => ({ itemId: i.itemId, quantity: i.quantity }))
    }, ITEM_PACK);
    return { summary: formatBoxSummary(boxes), boxes };
  } catch {
    return { summary: "—", boxes: [] };
  }
}

function formatBoxSummary(boxes) {
  const counts = boxes.reduce((acc, b) => {
    const key = b.boxType || b.type?.key || b.key;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const order = ["Small", "Medium", "Large"];
  const parts = order.filter(k => counts[k]).map(k => `${counts[k]}×${k}`);
  return parts.join(" + ") || "—";
}

////////////////////  NORMALIZATION  ////////////////////
export function normalizeOrders(ordersRaw, ITEM_PACK, PACKAGE_MAX_KG) {
  return (ordersRaw || []).map(o => {
    const data = o.data || o;
    const addrObj = data.deliveryAddress || o.deliveryAddress || { address: data.address || o.address, lat: data.lat ?? data.alt, lng: data.lng };
    const address = addrObj?.address || "";

    const lat = Number(addrObj?.lat ?? addrObj?.alt);
    const lng = Number(addrObj?.lng);

    // package counts via packing
    let pkgCounts = { Small:0, Medium:0, Large:0 };
    const pack = computePackingForOrder(data, ITEM_PACK);
    pkgCounts = countPackagesFromBoxes(pack.boxes);

    // weight
    let weightKg = Number(data.totalOrderWeightKg || 0);
    if (!weightKg && Array.isArray(data.items)) {
      weightKg = data.items.reduce((s, it) => s + Number(it.quantity || 0), 0);
    }
    if (!weightKg) weightKg = estimateWeightFromPackages(pkgCounts, PACKAGE_MAX_KG);

    return {
      id: o.id,
      address,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      pkgCounts,
      weightKg: Number(weightKg.toFixed(1)),
    };
  });
}

function countPackagesFromBoxes(boxes = []) {
  const out = { Small:0, Medium:0, Large:0 };
  boxes.forEach(b => {
    const t = b.boxType || b.type?.key || b.key;
    if (t && out.hasOwnProperty(t)) out[t]++;
  });
  return out;
}

function estimateWeightFromPackages(pk, PACKAGE_MAX_KG) {
  const est =
    (pk.Small  * PACKAGE_MAX_KG.Small  * 0.8) +
    (pk.Medium * PACKAGE_MAX_KG.Medium * 0.8) +
    (pk.Large  * PACKAGE_MAX_KG.Large  * 0.8);
  return Number(est.toFixed(1));
}

////////////////////  “FUTURE” DEPARTURE HELPERS  ////////////////////
// If the intended departure is in the past, bump to NEXT DAY at the same time.
export function getEffectiveDepartureInfo(dateStr, hhmm = SHIFT_DEPART_HHMM) {
  const dep = new Date(`${dateStr}T${hhmm}:00`);
  let departDate = dep;
  let bumped = false;
  if (!Number.isNaN(dep.getTime()) && dep.getTime() < Date.now()) {
    departDate = addDays(dep, 1);
    bumped = true;
  }
  return {
    departDate,
    usedDateStr: ymd(departDate),
    bumped,
  };
}

export function buildDrivingOptions(dateStr, hhmm = SHIFT_DEPART_HHMM) {
  try {
    const { departDate } = getEffectiveDepartureInfo(dateStr, hhmm);
    if (window.google?.maps?.TrafficModel) {
      return { departureTime: departDate, trafficModel: google.maps.TrafficModel.BEST_GUESS };
    }
    return { departureTime: departDate };
  } catch {
    return undefined;
  }
}

////////////////////  DIRECTIONS + PLANNING  ////////////////////
export async function buildRoutePlans({ dateStr, origin, orders, deliverers }) {
  if (!orders?.length) return [];

  // Step 1: Optimize whole set once (with FUTURE departure)
  const dirAll = await getDirections({ origin, orders, dateStr, optimizeWaypoints: true });
  if (!dirAll) return [];

  const order = dirAll.routes[0];
  const legs = order.legs || [];
  const waypointOrder = order.waypoint_order || orders.map((_, i) => i);
  const optimized = waypointOrder.map(i => orders[i]);

  // Step 2: Fit how many stops within the morning window
  const fitN = computeFitCountByTime(legs, optimized);

  // Create initial chunks: [0..fitN-1], [fitN..end]
  const chunks = [];
  if (fitN > 0) chunks.push(optimized.slice(0, fitN));
  if (fitN < optimized.length) chunks.push(optimized.slice(fitN));

  // Step 3: capacity split (ensure a deliverer fits each chunk)
  const plans = [];
  for (let idx = 0; idx < chunks.length; idx++) {
    let block = chunks[idx];

    while (block.length) {
      const totals = sumTotals(block);
      const fits = sortDeliverersByFit(deliverers, totals);
      if (fits.length) {
        const plan = await buildSingleRoutePlan({ dateStr, origin, block, deliverers, suggestedDeliverer: fits[0] });
        plans.push(plan);
        break;
      } else {
        // move last stop to next chunk
        const overflow = block.pop();
        if (!chunks[idx + 1]) chunks[idx + 1] = [];
        chunks[idx + 1].unshift(overflow);
      }
    }
  }

  // Step 4: any leftover chunks
  for (let i = plans.length; i < chunks.length; i++) {
    if (!chunks[i]?.length) continue;
    const plan = await buildSingleRoutePlan({ dateStr, origin, block: chunks[i], deliverers });
    plans.push(plan);
  }

  // Labels: Route A, B, C...
  plans.forEach((p, i) => p.label = `Route ${String.fromCharCode(65 + i)}`);

  return plans;
}

// ---- internals (planning) ----
function wpFromOrders(orders) {
  return orders.map(o => {
    if (Number.isFinite(o.lat) && Number.isFinite(o.lng)) {
      return { location: { lat: o.lat, lng: o.lng }, stopover: true };
    }
    return { location: o.address, stopover: true };
  });
}

function getDirections({ origin, orders, dateStr, optimizeWaypoints }) {
  return new Promise(resolve => {
    const waypoints = wpFromOrders(orders);
    const req = {
      origin,
      destination: waypoints[waypoints.length - 1]?.location || origin,
      waypoints: waypoints.slice(0, -1),
      optimizeWaypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: buildDrivingOptions(dateStr),
    };
    if (req.drivingOptions && !req.drivingOptions.departureTime) delete req.drivingOptions;

    const svc = new google.maps.DirectionsService();
    svc.route(req, (res, status) => resolve(status === "OK" ? res : null));
  });
}

function computeFitCountByTime(legs, ordersOptimized) {
  let cumMin = 0, fit = 0;
  for (let i = 0; i < legs.length; i++) {
    const legSec = (legs[i].duration_in_traffic?.value || legs[i].duration?.value || 0);
    const legMin = legSec / 60;
    const pk = ordersOptimized[i]?.pkgCounts ?? { Small:0, Medium:0, Large:0 };
    const perStop = SERVICE_MIN_PER_STOP + (pk.Small + pk.Medium + pk.Large) * SERVICE_MIN_PER_PACKAGE + PER_STOP_BUFFER_MIN;
    cumMin += legMin + perStop;
    if (cumMin <= WINDOW_MINUTES) fit++;
    else break;
  }
  return fit;
}

async function buildSingleRoutePlan({ dateStr, origin, block, deliverers, suggestedDeliverer }) {
  const dir = await getDirections({ origin, orders: block, dateStr, optimizeWaypoints: true });
  if (!dir) return staticPlanFromBlock({ dateStr, origin, block, deliverers, suggestedDeliverer });

  const route  = dir.routes[0];
  const legs   = route.legs || [];
  const orderIdx = route.waypoint_order || block.map((_, i) => i);
  const ordered  = orderIdx.map(i => block[i]);

  const { departDate } = getEffectiveDepartureInfo(dateStr, SHIFT_DEPART_HHMM);
  const { stops, travelMin, serviceMin } = computeETAsForStops(legs, ordered, departDate);

  const totals = sumTotals(ordered);
  const fitDeliverers = sortDeliverersByFit(deliverers, totals);
  const bestDeliverer = (fitDeliverers[0] || suggestedDeliverer || bestCapacityDeliverer(deliverers))?.id || "";

  return {
    label: "",
    directions: dir,
    origin,
    waypointsOrdered: ordered,
    waypointOrder: orderIdx,
    totals,
    travelMin,
    serviceMin,
    totalMin: travelMin + serviceMin,
    startTime: departDate,
    endTime: addMinutes(departDate, travelMin + serviceMin),
    fitsMorningWindow: (travelMin + serviceMin) <= WINDOW_MINUTES,
    stops,
    delivererOptions: fitDeliverers.map(d => d.id),
    bestDelivererId: bestDeliverer,
  };
}

function staticPlanFromBlock({ dateStr, origin, block, deliverers, suggestedDeliverer }) {
  const { departDate } = getEffectiveDepartureInfo(dateStr, SHIFT_DEPART_HHMM);
  let t = 0;
  const stops = block.map((o, i) => {
    const legTravelMin = 10; // naive
    const pkCount = o.pkgCounts.Small + o.pkgCounts.Medium + o.pkgCounts.Large;
    const stopServiceMin = SERVICE_MIN_PER_STOP + (pkCount * SERVICE_MIN_PER_PACKAGE) + PER_STOP_BUFFER_MIN;
    const eta = addMinutes(departDate, t + legTravelMin);
    t += legTravelMin + stopServiceMin;
    return { index: i + 1, orderId: o.id, address: o.address, eta, etaLabel: timeFmt(eta), legTravelMin, stopServiceMin };
  });

  const totals = sumTotals(block);
  const fitDeliverers = sortDeliverersByFit(deliverers, totals);
  const bestDeliverer = (fitDeliverers[0] || suggestedDeliverer || bestCapacityDeliverer(deliverers))?.id || "";

  const travelMin  = stops.reduce((s,x)=>s+x.legTravelMin,0);
  const serviceMin = stops.reduce((s,x)=>s+x.stopServiceMin,0);

  return {
    label: "",
    directions: null,
    origin,
    waypointsOrdered: block,
    waypointOrder: block.map((_, i) => i),
    totals,
    travelMin,
    serviceMin,
    totalMin: travelMin + serviceMin,
    startTime: departDate,
    endTime: addMinutes(departDate, travelMin + serviceMin),
    fitsMorningWindow: (travelMin + serviceMin) <= WINDOW_MINUTES,
    stops,
    delivererOptions: fitDeliverers.map(d => d.id),
    bestDelivererId: bestDeliverer,
  };
}

function computeETAsForStops(legs, ordered, departTime) {
  let cursor = departTime;
  let travelSecTotal = 0;
  const stops = [];

  for (let i = 0; i < legs.length; i++) {
    const legSec = (legs[i].duration_in_traffic?.value || legs[i].duration?.value || 0);
    travelSecTotal += legSec;
    const legMin = legSec / 60;
    const eta = addMinutes(cursor, legMin);

    const pk = ordered[i]?.pkgCounts || { Small:0, Medium:0, Large:0 };
    const perStop = SERVICE_MIN_PER_STOP + (pk.Small + pk.Medium + pk.Large) * SERVICE_MIN_PER_PACKAGE + PER_STOP_BUFFER_MIN;

    stops.push({
      index: i + 1,
      orderId: ordered[i]?.id,
      address: ordered[i]?.address,
      eta,
      etaLabel: timeFmt(eta),
      legTravelMin: legMin,
      stopServiceMin: perStop,
    });

    cursor = addMinutes(cursor, legMin + perStop);
  }

  return {
    stops,
    travelMin: travelSecTotal / 60,
    serviceMin: stops.reduce((s, x) => s + x.stopServiceMin, 0),
  };
}

////////////////////  CAPACITY + DELIVERERS  ////////////////////
function sumTotals(orders) {
  const t = { Small:0, Medium:0, Large:0, weightKg:0 };
  orders.forEach(o => {
    t.Small  += o.pkgCounts.Small;
    t.Medium += o.pkgCounts.Medium;
    t.Large  += o.pkgCounts.Large;
    t.weightKg += o.weightKg || 0;
  });
  t.weightKg = Number(t.weightKg.toFixed(1));
  return t;
}

function fitsCapacity(deliverer, totals) {
  const cap = deliverer.capacity?.maxPackages || deliverer.maxPackages || { Small:0, Medium:0, Large:0 };
  const okBoxes  = cap.Small >= totals.Small && cap.Medium >= totals.Medium && cap.Large >= totals.Large;
  const okWeight = (deliverer.limitKg || 0) >= totals.weightKg;
  return okBoxes && okWeight;
}

function sortDeliverersByFit(deliverers, totals) {
  return [...deliverers]
    .filter(d => fitsCapacity(d, totals))
    .sort((a, b) => {
      const capA = a.capacity?.maxPackages || { Small:0, Medium:0, Large:0 };
      const capB = b.capacity?.maxPackages || { Small:0, Medium:0, Large:0 };
      const slackA = (capA.Small - totals.Small) + (capA.Medium - totals.Medium) + (capA.Large - totals.Large);
      const slackB = (capB.Small - totals.Small) + (capB.Medium - totals.Medium) + (capB.Large - totals.Large);
      if (slackA !== slackB) return slackA - slackB;
      const costA = a.cost?.fixed ?? 0;
      const costB = b.cost?.fixed ?? 0;
      return costA - costB;
    });
}

function bestCapacityDeliverer(deliverers) {
  return [...deliverers].sort((a, b) => {
    const capA = a.capacity?.maxPackages || { Small:0, Medium:0, Large:0 };
    const capB = b.capacity?.maxPackages || { Small:0, Medium:0, Large:0 };
    const sumA = capA.Small + capA.Medium + capA.Large + (a.limitKg || 0) / 10;
    const sumB = capB.Small + capB.Medium + capB.Large + (b.limitKg || 0) / 10;
    return sumB - sumA;
  })[0];
}

////////////////////  SMALL TIME/DATE HELPERS  ////////////////////
function addMinutes(dt, min) { return new Date(dt.getTime() + min * 60000); }
function addDays(dt, n) { const d=new Date(dt); d.setDate(d.getDate()+n); return d; }
function ymd(dt){ const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,"0"); const d=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; }
function timeFmt(dt) { const hh = String(dt.getHours()).padStart(2,"0"); const mm = String(dt.getMinutes()).padStart(2,"0"); return `${hh}:${mm}`; }
function minsToText(min) { const h = Math.floor(min / 60); const m = Math.round(min % 60); return h <= 0 ? `${m} min` : `${h} hr ${m} min`; }
