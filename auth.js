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

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();

    const WORK_HOURS_START = 8;
    const WORK_HOURS_END = 19;
    const MAX_SESSION_AGE_MS = 20 * 60 * 60 * 1000; // 24 hours
    const ADMIN_EMAILS = ["biyanaprillamailoa@gmail.com"];

    function getCurrentHourWITA() {
        const now = new Date();
        return now.getUTCHours() + 8;
    }

    function isAdminEmail(email) {
        return ADMIN_EMAILS.includes(email);
    }

    function isLoginAllowed(email) {
        if (isAdminEmail(email)) return true;
        const currentHour = getCurrentHourWITA();
        return currentHour >= WORK_HOURS_START && currentHour < WORK_HOURS_END;
    }

    function clearCacheAndStorage() {
        console.log("Clearing localStorage and cache...");
        localStorage.clear();
        sessionStorage.clear();

        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name));
            });
        }
    }

    function login() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!isLoginAllowed(email)) {
            alert("Login only allowed between 08:00 - 19:00 WITA.");
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const now = new Date().getTime();
                const lastLogin = parseInt(localStorage.getItem("lastLoginTime"), 10);

                if (lastLogin && now - lastLogin > MAX_SESSION_AGE_MS) {
                    alert("Session expired. Please log in again.");
                    clearCacheAndStorage();
                    auth.signOut();
                    return;
                }

                clearCacheAndStorage();
                document.getElementById("loginStatus").textContent = "Login successful!";
                console.log("User logged in:", userCredential.user);

                localStorage.setItem("lastLoginTime", now);
                sessionStorage.setItem("userLoggedIn", "true");

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
                clearCacheAndStorage();
                document.getElementById("loginStatus").textContent = "Logged out.";
                console.log("User logged out");
                window.location.href = "index.html";
            })
            .catch((error) => {
                console.error("Logout error:", error.message);
            });
    }

    function enforceWorkHours() {
        const user = auth.currentUser;
        if (!user) return;

        if (!isLoginAllowed(user.email)) {
            alert("Work hours have ended. You will be logged out.");
            logout();
        }
    }

    setInterval(enforceWorkHours, 60000);

    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById("loginStatus").textContent = `Logged in as ${user.email}`;

            if (sessionStorage.getItem("userLoggedIn")) {
                sessionStorage.removeItem("userLoggedIn");
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
