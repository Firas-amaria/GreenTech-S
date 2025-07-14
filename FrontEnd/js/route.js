let routeMap, directionsService, directionsRenderer;
let currentRouteModalId = "route-modal";
let currentOnResult = null; // 🔥 stores callback for this route session

export function initRouteMap() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  routeMap = new google.maps.Map(document.getElementById("route-map"), {
    zoom: 7,
    center: { lat: 32.7335, lng: 35.2188 },
  
  });

  directionsRenderer.setMap(routeMap);
}

export function openRouteMap({ origin, destination, onResult = null }) {
  currentOnResult = onResult;

  if (!routeMap) {
    initRouteMap();
  }

  const modal = document.getElementById(currentRouteModalId);
  modal.style.display = "flex";

  setTimeout(() => {
    google.maps.event.trigger(routeMap, "resize");
    routeMap.setCenter(new google.maps.LatLng(origin.lat, origin.lng));
    displayRoute(origin, destination);
  }, 200);
}

export function closeRouteMap() {
  document.getElementById(currentRouteModalId).style.display = "none";
  // 🔥 notify that user closed it
  if (currentOnResult) {
    currentOnResult({ closed: true });
    currentOnResult = null; // clear after calling
  }
}

function displayRoute(origin, destination) {
  directionsService.route(
    {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      travelMode: google.maps.TravelMode.DRIVING
    },
    (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);

        const routeLeg = result.routes[0].legs[0];
        const duration = routeLeg.duration.text;
        const distance = routeLeg.distance.text;

        console.log("🚗 Duration:", duration, "| Distance:", distance);

        if (currentOnResult) {
          currentOnResult({ duration, distance });
        }

      } else {
        console.error("Could not display route due to: ", status);
        alert("Could not display route: " + status);
      }
    }
  );
}
