import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { Platform } from "react-native";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config loaded from environment variables.
// Add these keys in your .env file (do not hardcode real values here).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

const app = isFirebaseConfigured
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp()
  : null;

const initializeFirebaseAuth = (firebaseApp) => {
  try {
    // Keep native users signed in across app restarts via AsyncStorage.
    if (Platform.OS === "ios" || Platform.OS === "android") {
      return initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }

    return getAuth(firebaseApp);
  } catch (error) {
    if (error?.code === "auth/already-initialized") {
      return getAuth(firebaseApp);
    }

    throw error;
  }
};

// Initialize Firebase services used in the app.
const auth = app ? initializeFirebaseAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

export { app, auth, db, storage, isFirebaseConfigured };
