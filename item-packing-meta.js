// item-packing-meta.js
export const ITEM_PACK = {
  // FRUITS
  "FRT-001": { // Apple Fuji
    name: "Apple Fuji",
    category: "fruit",
    bulkDensityKgPerL: 0.50,      // ~0.45–0.55 typical bulk pack
    fragility: "normal",
    maxWeightPerBoxKg: 10,
    minBoxType: "Small",
    requiresVentedBox: false,
    allowMixing: true
  },
  "FRT-002": { // Banana Cavendish
    name: "Banana Cavendish",
    category: "fruit",
    bulkDensityKgPerL: 0.45,      // studies show ~0.34–0.49
    fragility: "normal",          // bruises—avoid heavy items on top
    maxWeightPerBoxKg: 8,
    minBoxType: "Small",
    requiresVentedBox: false,
    allowMixing: true
  },
  "FRT-003": { // Orange Navel
    name: "Orange Navel",
    category: "fruit",
    bulkDensityKgPerL: 0.55,      // ~0.53–0.56
    fragility: "normal",
    maxWeightPerBoxKg: 12,
    minBoxType: "Small",
    requiresVentedBox: false,
    allowMixing: true
  },
  "FRT-004": { // Grapes Red Globe
    name: "Grapes Red Globe",
    category: "fruit",
    bulkDensityKgPerL: 0.60,      // ~0.48–0.61 reported ranges
    fragility: "fragile",
    maxWeightPerBoxKg: 5,
    minBoxType: "Small",
    requiresVentedBox: true,
    allowMixing: true
  },
  "FRT-005": { // Strawberry Albion
    name: "Strawberry Albion",
    category: "fruit",
    bulkDensityKgPerL: 0.26,      // 1 lb clamshell ≈ 1.8–2.0 L → ~0.23–0.25+
    fragility: "fragile",
    maxWeightPerBoxKg: 2,
    minBoxType: "Small",
    requiresVentedBox: true,
    allowMixing: true
  },

  // VEGETABLES
  "VEG-001": { // Tomato Cherry
    name: "Tomato Cherry",
    category: "vegetable",
    bulkDensityKgPerL: 0.62,      // pint ≈ 0.473 L ~10–11 oz → ~0.58–0.66
    fragility: "fragile",
    maxWeightPerBoxKg: 3,
    minBoxType: "Small",
    requiresVentedBox: true,
    allowMixing: true
  },
  "VEG-002": { // Lettuce Romaine
    name: "Lettuce Romaine",
    category: "vegetable",
    bulkDensityKgPerL: 0.22,      // 24ct cases ≈ 2.4–2.5 ft³ at ~35 lb
    fragility: "fragile",
    maxWeightPerBoxKg: 2.5,
    minBoxType: "Medium",         // Small is usually too tight by volume
    requiresVentedBox: true,
    allowMixing: true
  },
  "VEG-003": { // Cucumber Persian
    name: "Cucumber Persian",
    category: "vegetable",
    bulkDensityKgPerL: 0.63,      // ~48–50 lb per bushel (35.24 L)
    fragility: "normal",          // scuffs; don’t overpack
    maxWeightPerBoxKg: 10,
    minBoxType: "Small",
    requiresVentedBox: false,
    allowMixing: true
  },
  "VEG-004": { // Carrot Nantes
    name: "Carrot Nantes",
    category: "vegetable",
    bulkDensityKgPerL: 0.60,      // bushel-based ~0.64; literature ~0.47–0.71 depending on cut
    fragility: "sturdy",
    maxWeightPerBoxKg: 12,
    minBoxType: "Small",
    requiresVentedBox: false,
    allowMixing: true
  },
  "VEG-005": { // Spinach Baby
    name: "Spinach Baby",
    category: "vegetable",
    bulkDensityKgPerL: 0.10,      // leafy bulk ~0.08–0.12
    fragility: "fragile",
    maxWeightPerBoxKg: 1.5,
    minBoxType: "Medium",
    requiresVentedBox: true,
    allowMixing: true
  }
};
