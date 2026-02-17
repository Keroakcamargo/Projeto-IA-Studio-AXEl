
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, setDoc, getDoc, Timestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurações reais fornecidas pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyDTX5h-JxaGd9-eGf_V9gTCtK0qNtHBxYM",
  authDomain: "axel-sales-assistant-ai.firebaseapp.com",
  projectId: "axel-sales-assistant-ai",
  storageBucket: "axel-sales-assistant-ai.firebasestorage.app",
  messagingSenderId: "418741764204",
  appId: "1:418741764204:web:8d82423a59d5c83bbc9849"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
