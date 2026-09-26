import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, push } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.databaseURL &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

export const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getDatabase(app) : null;

const demoData = { status: "idle", dimensions: null, streak: 0, wellnessCalendar: {} };
const demoListeners = {
  status: new Set(),
  dimensions: new Set(),
  streak: new Set(),
  wellnessCalendar: new Set(),
};

function watchDemoValue(key, callback) {
  demoListeners[key].add(callback);
  callback(demoData[key]);
  return () => demoListeners[key].delete(callback);
}

function setDemoValue(key, value) {
  demoData[key] = value;
  demoListeners[key].forEach((callback) => callback(value));
  return Promise.resolve();
}

// Swap this for the real Firebase Auth uid once you wire up auth.
export const USER_ID = import.meta.env.VITE_DEMO_USER_ID || "demo-user";

// ---- Realtime DB shape used by this starter ----
// users/{uid}/status            -> "idle" | "focus" | "break" | "alert" | "streak"  (read by the ESP32 clip)
// users/{uid}/dimensions        -> { physical, emotional, social, financial, intellectual, occupational } (0-100)
// users/{uid}/streak            -> number of completed sprints in a row
// users/{uid}/journal/{pushId}  -> { text, createdAt, mood }
// users/{uid}/sessions/{pushId} -> { startedAt, endedAt, outcome: "completed" | "distracted" }

export function watchStatus(cb) {
  if (!db) return watchDemoValue("status", (value) => cb(value ?? "idle"));
  return onValue(ref(db, `users/${USER_ID}/status`), (snap) => cb(snap.val() ?? "idle"));
}

export function setStatus(status) {
  if (!db) return setDemoValue("status", status);
  return set(ref(db, `users/${USER_ID}/status`), status);
}

export function watchDimensions(cb) {
  if (!db) return watchDemoValue("dimensions", cb);
  return onValue(ref(db, `users/${USER_ID}/dimensions`), (snap) => cb(snap.val() ?? null));
}

export function setDimensionScore(key, value) {
  if (!db) {
    demoData.dimensions = { ...(demoData.dimensions ?? {}), [key]: value };
    demoListeners.dimensions.forEach((callback) => callback(demoData.dimensions));
    return Promise.resolve();
  }
  return update(ref(db, `users/${USER_ID}/dimensions`), { [key]: value });
}

export function watchStreak(cb) {
  if (!db) return watchDemoValue("streak", (value) => cb(value ?? 0));
  return onValue(ref(db, `users/${USER_ID}/streak`), (snap) => cb(snap.val() ?? 0));
}

export function bumpStreak(newValue) {
  if (!db) return setDemoValue("streak", newValue);
  return set(ref(db, `users/${USER_ID}/streak`), newValue);
}

export function logSession(session) {
  if (!db) return Promise.resolve(session);
  return push(ref(db, `users/${USER_ID}/sessions`), session);
}

export function logJournalEntry(entry) {
  if (!db) return Promise.resolve(entry);
  return push(ref(db, `users/${USER_ID}/journal`), entry);
}

export function watchWellnessCalendar(cb) {
  if (!db) return watchDemoValue("wellnessCalendar", cb);
  return onValue(ref(db, `users/${USER_ID}/wellnessCalendar`), (snap) => cb(snap.val() ?? {}));
}

export function setWellnessCalendarScore(dimension, date, score) {
  if (!db) {
    demoData.wellnessCalendar = {
      ...demoData.wellnessCalendar,
      [dimension]: { ...(demoData.wellnessCalendar[dimension] ?? {}), [date]: score },
    };
    demoListeners.wellnessCalendar.forEach((callback) => callback(demoData.wellnessCalendar));
    return Promise.resolve();
  }
  return set(ref(db, `users/${USER_ID}/wellnessCalendar/${dimension}/${date}`), score);
}
