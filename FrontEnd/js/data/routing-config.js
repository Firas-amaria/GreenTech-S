// Tunables to help you score "best deliverer" & plan routes next step.

export const ROUTING_CONFIG = {
  // Simple multi-criteria score weights
  scoringWeights: {
    // prefer deliverers with higher leftover capacity after assignment
    capacitySlack: 0.35,
    // prefer closer to LC-1 or first stop
    proximityKm: 0.25,
    // prefer lower cost
    costPerKm: 0.20,
    // prefer faster vehicle types
    speed: 0.15,
    // small bias toward fewer stops per route
    stopCountPenalty: 0.05,
  },

  // Operational constants (mock)
  avgLoadTimeMinPerStop: 6,
  avgUnloadTimeMinPerPackage: 1.5,

  // Hard caps (safety)
  maxRouteDurationMin: 240,     // 4 hours
  maxRouteDistanceKm: 120,
  minServiceWindowBufferMin: 10,

  // Heuristic speeds if needed (km/h)
  vehicleSpeeds: {
    "Motorbike (Cargo Box)": 55,
    Hatchback: 50,
    "Small Van": 45,
    "Medium Van": 42,
  },
};
