// js/auth.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth, getCurrentUserToken } from "./firebase-init.js";

window.register = async (event) => {
  event.preventDefault();

  const form = document.getElementById("register-form");
  const firstName = form["register-fullname"].value.split(" ")[0];
  const lastName = form["register-fullname"].value.split(" ")[1] || "";

  const email = form["register-email"].value;
  const phone = form["register-phone"].value;
  const address = form["register-address"].value;
  const birthDate = form["register-birthdate"].value;
  const password = form["register-password"].value;
  const confirmPassword = form["confirm-password"].value;

  if (!firstName) {
    document.getElementById("error-message").innerText =
      "First name is required.";
    form["register-fullname"].style.borderColor = "red";
    return;
  }
  console.log(firstName.length);
  if (firstName.length < 2) {
    console.log("aaa");
    document.getElementById("error-message").innerText =
      "First name must be at least 2 characters long.";
    form["register-fullname"].style.borderColor = "red";

    return;
  }
  //check if first name contains only letters
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
  //check if last name contains only letters
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
  //only gmail is allowed
  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
    document.getElementById("error-message").innerText =
      "Email must be a valid Gmail address.";
    form["register-email"].style.borderColor = "red";
    return;
  }
  // Check if email already exists

  if (!phone) {
    document.getElementById("error-message").innerText =
      "Phone number is required.";
    form["register-phone"].style.borderColor = "red";
    return;
  }

  // check if the phone number is vaild according to the country code

  if (!address) {
    document.getElementById("error-message").innerText = "Address is required.";
    form["register-address"].style.borderColor = "red";
    return;
  }
  if (!birthDate) {
    document.getElementById("error-message").innerText =
      "Birth date is required.";
    form["register-birthdate"].style.borderColor = "red";
    return;
  }
  // Check if birth date is above 18 years old
  else {
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
  // Check password strength
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
  // Check if confirm password is provided and matches the password

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
    // Firebase user creation (client-side)
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Send user data to backend
    const res = await fetch(
      "http://localhost:4000/api/auth/register-customer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
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
    console.log(data);
    alert("Registration successful!");
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    document.getElementById("error-message").innerText = error.message;
  }
};

window.login = async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log(user);

    // Get token using shared utility
    const token = await getCurrentUserToken();
    console.log(user.uid);
    // Fetch user role from backend
    const res = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid: user.uid }),
    });

    const data = await res.json();

    const role = data.message;
    console.log("User role:", role);

    // Redirect based on role
    switch (role) {
      case "admin":
        window.location.href = "admin-dashboard.html";
        break;
      case "farmer":
        window.location.href = "farmer-dashboard.html";
        break;
      case "Operation-Maneger":
        window.location.href = "index.html";
        break;
      case "picker":
        window.location.href = "picker-dashboard.html";
        break;
      case "customer":
        window.location.href = "index.html";
        break;
      case "deliverer":
        window.location.href = "deliverer-dashboard.html";
        break;
      default:
        alert("Unknown role. Contact support.");

        break;
    }

    //window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    document.getElementById("login-error-message").innerText = error.message;
  }
};
