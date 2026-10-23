// Firebase client configuration for UrbanPulse
// Initialized from active Firebase CLI project 'pulse-f5963'
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "pulse-f5963",
  appId: "1:5699726472:web:ce2ea135a11c9cf407033d",
  storageBucket: "pulse-f5963.firebasestorage.app",
  apiKey: "AIzaSyDnspf5d3XzLnKtYWwJb1725O2R6jk8EqE",
  authDomain: "pulse-f5963.firebaseapp.com",
  messagingSenderId: "5699726472",
  measurementId: "G-L27PE96EJP"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export default app;
