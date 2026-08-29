// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: "taskmanager-af47d.firebaseapp.com",
  projectId: "taskmanager-af47d",
  storageBucket: "taskmanager-af47d.firebasestorage.app",
  messagingSenderId: "496409912602",
  appId: "1:496409912602:web:89f612a5439b2af54538a3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);