let map, marker, geocoder, autocomplete, confirmCallback;

export function initMapPicker() {
  //console.log("✅ Google Maps loaded: initializing picker...");
  geocoder = new google.maps.Geocoder();

  // 🌍 Initialize Map centered on Tel Aviv
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 32.0853, lng: 34.7818 },
    zoom: 13
  });

  // 📍 Draggable Marker
  marker = new google.maps.Marker({
    map,
    draggable: true,
    position: { lat: 32.0853, lng: 34.7818 }
  });

  // 🖱 Click sets marker
  map.addListener("click", (e) => marker.setPosition(e.latLng));

  // 🔍 Setup Autocomplete restricted to Israel
  const input = document.getElementById("map-search");
  autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "il" },
    fields: ["geometry", "name", "formatted_address"]
  });

  autocomplete.bindTo("bounds", map);

  // 🔥 When a place is picked
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    console.log("🔍 Autocomplete selected:", place);

    if (!place.geometry) {
      console.log("⚠️ No geometry. Trying manual geocode fallback...");
      if (place.name) {
        geocoder.geocode({ address: place.name }, (results, status) => {
          if (status === "OK" && results[0]) {
            map.panTo(results[0].geometry.location);
            map.setZoom(15);
            marker.setPosition(results[0].geometry.location);
            console.log("✅ Fallback geocode success:", results[0].formatted_address);
          } else {
            alert("Could not find location for: " + place.name);
          }
        });
      } else {
        alert("No details found. Please select from dropdown.");
      }
    } else {
      map.panTo(place.geometry.location);
      map.setZoom(15);
      marker.setPosition(place.geometry.location);
      console.log("✅ Autocomplete success:", place.formatted_address || place.name);
    }
  });

  // 🖱 Confirm / Cancel Buttons
  document.getElementById("confirm-location").addEventListener("click", confirmMapLocation);
  document.getElementById("cancel-location").addEventListener("click", closeMapPicker);
}

export function openMapPicker(callback) {
  confirmCallback = callback;
  document.getElementById("map-modal").style.display = "flex";
  setTimeout(() => {
    google.maps.event.trigger(map, "resize");
    map.setCenter(marker.getPosition());
  }, 200);
}

export function closeMapPicker() {
  document.getElementById("map-modal").style.display = "none";
}

export function confirmMapLocation() {
  const pos = marker.getPosition();
  geocoder.geocode({ location: pos }, (results, status) => {
    console.log("🗺 Confirm geocode results:", results);
    if (status === "OK" && results[0]) {
      const locationData = {
        address: results[0].formatted_address,
        latitude: pos.lat(),
        longitude: pos.lng()
      };
      console.log("✅ Confirmed location:", locationData);
      if (confirmCallback) confirmCallback(locationData);
      closeMapPicker();
    } else {
      alert("Unable to get address. Try again.");
    }
  });
}
