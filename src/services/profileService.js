import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const ensureDbReady = () => {
  if (!db) {
    throw new Error("Firestore is not configured. Check your Firebase setup.");
  }
};

const sanitizeNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeProfile = (data = {}) => ({
  name: data.name || "",
  age: data.age ?? null,
  weight: data.weight ?? null,
  height: data.height ?? null,
  maxHR: data.maxHR ?? null,
  goalPace: data.goalPace || "",
  goal: data.goal || "",
  avatarId: data.avatarId || "avatar_1",
});

export const getUserProfile = async (userId) => {
  ensureDbReady();

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  const profileRef = doc(db, "users", userId);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    return normalizeProfile();
  }

  return normalizeProfile(snapshot.data());
};

export const saveUserProfile = async (userId, profile) => {
  ensureDbReady();

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  const payload = {
    name: (profile.name || "").trim(),
    age: sanitizeNumber(profile.age),
    weight: sanitizeNumber(profile.weight),
    height: sanitizeNumber(profile.height),
    maxHR: sanitizeNumber(profile.maxHR),
    goalPace: (profile.goalPace || "").trim(),
    goal: (profile.goal || "").trim(),
    avatarId: profile.avatarId || "avatar_1",
    updatedAt: serverTimestamp(),
  };

  const profileRef = doc(db, "users", userId);
  await setDoc(profileRef, payload, { merge: true });

  return normalizeProfile(payload);
};
