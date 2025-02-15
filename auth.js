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

  function login() {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      auth.signInWithEmailAndPassword(email, password)
          .then((userCredential) => {
              document.getElementById("loginStatus").textContent = "Login successful!";
              console.log("User logged in:", userCredential.user);
          })
          .catch((error) => {
              console.error("Login error:", error.message);
              document.getElementById("loginStatus").textContent = "Login failed: Invalid email or incorrect password " 
          });
  }

  function logout() {
      auth.signOut()
          .then(() => {
              document.getElementById("loginStatus").textContent = "Logged out.";
              console.log("User logged out");
          })
          .catch((error) => {
              console.error("Logout error:", error.message);
          });
  }

  auth.onAuthStateChanged((user) => {
      if (user) {
          document.getElementById("loginStatus").textContent = `Logged in as ${user.email}`;
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
