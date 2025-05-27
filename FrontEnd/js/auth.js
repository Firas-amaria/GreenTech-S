// Register function
async function register(event) {
  event.preventDefault();

  const emailInput = document.getElementById("register-email");
  const email = emailInput.value.trim();
  const errorMessage = document.getElementById("email-error-message");
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  // Validate email immediately
  if (!gmailRegex.test(email)) {
    errorMessage.textContent = "Email must be a valid Gmail address (e.g. example@gmail.com).";
    return;
  } else {
    errorMessage.textContent = "";
  }

  try {
    // Check if email already exists
    let response = await fetch("http://localhost:4000/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error("Network error during email check.");
    }

    const emailCheckResult = await response.json();

    if (emailCheckResult.exists) {
      errorMessage.textContent = "Email already exists. Please use a different email.";
      return;
    }

    // Collect other form inputs after validation
    const firstName = document.getElementById("register-firstname").value.trim();
    const lastName = document.getElementById("register-lastname").value.trim();
    const phone = document.getElementById("register-phone").value.trim();
    const birthday = document.getElementById("register-birthday").value.trim();
    const address = document.getElementById("register-address").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Validate password
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
      birthday,
      address,
      password
    };

    console.log("Sending user data:", userData);

    response = await fetch("http://localhost:4000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Registration request failed.");
    }

    const registerResult = await response.json();

    if (registerResult.success) {
      alert("Registration successful!");
      window.location.href = "login.html";
    } else {
      alert(registerResult.message || "Registration failed. Please try again.");
    }

  } catch (error) {
    console.error("Error during registration:", error);
    alert("An error occurred during registration. Please try again later.");
  }
}

// Login function
async function login(event) {
  event.preventDefault();
  
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login request failed.");
    }

    const loginResult = await response.json();

    if (loginResult.success) {
      alert(`Welcome, ${loginResult.firstName || 'User'}!`);
      window.location.href = "dashboard.html";  // redirect after login
    } else {
      alert(loginResult.message || "Invalid email or password.");
    }

  } catch (error) {
    console.error("Error during login:", error);
    alert("An error occurred during login. Please try again later.");
  }
}

// Adding event listeners properly
document.getElementById("register-form").addEventListener("submit", register);
document.getElementById("login-form").addEventListener("submit", login);


// Adding event listeners for job selection buttons
 function selectJob(position) {
            const user = JSON.parse(localStorage.getItem("loggedInUser"));

            if (!user) {
                // User not logged in, send to registration with selected position
                
                window.location.href = `register.html?position=${encodeURIComponent(position)}`;
            } else {
                // User logged in, redirect based on the selected position
                if (position === "Farmer") {
                    window.location.href = "farmerreg.html";
                } else if (position === "Driver") {
                    window.location.href = ".html";
                } else {
                    // General positions can be redirected to a generic page
                   
                }
            }
        }
