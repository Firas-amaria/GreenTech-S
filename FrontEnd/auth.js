// Register Function
function register(event) {
  event.preventDefault();

  const firstName = document.getElementById('register-firstname').value.trim();
  const lastName = document.getElementById('register-lastname').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const phone = document.getElementById('register-phone').value.trim();
  const address = document.getElementById('register-address').value.trim();
  const userType = document.getElementById('register-usertype').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  if (!gmailRegex.test(email)) {
    alert("Email must be a valid Gmail address (e.g., yourname@gmail.com).");
    return;
  }
  

  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  const userData = {
    firstName,
    lastName,
    email,
    phone,
    address,
    userType,
    password,
  };

  localStorage.setItem("registeredUser", JSON.stringify(userData));

  alert("Registration successful!");
  window.location.href = "login.html";
}

// Login Function
function login(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('password').value;

  const storedData = localStorage.getItem("registeredUser");

  if (!storedData) {
    alert("No user registered yet.");
    return;
  }

  const user = JSON.parse(storedData);

  if (user.email !== email || user.password !== password) {
    alert("Invalid email or password.");
    return;
  }

  alert(`Welcome, ${user.firstName}!`);
}
