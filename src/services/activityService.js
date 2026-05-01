import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const ensureDbReady = () => {
  if (!db) {
    throw new Error("Firestore is not configured. Check your Firebase setup.");
  }
};

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  return null;
};

const normalizeActivity = (doc) => {
  const data = doc.data();

  return {
    id: doc.id,
    ...data,
    startedAt: toMillis(data.startedAt),
    endedAt: toMillis(data.endedAt),
    createdAt: toMillis(data.createdAt),
  };
};

export const saveActivity = async (userId, activityData) => {
  ensureDbReady();

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  const activitiesRef = collection(db, "users", userId, "activities");
  const docRef = await addDoc(activitiesRef, {
    ...activityData,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
};

export const getUserActivities = async (userId) => {
  ensureDbReady();

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  const activitiesRef = collection(db, "users", userId, "activities");
  const q = query(activitiesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(normalizeActivity);
};
