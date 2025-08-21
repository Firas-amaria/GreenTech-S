// Pin LC-1 for now. Note: "alt" is latitude (kept to match your earlier naming).
export const LOGISTIC_CENTERS = {
  "LC-1": {
    id: "LC-1",
    name: "LC-1 Logistic Center",
    address: "LC-1 Logistic Center, Zarzir, Israel",
    lng: 34.7818,
    alt: 32.0853,
  },
};

// Handy default for seeding driver liveLocation
export const LC1_LOCATION = {
  address: LOGISTIC_CENTERS["LC-1"].address,
  lng: LOGISTIC_CENTERS["LC-1"].lng,
  alt: LOGISTIC_CENTERS["LC-1"].alt,
};
