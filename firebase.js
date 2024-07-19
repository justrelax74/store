// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
  authDomain: "megamasmotor-4008c.firebaseapp.com",
  projectId: "megamasmotor-4008c",
  storageBucket: "megamasmotor-4008c.appspot.com",
  messagingSenderId: "874673615212",
  appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
  measurementId: "G-LF6NB7ZKLE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Conditionally initialize Firebase Analytics
isSupported().then((supported) => {
  if (supported) {
    const analytics = getAnalytics(app);
    console.log("Analytics initialized");
  } else {
    console.log("Analytics not supported in this environment");
  }
}).catch((error) => {
  console.error("Error checking analytics support:", error);
});

export { db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where };
