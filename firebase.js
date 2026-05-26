import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  getDoc
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyChoHOzb3nbZ0BNcWr5X28ttHpXEexTLW0",
  authDomain: "mayil-studio.firebaseapp.com",
  projectId: "mayil-studio",
  storageBucket: "mayil-studio.firebasestorage.app",
  messagingSenderId: "929821476998",
  appId: "1:929821476998:web:b3a759759dfee5006ee907",
  measurementId: "G-K5X7LSDDLG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Re-export commonly used helpers so other modules can import from this file
export {
  app,
  db,
  storage,
  auth,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  getDoc,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};

export default app;