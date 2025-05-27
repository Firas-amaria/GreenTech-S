// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// — 1) Your Firebase config (fill in your values) —
const firebaseConfig = {
  apiKey: "AIzaSyAhjN9W_65iyf_Y-6Mi-Tk05hiaq5PGkkQ",
  authDomain: "dfcp-system.firebaseapp.com",
  projectId: "dfcp-system",
  storageBucket: "dfcp-system.firebasestorage.app",
  messagingSenderId: "479660967900",
  appId: "1:479660967900:web:85f5e3544ea451bee93119",
  measurementId: "G-GWNNJKVF43",
};

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

/// FOR BACKEND

//ADD TO ROUTES/AUTHROUTS.JS  OR WHATEVER YOU CALLED THE FILE
/*

router.get('/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Missing email' });

  try {
    // if this resolves, user exists
    await admin.auth().getUserByEmail(email);
    return res.json({ exists: true });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      return res.json({ exists: false });
    }
    console.error('Error checking user by email:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


*/

// In controllers/authController.js, at the top of registerController:
/*
exports.registerController = async (req, res) => {
  const { email, firstName, lastName, phone, address, birthdate, password } = req.body;

  // 1) pre-flight duplicate check
  try {
    await admin.auth().getUserByEmail(email);
    return res
      .status(409)
      .json({ message: 'Email already in use. Please log in instead.' });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error('Error looking up user:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    // user-not-found → OK to proceed
  }

  // 2) now createUser…
  try {
    const userRecord = await admin.auth().createUser({
      email, password, displayName: `${firstName} ${lastName}`, phoneNumber: phone
    });
    // …and store profile in Firestore as before…
    await firestore.collection('users').doc(userRecord.uid).set({
      firstName, lastName, address, birthdate,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.status(201).json({ uid: userRecord.uid });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({ message: error.message });
  }
};

*/
