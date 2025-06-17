// backend/firebaseService.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: "AIzaSyAhjN9W_65iyf_Y-6Mi-Tk05hiaq5PGkkQ",
  authDomain: "dfcp-system.firebaseapp.com",
  projectId: "dfcp-system",
  storageBucket: "dfcp-system.firebasestorage.app",
  messagingSenderId: "479660967900",
  appId: "1:479660967900:web:903df7b9b76593bbe93119",
  measurementId: "G-NXX2XXQJZL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function saveToFirebase(data) {
  await addDoc(collection(db, 'articles'), {
    ...data,
    fetchedAt: new Date()
  });
};