import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: "taskmanager-af47d.firebaseapp.com",
  projectId: "taskmanager-af47d",
  storageBucket: "taskmanager-af47d.firebasestorage.app",
  messagingSenderId: "496409912602",
  appId: "1:496409912602:web:89f612a5439b2af54538a3",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };