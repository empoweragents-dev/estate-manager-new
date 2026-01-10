import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
  authDomain: "estatemanager-861a9.firebaseapp.com",
  projectId: "estatemanager-861a9",
  storageBucket: "estatemanager-861a9.firebasestorage.app",
  messagingSenderId: "935619473858",
  appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
