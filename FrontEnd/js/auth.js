

// js/auth.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// — 1) Your Firebase config (fill in your values) —
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  // …etc…
};

// — 2) Initialize Firebase & Auth —
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// — 3) Login function —  
window.login = async function login(event) {
  event.preventDefault();

  // grab the inputs by their IDs
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('password').value;

  try {
    // attempt sign-in
    await signInWithEmailAndPassword(auth, email, password);

    // on success, redirect wherever you like
    window.location.href = '../index.html';
  } catch (err) {
    // display the error message in your page
    // make sure you have: <p id="login-error-message" class="error-message"></p> in login.html
    document.getElementById('login-error-message').textContent = err.message;
  }
};

// — 4) Optional: react to auth state changes globally —
onAuthStateChanged(auth, user => {
  if (user) {
    document.body.setAttribute('data-user-logged-in', 'true');
  } else {
    document.body.removeAttribute('data-user-logged-in');
  }
});



window.register = async function register(e) {
  e.preventDefault();
  const form = document.getElementById('register-form');
  const data = Object.fromEntries(new FormData(form));
  
  // optional re-check
  const check = await fetch(`/api/check-email?email=${encodeURIComponent(data.email)}`);
  if ((await check.json()).exists) {
    return alert('That email is already in use. Please log in.');
  }


  // POST to your backend
  const res = await fetch('http://localhost:4000/api/auth/register-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if (res.ok) {
    // registration succeeded
    window.location.href = 'login.html';
  } else {
    // show backend error
    document.getElementById('email-error-message').textContent = result.message;
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
