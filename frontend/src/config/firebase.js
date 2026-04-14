import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy initialization — only initialize when actually needed
let app = null;
let authInstance = null;
let googleProviderInstance = null;
let dbInstance = null;

function getFirebaseApp() {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getGoogleProvider() {
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
  }
  return googleProviderInstance;
}

export function getFirebaseDb() {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}

/**
 * Set up an invisible reCAPTCHA verifier on a given DOM element.
 * Must be called before signInWithPhoneNumber.
 */
let recaptchaVerifierInstance = null;

export function setupRecaptcha(elementId = "recaptcha-container") {
  const auth = getFirebaseAuth();
  // Clear existing verifier if any
  if (recaptchaVerifierInstance) {
    try { recaptchaVerifierInstance.clear(); } catch { /* ignore */ }
  }
  recaptchaVerifierInstance = new RecaptchaVerifier(auth, elementId, {
    size: "invisible",
    callback: () => { /* reCAPTCHA solved */ },
  });
  return recaptchaVerifierInstance;
}

/**
 * Send OTP to phone number. Returns confirmationResult.
 */
export async function sendPhoneOTP(phoneNumber) {
  const auth = getFirebaseAuth();
  const recaptchaVerifier = setupRecaptcha();
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  return confirmationResult;
}
