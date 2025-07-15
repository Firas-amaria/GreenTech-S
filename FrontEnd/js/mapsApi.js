// mapsApi.js
const API_BASE = "http://localhost:4000"; // adapt if needed

// 🚀 Geocode: address → lat/lng
export async function geocode(address) {
  const res = await fetch(`${API_BASE}/api/maps/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  return await res.json();
}

// 🚀 Reverse Geocode: lat/lng → address
export async function reverseGeocode(lat, lng) {
  const res = await fetch(`${API_BASE}/api/maps/reverse-geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng })
  });
  return await res.json();
}

// 🚀 Distance: between two places
export async function getDistance(origin, destination) {
  const res = await fetch(`${API_BASE}/api/maps/distance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination })
  });
  return await res.json();
}

// 🚀 Smart Helper: auto decides based on input
export async function smartMapHelper(input) {
  if (input.origin && input.destination) {
    return await getDistance(input.origin, input.destination);
  }
  if (input.address) {
    return await geocode(input.address);
  }
  if (input.lat != null && input.lng != null) {
    return await reverseGeocode(input.lat, input.lng);
  }
  throw new Error("Invalid input. Provide {address}, {lat & lng}, or {origin & destination}.");
}

/*

import { geocode, reverseGeocode, getDistance, smartMapHelper } from "./mapsApi.js";

// 🏠 Geocode usage
const geo = await geocode("5th Avenue, New York");
console.log("Lat/Lng:", geo);

// 📍 Reverse geocode usage
const rev = await reverseGeocode(32.0853, 34.7818);
console.log("Address:", rev);

// 🚚 Distance usage
const dist = await getDistance("Tel Aviv", "Jerusalem");
console.log("Delivery info:", dist);

// 🚀 Smart auto-helper usage
const info = await smartMapHelper({ origin: "Tel Aviv", destination: "Jerusalem" });
console.log("Smart:", info);

*/