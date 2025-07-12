import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";
const API_BASE = "http://localhost:4000";
const container = document.getElementById("profile-card");
let userData = {};  
document.getElementById("logout-link")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }
  const token = await user.getIdToken();
  await loadOrders(token);
});


async function profile(token) {
  try {
    const res = await fetch(`${API_BASE}/api/customer/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load profile");
    userData = await res.json();
    renderProfile(userData);
  } catch (err) {
    console.error("Error loading profile:", err);
    container.innerHTML = `<p>Could not load profile.</p>`;
  }   
  
}

function renderProfile(data) {
  container.innerHTML = `
    <div class="profile-card">
      <h2>User Profile</h2>
      <div class="profile-field">
        <label for="name">Name:</label>
        <input type="text" id="name" value="${data.name}" disabled />
        <button onclick="toggleEdit('name')">Edit</button>
      </div>
      <div class="profile-field">
        <label for="email">Email:</label>
        <input type="email" id="email" value="${data.email}" disabled />
        <button onclick="toggleEdit('email')">Edit</button>
      </div>
      <div class="profile-field">
        <label for="phone">Phone:</label>
        <input type="tel" id="phone" value="${data.phone}" disabled />
        <button onclick="toggleEdit('phone')">Edit</button>
      </div>
    </div>`;
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  nameInput.value = data.name || "";
  emailInput.value = data.email || "";
  phoneInput.value = data.phone || "";
  nameInput.disabled = true;
  emailInput.disabled = true;
  phoneInput.disabled = true;
} 

function toggleEdit(fieldId) {
  const input = document.getElementById(fieldId);
  const button = input.nextElementSibling;

  if (input.disabled) {
    input.disabled = false;
    button.textContent = "Save";
  } else {
    input.disabled = true;
    button.textContent = "Edit";
    // Save logic here (e.g., localStorage or Firebase)
    // Example:
    console.log(`Saved ${fieldId}: ${input.value}`);
  }
}
