document.addEventListener("DOMContentLoaded", function () {
    console.log("Initializing Firebase authentication...");

    const firebaseConfig = {
        apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
        authDomain: "megamasmotor-4008c.firebaseapp.com",
        databaseURL: "https://megamasmotor-4008c-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "megamasmotor-4008c",
        storageBucket: "megamasmotor-4008c.firebasestorage.app",
        messagingSenderId: "874673615212",
        appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
        measurementId: "G-LF6NB7ZKLE"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

    // 🔹 Work hours (08:00 - 19:00 WITA for testing)
    const WORK_HOURS_START = 8;
    const WORK_HOURS_END = 19;

    function getCurrentHourWITA() {
        const now = new Date();
        return now.getUTCHours() + 8; // Convert UTC to WITA
    }

    function isLoginAllowed() {
        const currentHour = getCurrentHourWITA();
        return currentHour >= WORK_HOURS_START && currentHour < WORK_HOURS_END;
    }

    function login() {
        if (!isLoginAllowed()) {
            alert("Login only allowed between 08:00 - 19:00 WITA.");
            return;
        }

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                document.getElementById("loginStatus").textContent = "Login successful!";
                console.log("User logged in:", userCredential.user);

                // Store login timestamp
                sessionStorage.setItem("userLoggedIn", "true");

                // Redirect to orders.html after successful login
                window.location.href = "orders.html";
            })
            .catch((error) => {
                console.error("Login error:", error.message);
                document.getElementById("loginStatus").textContent = "Login failed: Invalid email or incorrect password";
            });
    }

    function logout() {
        auth.signOut()
            .then(() => {
                document.getElementById("loginStatus").textContent = "Logged out.";
                console.log("User logged out");

                // Remove session flag
                sessionStorage.removeItem("userLoggedIn");
            })
            .catch((error) => {
                console.error("Logout error:", error.message);
            });
    }

    // 🔹 Force auto-logout outside work hours
    function enforceWorkHours() {
        const currentHour = getCurrentHourWITA();
        
        auth.currentUser?.getIdToken(true).then(() => {
            if (!isLoginAllowed() && auth.currentUser) {
                alert("Work hours have ended. You will be logged out.");
                
                auth.signOut().then(() => {
                    console.log("User auto-logged out due to work hours restriction.");
                    window.location.href = "index.html"; // Redirect to login page
                });
            }
        }).catch(error => {
            console.error("Auto-logout check failed:", error.message);
        });
    }

    // 🔹 Run enforceWorkHours every minute to ensure compliance
    setInterval(enforceWorkHours, 60000);

    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById("loginStatus").textContent = `Logged in as ${user.email}`;

            // Redirect only if login came from login form
            if (sessionStorage.getItem("userLoggedIn")) {
                sessionStorage.removeItem("userLoggedIn"); // Prevent repeated redirection
                window.location.href = "orders.html";
            }
        } else {
            document.getElementById("loginStatus").textContent = "Not logged in.";
        }
    });

    window.login = login;
    window.logout = logout;
});

function resetPassword() {
    var email = document.getElementById("email").value;
    if (!email) {
        alert("Please enter your email first.");
        return;
    }

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            alert("Password reset email sent! Check your inbox.");
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
}
