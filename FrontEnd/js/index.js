 import { auth, signOut } from "./firebase-init.js";

const logoutLink = document.getElementById("logout");

logoutLink.addEventListener("click", (event) => {
  event.preventDefault(); // Prevent the default link action

  signOut(auth)
    .then(() => {
      console.log("User signed out successfully.");
      window.location.href = "index.html"; // Redirect after logout
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
});
    