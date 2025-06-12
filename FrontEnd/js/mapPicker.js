let map, marker, selectedCallback;

export function createMapPicker() {
  if (document.getElementById("map-modal")) return; // Prevent multiple initializations

  const modal = document.createElement("div");
  modal.id = "map-modal";
  modal.style = `
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(255, 255, 255, 0.95); z-index: 9999; flex-direction: column; align-items: center; justify-content: center;
  `;
  modal.innerHTML = `
    <div id="map" style="width: 90%; height: 80%; border: 2px solid #ccc;"></div>
    <div style="margin-top: 10px;">
      <button id="confirm-location">Use This Location</button>
      <button id="cancel-location">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Init map
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 32.0853, lng: 34.7818 },
    zoom: 13,
  });

  marker = new google.maps.Marker({ map, draggable: true });

  map.addListener("click", (event) => {
    marker.setPosition(event.latLng);
  });

  document.getElementById("confirm-location").addEventListener("click", () => {
    const pos = marker.getPosition();
    if (!pos) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: pos }, (results, status) => {
      if (status === "OK" && results[0]) {
        const result = {
          address: results[0].formatted_address,
          latitude: pos.lat(),
          longitude: pos.lng()
        };
        if (selectedCallback) selectedCallback(result);
        closeMapPicker();
      } else {
        alert("Unable to fetch address.");
      }
    });
  });

  document.getElementById("cancel-location").addEventListener("click", closeMapPicker);
}

export function openMapPicker(callback) {
  selectedCallback = callback;
  const modal = document.getElementById("map-modal");
  if (modal) {
    modal.style.display = "flex";
    google.maps.event.trigger(map, "resize");
    map.setCenter(marker.getPosition() || { lat: 32.0853, lng: 34.7818 });
  }
}

function closeMapPicker() {
  const modal = document.getElementById("map-modal");
  if (modal) modal.style.display = "none";
}
