let map;
let directionsRenderer;
let directionsService;
let mapsReady = false;

export function initRouteMap() {
  console.log("✅ Google Maps callback fired, initializing route map...");

  map = new google.maps.Map(document.getElementById("route-map"), {
    center: { lat: 32.7335, lng: 35.2188 },
    zoom: 8,
  });

  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsService = new google.maps.DirectionsService();

  directionsRenderer.setMap(map); // ✅ always tie the renderer to your map
  mapsReady = true;
}

// 🗺️ Main entry point
export function openRouteMap({ origin, destination, destinationAddress, onResult }) {
  console.log("🚀 openRouteMap called");

  // ✅ SHOW THE MODAL
  const modal = document.getElementById("route-modal");
  modal.style.display = "flex";

  if (!mapsReady) {
    console.error("Google Maps not initialized yet. Try again.");
    if (onResult) onResult({ error: "Google Maps not ready." });
    return;
  }

  if (destination) {
    calculateRoute(origin, destination, onResult);
  } else if (destinationAddress) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: destinationAddress }, (results, status) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;
        console.log("📍 Geocoded address to:", location.toJSON());
        calculateRoute(origin, { lat: location.lat(), lng: location.lng() }, onResult);
      } else {
        console.error("Geocoding failed:", status);
        if (onResult) onResult({ error: "Could not geocode address." });
        document.getElementById("route-info").innerHTML = "❌ Could not geocode address.";
      }
    });
  } else {
    console.error("No destination specified");
    if (onResult) onResult({ error: "No destination specified." });
    document.getElementById("route-info").innerHTML = "❌ No destination specified.";
  }
}

// 🛣️ Compute route + update map + callback
function calculateRoute(origin, destination, onResult) {
  directionsService.route(
    {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK" && result.routes[0]) {
        console.log("✅ Got directions:", result);
        showRouteOnMap(result);

        const leg = result.routes[0].legs[0];
        document.getElementById("route-info").innerHTML = 
          `🚗 Estimated Time: <strong>${leg.duration.text}</strong> (${leg.distance.text})`;

        if (onResult) {
          onResult({
            duration: leg.duration.text,
            distance: leg.distance.text,
            closed: false,
          });
        }
      } else {
        console.error("Directions failed:", status);
        document.getElementById("route-info").innerHTML = "❌ Could not calculate route.";
        if (onResult) onResult({ error: "Route calculation failed." });
      }
    }
  );
}

// 🗺️ Render route on map
function showRouteOnMap(result) {
  document.getElementById("route-map").style.display = "block"; // just in case
  directionsRenderer.setDirections(result);
  google.maps.event.trigger(map, "resize"); // 🛠 force recalculation
}


// 🔥 Close modal + reset
export function closeRouteMap() {
  console.log("Closing route modal...");
  document.getElementById("route-modal").style.display = "none";
  if (directionsRenderer) {
    directionsRenderer.set('directions', null);
  }
}
