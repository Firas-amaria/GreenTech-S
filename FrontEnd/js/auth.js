// js/auth.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth, getCurrentUserToken } from "./firebase-init.js";

window.register = async (event) => {
  event.preventDefault();

  const form = document.getElementById("register-form");
  const firstName = form["register-firstname"].value;
  const lastName = form["register-lastname"].value;
  const email = form["register-email"].value;
  const phone = form["register-phone"].value;
  const address = form["register-address"].value;
  const birthDate = form["register-birthdate"].value;
  const password = form["register-password"].value;
  const confirmPassword = form["confirm-password"].value;

  if (password !== confirmPassword) {
    document.getElementById("email-error-message").innerText =
      "Passwords do not match.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

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
    document.getElementById("email-error-message").innerText = error.message;
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

    // Get token using shared utility
    const token = await getCurrentUserToken();

    // Fetch user role from backend
    const res = await fetch("http://localhost:4000/api/auth/get-role", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    console.log("User role:", data.role);

    // Optional: save token
    // localStorage.setItem("firebaseToken", token);

    // Redirect based on role
    switch (data.role) {
      case "admin":
        window.location.href = "admin-dashboard.html";
        break;
      case "employee":///add for all types of roles that we have a dashboard for 
        window.location.href = "employee-dashboard.html";
        break;
      case "customer":
        window.location.href = "customer-home.html";
        break;
      default:
        alert("Unknown role. Contact support.");
        break;
    }
  } catch (error) {
    console.error(error);
    document.getElementById("login-error-message").innerText = error.message;
  }
};
