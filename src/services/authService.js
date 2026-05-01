import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../config/firebase";

/**
 * Helper to format Firebase error messages
 */
const formatError = (error) => {
  // Preserve direct custom errors (no Firebase error code).
  if (!error?.code && error?.message) {
    return error.message;
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "Email is already in use.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Authentication.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Please check EXPO_PUBLIC_FIREBASE_API_KEY.";
    case "auth/app-not-authorized":
      return "Firebase app is not authorized. Check Firebase project config keys.";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not configured. Enable Email/Password sign-in.";
    default:
      if (error?.message) {
        return `Signup/Login error: ${error.message}`;
      }
      return "Something went wrong. Please try again.";
  }
};

const ensureAuthReady = () => {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* keys in .env."
    );
  }
};

const validateCredentials = (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
};

/**
 * Create a new user account
 */
export const signup = async (email, password) => {
  try {
    ensureAuthReady();
    validateCredentials(email, password);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return { user: userCredential.user };
  } catch (error) {
    throw new Error(formatError(error));
  }
};

/**
 * Log in user
 */
export const login = async (email, password) => {
  try {
    ensureAuthReady();
    validateCredentials(email, password);

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return { user: userCredential.user };
  } catch (error) {
    throw new Error(formatError(error));
  }
};

/**
 * Log out user
 */
export const logout = async () => {
  try {
    ensureAuthReady();
    await signOut(auth);
    return true;
  } catch (_error) {
    throw new Error("Failed to log out. Try again.");
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    ensureAuthReady();

    if (!email) {
      throw new Error("Email is required.");
    }

    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (error) {
    throw new Error(formatError(error));
  }
};
