// 4 active deliverers with computed capacities for Small/Medium/Large.
// Capacity is limited by BOTH cargo volume fit and driver's weight limit.
// liveLocation uses {address, lng, alt} and is pinned to LC-1 for now.

import { STANDARD_PACKAGE_DIMS_CM, PACKAGE_MAX_KG } from "./packages-std-sizes.js";
import { LC1_LOCATION } from "./logistics-centers.mock.js";

// ----- helpers -----
const permutations3 = ([a,b,c]) => [
  [a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]
];

function maxFitAxisAligned(cargo, box) {
  const C = [cargo.width, cargo.height, cargo.length];
  const B = [box.width, box.height, box.length];
  let best = 0;
  for (const [bw,bh,bl] of permutations3(B)) {
    const fit =
      Math.floor(C[0] / bw) *
      Math.floor(C[1] / bh) *
      Math.floor(C[2] / bl);
    if (fit > best) best = fit;
  }
  return best;
}

function computeSizeCapacitiesByVolume(cargoDims) {
  return {
    Small:  maxFitAxisAligned(cargoDims, STANDARD_PACKAGE_DIMS_CM.Small),
    Medium: maxFitAxisAligned(cargoDims, STANDARD_PACKAGE_DIMS_CM.Medium),
    Large:  maxFitAxisAligned(cargoDims, STANDARD_PACKAGE_DIMS_CM.Large),
  };
}

function capacityLimitedByWeight(limitKg) {
  return {
    Small:  Math.max(0, Math.floor(limitKg / PACKAGE_MAX_KG.Small)),
    Medium: Math.max(0, Math.floor(limitKg / PACKAGE_MAX_KG.Medium)),
    Large:  Math.max(0, Math.floor(limitKg / PACKAGE_MAX_KG.Large)),
  };
}

function minCapacities(a, b) {
  return {
    Small:  Math.min(a.Small,  b.Small),
    Medium: Math.min(a.Medium, b.Medium),
    Large:  Math.min(a.Large,  b.Large),
  };
}

const volumeCm3 = ({width, height, length}) => width * height * length;
const liters = (cm3) => Number((cm3 / 1000).toFixed(2));

function makeDeliverer({
  id, name, phone, email, vehicleType,
  cargoDimensionsCm, limitKg,
  speedKmH = 45,
  maxStops = 24,
  notes = "",
  capabilities = { refrigerated: false, fragileHandling: true, mixSkusAllowed: true },
  serviceWindow = { start: "08:00", end: "20:00" },
  cost = { fixed: 35, perKm: 1.8, perStop: 2.0 }, // mock cost model
}) {
  const volCm3 = volumeCm3(cargoDimensionsCm);
  const byVolume = computeSizeCapacitiesByVolume(cargoDimensionsCm);
  const byWeight = capacityLimitedByWeight(limitKg);
  const maxPackages = minCapacities(byVolume, byWeight);

  return {
    id,
    name,
    contact: { phone, email },
    vehicleType,
    cargoDimensionsCm,
    volumeCm3: volCm3,
    volumeLiters: liters(volCm3),
    limitKg,
    // Raw and effective capacities
    capacity: {
      byVolume, byWeight, maxPackages, // maxPackages = min(volume, weight)
    },
    speedKmH,
    maxStops,
    liveLocation: { ...LC1_LOCATION }, // not live yet, pinned
    capabilities,
    serviceWindow,
    cost,
    notes,
  };
}

// ----- Active deliverers (4) -----
export const activeDeliverers = [
  makeDeliverer({
    id: "DRV-001",
    name: "Yossi Bar-On",
    phone: "+972-52-555-1010",
    email: "yossi.baron@example.com",
    vehicleType: "Hatchback",
    cargoDimensionsCm: { width: 95, height: 45, length: 75 }, // trunk space
    limitKg: 120,
    speedKmH: 50,
    notes: "Fast city drops; best for small/medium.",
    cost: { fixed: 25, perKm: 1.6, perStop: 2.0 },
  }),
  makeDeliverer({
    id: "DRV-002",
    name: "Maya Shalev",
    phone: "+972-52-555-2020",
    email: "maya.shalev@example.com",
    vehicleType: "Small Van",
    cargoDimensionsCm: { width: 145, height: 110, length: 220 },
    limitKg: 600,
    speedKmH: 45,
    notes: "Balanced capacity; handles mixed routes.",
    cost: { fixed: 40, perKm: 1.9, perStop: 1.5 },
  }),
  makeDeliverer({
    id: "DRV-003",
    name: "Omer Levi",
    phone: "+972-52-555-3030",
    email: "omer.levi@example.com",
    vehicleType: "Motorbike (Cargo Box)",
    cargoDimensionsCm: { width: 60, height: 60, length: 60 },
    limitKg: 40,
    speedKmH: 55,
    notes: "Urgent single-package runs in traffic.",
    cost: { fixed: 15, perKm: 1.2, perStop: 1.0 },
  }),
  makeDeliverer({
    id: "DRV-004",
    name: "Rami Cohen",
    phone: "+972-52-555-4040",
    email: "rami.cohen@example.com",
    vehicleType: "Medium Van",
    cargoDimensionsCm: { width: 165, height: 125, length: 280 },
    limitKg: 900,
    speedKmH: 42,
    notes: "Bulk & heavy loads. Good for large packages.",
    cost: { fixed: 55, perKm: 2.1, perStop: 1.4 },
  }),
];

// Optional utilities if package sizes change at runtime:
export function recomputeAllCapacities(drivers = activeDeliverers) {
  drivers.forEach(d => {
    const byVolume = computeSizeCapacitiesByVolume(d.cargoDimensionsCm);
    const byWeight = capacityLimitedByWeight(d.limitKg);
    d.capacity = { byVolume, byWeight, maxPackages: minCapacities(byVolume, byWeight) };
  });
  return drivers;
}
