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
window.initMapsGlobal = function() {
  initRouteMap();
}

document.getElementById("show-route-btn").addEventListener("click", () => {
  openRouteMap({
    origin: { lat: 32.0853, lng: 34.7818 },
    destination: { lat: 31.7683, lng: 35.2137 },
    onResult: (info) => {
      if (info.closed) {
        console.log("User closed the route modal.");
        document.getElementById("route-info").innerHTML = "";
      } else {
        console.log("Travel info:", info);
        document.getElementById("route-info").innerHTML = 
          `🚗 Estimated Time: <strong>${info.duration}</strong> (${info.distance})`;
      }
    }
  });
});

document.querySelector("#route-modal button").addEventListener("click", () => {
  closeRouteMap();
});
