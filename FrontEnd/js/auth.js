import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, getCurrentUserToken } from "./firebase-init.js";
import { openMapPicker, initMapPicker } from "./mapPicker.js";



// ✅ Load Google Maps dynamically only if registration address field exists
if (document.getElementById("register-address")) {
  fetch("http://localhost:4000/api/maps/google-maps-script")
    .then(res => res.json())
    .then(data => {
      const script = document.createElement("script");
      script.src = data.scriptUrl + "&language=en&callback=initMap";
      script.async = true;
      document.head.appendChild(script);
      console.log("✅ Google Maps script appended on registration");
    })
    .catch(err => console.error("Failed to load Google Maps script", err));

  // Expose callback to global scope for Google Maps
  window.initMap = () => {
    console.log("✅ Google Maps callback fired on register");
    initMapPicker();
  };
}


// ✅ SAFE MAP PICKER INIT FOR REGISTRATION
const addrInput = document.getElementById("register-address");
if (addrInput) {
  addrInput.addEventListener("click", () => {
    openMapPicker((location) => {
      addrInput.value = location.address;
      document.getElementById("register-lat").value = location.latitude;
      document.getElementById("register-lng").value = location.longitude;
    });
  });
}

window.register = async (event) => {
  event.preventDefault();

  const form = document.getElementById("register-form");
  const firstName = form["register-fullname"].value.split(" ")[0];
  const lastName = form["register-fullname"].value.split(" ")[1] || "";

  const email = form["register-email"].value;
  const phone = iti.getNumber(); // This gives the full international number like +972512325456
  const address = {
    address: form["register-address"].value,
    latitude: form["register-lat"].value,
    longitude: form["register-lng"].value
  };
  const birthDate = form["register-birthdate"].value;
  const password = form["register-password"].value;
  const confirmPassword = form["confirm-password"].value;

  // ... (your existing validations unchanged)
  if (!firstName) {
    document.getElementById("error-message").innerText =
      "First name is required.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }
  if (firstName.length < 2) {
    document.getElementById("error-message").innerText =
      "First name must be at least 2 characters long.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }
  if (!/^[a-zA-Z]+$/.test(firstName)) {
    document.getElementById("error-message").innerText =
      "First name must contain only letters.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }

  if (!lastName) {
    document.getElementById("error-message").innerText =
      "Last name is required.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }
  if (lastName.length < 2) {
    document.getElementById("error-message").innerText =
      "Last name must be at least 2 characters long.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }
  if (!/^[a-zA-Z]+$/.test(lastName)) {
    document.getElementById("error-message").innerText =
      "Last name must contain only letters.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }

  if (!email) {
    document.getElementById("error-message").innerText = "Email is required.";
    form["register-email"].style.borderColor = "red";
    return;
  }
  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
    document.getElementById("error-message").innerText =
      "Email must be a valid Gmail address.";
    form["register-email"].style.borderColor = "red";
    return;
  }

  if (!phone) {
    document.getElementById("error-message").innerText =
      "Phone number is required.";
    form["register-phone"].style.borderColor = "red";
    return;
  }

  if (!address.address) {
    document.getElementById("error-message").innerText = "Address is required.";
    form["register-address"].style.borderColor = "red";
    return;
  }

  if (!birthDate) {
    document.getElementById("error-message").innerText =
      "Birth date is required.";
    form["register-birthdate"].style.borderColor = "red";
    return;
  } else {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (age < 18 || (age === 18 && monthDiff < 0)) {
      document.getElementById("error-message").innerText =
        "You must be at least 18 years old to register.";
      form["register-birthdate"].style.borderColor = "red";
      return;
    }
  }

  if (!password) {
    document.getElementById("error-message").innerText =
      "Password is required.";
    form["register-password"].style.borderColor = "red";
    return;
  }
  if (password.length < 8) {
    document.getElementById("error-message").innerText =
      "Password must be at least 8 characters long.";
    form["register-password"].style.borderColor = "red";
    return;
  }
  if (!/[A-Z]/.test(password)) {
    document.getElementById("error-message").innerText =
      "Password must contain at least one uppercase letter.";
    form["register-password"].style.borderColor = "red";
    return;
  }
  if (!/[a-z]/.test(password)) {
    document.getElementById("error-message").innerText =
      "Password must contain at least one lowercase letter.";
    form["register-password"].style.borderColor = "red";
    return;
  }
  if (!/[0-9]/.test(password)) {
    document.getElementById("error-message").innerText =
      "Password must contain at least one number.";
    form["register-password"].style.borderColor = "red";
    return;
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    document.getElementById("error-message").innerText =
      "Password must contain at least one special character.";
    form["register-password"].style.borderColor = "red";
    return;
  }

  if (!confirmPassword) {
    document.getElementById("confirmPassword-error-message").innerText =
      "Please confirm your password.";
    form["confirm-password"].style.borderColor = "red";
    return;
  }

  if (password !== confirmPassword) {
    document.getElementById("error-message").innerText =
      "Passwords do not match.";
    form["register-password"].style.borderColor = "red";
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/api/auth/register-customer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          birthDate,
          address,
          password,
          confirmPassword,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      alert("Registration failed: " + data.error);
      return;
    }

    alert("Registration successful!");
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    alert("Registration failed - Unknown Error ");
  }
};

window.login = async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    document.getElementById("login-error-message").innerText = error.message;
  }
  try {
    const token = await getCurrentUserToken();
    const res = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Backend login failed:", errorData);
      throw new Error(`Backend login failed: ${res.status}`);
    }

    const data = await res.json();
    const role = data.role;
    const name = data.name;

    localStorage.setItem(
      "user",
      JSON.stringify({
        role: role,
        name: name,
      })
    );

    switch (role) {
      case "admin":
        window.location.href = "u-admin/a_dashboard.html";
        break;
      case "farmer":
        window.location.href = "u-farmer/f-dashboard.html";
        break;
      case "Operation-Manager":
        window.location.href = "opManager-dashboard.html";
        break;
      case "picker":
        window.location.href = "picker-dashboard.html";
        break;
      case "customer":
        window.location.href = "market.html";
        break;
      case "deliverer":
        window.location.href = "deliverer-dashboard.html";
        break;
      case "farmerManager":
        window.location.href = "u-farmerManager/fm-dashboard.html";
        break;
        case "transportationManager":
        window.location.href = "u-trasportationManager/tm-dashboard.html";
        break;
      default:
        console.log(role)
        alert("Unknown role. Contact support.  ");
        break;
    }
  } catch (Error) {
    console.error(Error);
    console.error("Error accured :" + Error.message);
  }
};
