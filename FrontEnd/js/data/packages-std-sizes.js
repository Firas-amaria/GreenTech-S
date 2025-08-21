// Canonical package sizes & helpers derived from your defs.
// Use these everywhere so capacities stay consistent.

export const PACKAGE_DEFS = [
  { id: "Small",  innerDimsCm: { l:20, w:20, h:20 }, headroomPct:0.15, maxWeightKg:6,  mixingAllowed:true, maxSkusPerBox:2, vented:false, tareWeightKg:0.25 },
  { id: "Medium", innerDimsCm: { l:30, w:30, h:30 }, headroomPct:0.15, maxWeightKg:12, mixingAllowed:true, maxSkusPerBox:2, vented:false, tareWeightKg:0.35 },
  { id: "Large",  innerDimsCm: { l:60, w:60, h:60 }, headroomPct:0.15, maxWeightKg:25, mixingAllowed:true, maxSkusPerBox:3, vented:false, tareWeightKg:0.70 },
];

// Uniform accessors (width/height/length for fit calcs)
export const STANDARD_PACKAGE_DIMS_CM = {
  Small:  { width: 20, height: 20, length: 20 },
  Medium: { width: 30, height: 30, length: 30 },
  Large:  { width: 60, height: 60, length: 60 },
};

export const PACKAGE_MAX_KG = {
  Small:  6,
  Medium: 12,
  Large:  25,
};

export function computeUsableLiters({ l, w, h }, headroomPct = 0.15) {
  const liters = (l * w * h) / 1000;
  return Number((liters * (1 - headroomPct)).toFixed(2));
}

export const PACKAGE_USABLE_LITERS = {
  Small:  computeUsableLiters(PACKAGE_DEFS[0].innerDimsCm, PACKAGE_DEFS[0].headroomPct),
  Medium: computeUsableLiters(PACKAGE_DEFS[1].innerDimsCm, PACKAGE_DEFS[1].headroomPct),
  Large:  computeUsableLiters(PACKAGE_DEFS[2].innerDimsCm, PACKAGE_DEFS[2].headroomPct),
};
