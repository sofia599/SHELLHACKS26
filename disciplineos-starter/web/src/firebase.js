import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, push, runTransaction } from "firebase/database";

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

const demoData = { status: "idle", dimensions: null, wellnessCalendar: {}, activities: {}, assessments: {}, priorities: {}, scoreHistory: [] };
const demoListeners = {
  status: new Set(),
  dimensions: new Set(),
  wellnessCalendar: new Set(),
  activities: new Set(),
  assessments: new Set(),
  priorities: new Set(),
  scoreHistory: new Set(),
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

export function watchActivities(cb) {
  if (!db) return watchDemoValue("activities", cb);
  return onValue(ref(db, `users/${USER_ID}/activities`), (snap) => cb(snap.val() ?? {}));
}

export function addActivity(activity) {
  if (!db) {
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    demoData.activities = { ...demoData.activities, [id]: { ...activity, id } };
    demoListeners.activities.forEach((callback) => callback(demoData.activities));
    return Promise.resolve(id);
  }
  const activityRef = push(ref(db, `users/${USER_ID}/activities`));
  return set(activityRef, { ...activity, id: activityRef.key }).then(() => activityRef.key);
}

export function confirmActivity(id) {
  if (!db) {
    demoData.activities = {
      ...demoData.activities,
      [id]: { ...demoData.activities[id], status: "confirmed" },
    };
    demoListeners.activities.forEach((callback) => callback(demoData.activities));
    return Promise.resolve();
  }
  return update(ref(db, `users/${USER_ID}/activities/${id}`), { status: "confirmed" });
}

export function watchAssessments(cb) {
  if (!db) return watchDemoValue("assessments", cb);
  return onValue(ref(db, `users/${USER_ID}/assessments`), (snap) => cb(snap.val() ?? {}));
}

export function saveDimensionAssessment(dimension, answers, score, previousScore = 50) {
  const assessment = { answers, score, completedAt: Date.now() };
  if (!db) {
    const oldScore = Number(demoData.dimensions?.[dimension] ?? previousScore);
    demoData.assessments = { ...demoData.assessments, [dimension]: assessment };
    demoData.dimensions = { ...(demoData.dimensions ?? {}), [dimension]: score };
    demoData.scoreHistory = [...demoData.scoreHistory, { id: `assessment-${dimension}-${assessment.completedAt}`, dimension, delta: score - oldScore, score, reason: "Wellness assessment", createdAt: assessment.completedAt }];
    demoListeners.assessments.forEach((callback) => callback(demoData.assessments));
    demoListeners.dimensions.forEach((callback) => callback(demoData.dimensions));
    demoListeners.scoreHistory.forEach((callback) => callback(demoData.scoreHistory));
    return Promise.resolve(assessment);
  }
  const historyRef = push(ref(db, `users/${USER_ID}/scoreHistory`));
  return update(ref(db, `users/${USER_ID}`), {
    [`assessments/${dimension}`]: assessment,
    [`dimensions/${dimension}`]: score,
    [`scoreHistory/${historyRef.key}`]: { dimension, delta: score - previousScore, score, reason: "Wellness assessment", createdAt: assessment.completedAt },
  });
}

export function watchDimensionPriorities(cb) {
  if (!db) return watchDemoValue("priorities", cb);
  return onValue(ref(db, `users/${USER_ID}/dimensionPriorities`), (snap) => cb(snap.val() ?? {}));
}

export function setDimensionPriority(dimension, prioritized) {
  if (!db) {
    demoData.priorities = { ...demoData.priorities, [dimension]: prioritized };
    demoListeners.priorities.forEach((callback) => callback(demoData.priorities));
    return Promise.resolve();
  }
  return set(ref(db, `users/${USER_ID}/dimensionPriorities/${dimension}`), prioritized);
}

export function watchScoreHistory(cb) {
  if (!db) return watchDemoValue("scoreHistory", cb);
  return onValue(ref(db, `users/${USER_ID}/scoreHistory`), (snap) => cb(snap.val() ?? {}));
}

export async function recordActivityOutcome(id, outcome) {
  const completed = outcome === "completed";
  const delta = completed ? 4 : -3;
  const now = Date.now();
  if (!db) {
    const activity = demoData.activities[id];
    if (!activity || activity.outcome) return { committed: false };
    const previousScore = Number(demoData.dimensions?.[activity.dimension] ?? 50);
    const score = Math.max(0, Math.min(100, previousScore + delta));
    const result = { status: outcome, delta, recordedAt: now };
    demoData.activities = { ...demoData.activities, [id]: { ...activity, outcome: result } };
    demoData.dimensions = { ...(demoData.dimensions ?? {}), [activity.dimension]: score };
    demoData.scoreHistory = [...demoData.scoreHistory, { id: `activity-${id}`, activityId: id, dimension: activity.dimension, delta, score, reason: `${activity.title}: ${completed ? "completed" : "not completed"}`, createdAt: now }];
    demoListeners.activities.forEach((callback) => callback(demoData.activities));
    demoListeners.dimensions.forEach((callback) => callback(demoData.dimensions));
    demoListeners.scoreHistory.forEach((callback) => callback(demoData.scoreHistory));
    return { committed: true, score, delta };
  }

  const activityResult = await runTransaction(ref(db, `users/${USER_ID}/activities/${id}`), (activity) => {
    if (!activity || activity.outcome) return;
    return { ...activity, outcome: { status: outcome, delta, recordedAt: now } };
  });
  if (!activityResult.committed) return { committed: false };
  const activity = activityResult.snapshot.val();
  const scoreResult = await runTransaction(ref(db, `users/${USER_ID}/dimensions/${activity.dimension}`), (score) =>
    Math.max(0, Math.min(100, Number(score ?? 50) + delta))
  );
  const score = scoreResult.snapshot.val();
  const historyRef = push(ref(db, `users/${USER_ID}/scoreHistory`));
  await set(historyRef, { activityId: id, dimension: activity.dimension, delta, score, reason: `${activity.title}: ${completed ? "completed" : "not completed"}`, createdAt: now });
  return { committed: true, score, delta };
}
