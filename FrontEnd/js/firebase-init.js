// js/firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// — Your Firebase config —
const firebaseConfig = {
  apiKey: "AIzaSyAhjN9W_65iyf_Y-6Mi-Tk05hiaq5PGkkQ",
  authDomain: "dfcp-system.firebaseapp.com",
  projectId: "dfcp-system",
  storageBucket: "dfcp-system.firebasestorage.app",
  messagingSenderId: "479660967900",
  appId: "1:479660967900:web:85f5e3544ea451bee93119",
  measurementId: "G-GWNNJKVF43",
};

// Initialize Firebase App (only once per page)
const app = initializeApp(firebaseConfig);

// Export the auth object to use in other files
const auth = getAuth(app);

export async function getCurrentUserToken() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        reject("No user signed in");
      }
    });
  });
}

export { auth, signOut };
