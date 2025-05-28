// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
    // Firebase user creation (client-side)
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Send user data to backend
    await fetch("http://localhost:4000/api/auth/register-customer", {
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
    });

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
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful!");
    window.location.href = "Jobs.html";
  } catch (error) {
    console.error(error);
    document.getElementById("login-error-message").innerText = error.message;
  }
};

