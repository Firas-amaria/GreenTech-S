import { openRouteMap, closeRouteMap, initRouteMap } from "./route.js";

const API_BASE = "http://localhost:4000";

async function loadGoogleMapsScript() {
  try {
    const res = await fetch(`${API_BASE}/api/maps/google-maps-script`);
    const data = await res.json();
    const script = document.createElement("script");
    script.src = data.scriptUrl + "&language=en&callback=initMap";
    script.async = true;
    document.head.appendChild(script);
    // console.log("✅ Google Maps script appended");
  } catch (err) {
    console.error("Failed to load Google Maps script", err);
  }
}
loadGoogleMapsScript();
window.initMapsGlobal = function () {
  initRouteMap();
};

// Get origin coordinates from URL parameters
function getOriginFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const originLat = urlParams.get('originLat');
  const originLng = urlParams.get('originLng');
  
  // Default coordinates (fallback if URL params are missing)
  const DEFAULT_ORIGIN_LAT = 32.0853;
  const DEFAULT_ORIGIN_LNG = 34.7818;
  
  return {
    lat: originLat ? parseFloat(originLat) : DEFAULT_ORIGIN_LAT,
    lng: originLng ? parseFloat(originLng) : DEFAULT_ORIGIN_LNG
  };
}

document.getElementById("show-route-btn").addEventListener("click", () => {
  // Get origin coordinates from URL or use defaults
  const origin = getOriginFromURL();
  
  openRouteMap({
    origin: origin,
    destination: { lat: 32.7269, lng: 35.2157 },
    onResult: (info) => {
      if (info.closed) {
        console.log("User closed the route modal.");
        document.getElementById("route-info").innerHTML = "";
      } else {
        console.log("Travel info:", info);
        document.getElementById(
          "route-info"
        ).innerHTML = `🚗 Estimated Time: <strong>${info.duration}</strong> (${info.distance})`;
      }
    },
  });
});

document.querySelector("#route-modal button").addEventListener("click", () => {
  closeRouteMap();
});
