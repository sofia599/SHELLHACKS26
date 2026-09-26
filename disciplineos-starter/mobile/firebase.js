import { getApps, initializeApp } from 'firebase/app';
import { getDatabase, onValue, push, ref, set, update } from 'firebase/database';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const configured = Boolean(config.apiKey && config.databaseURL && config.projectId && config.appId);
const app = configured ? (getApps()[0] ?? initializeApp(config)) : null;
const database = app ? getDatabase(app) : null;
const userId = process.env.EXPO_PUBLIC_DEMO_USER_ID || 'demo-user';

const demoData = { dimensions: null, wellnessCalendar: {}, activities: {} };
const listeners = {
  dimensions: new Set(),
  wellnessCalendar: new Set(),
  activities: new Set(),
};

function watchDemo(key, callback, fallback) {
  listeners[key].add(callback);
  callback(demoData[key] ?? fallback);
  return () => listeners[key].delete(callback);
}

export function watchDimensions(callback) {
  if (!database) return watchDemo('dimensions', callback, null);
  return onValue(ref(database, `users/${userId}/dimensions`), (snapshot) => callback(snapshot.val()));
}

export function setDimensionScore(key, value) {
  if (!database) {
    demoData.dimensions = { ...(demoData.dimensions ?? {}), [key]: value };
    listeners.dimensions.forEach((callback) => callback(demoData.dimensions));
    return Promise.resolve();
  }
  return update(ref(database, `users/${userId}/dimensions`), { [key]: value });
}

export function watchWellnessCalendar(callback) {
  if (!database) return watchDemo('wellnessCalendar', callback, {});
  return onValue(ref(database, `users/${userId}/wellnessCalendar`), (snapshot) => callback(snapshot.val() ?? {}));
}

export function setWellnessCalendarScore(dimension, date, score) {
  if (!database) {
    demoData.wellnessCalendar = {
      ...demoData.wellnessCalendar,
      [dimension]: { ...(demoData.wellnessCalendar[dimension] ?? {}), [date]: score },
    };
    listeners.wellnessCalendar.forEach((callback) => callback(demoData.wellnessCalendar));
    return Promise.resolve();
  }
  return set(ref(database, `users/${userId}/wellnessCalendar/${dimension}/${date}`), score);
}

export function setStatus(status) {
  if (!database) return Promise.resolve(status);
  return set(ref(database, `users/${userId}/status`), status);
}

export function logSession(session) {
  if (!database) return Promise.resolve(session);
  return push(ref(database, `users/${userId}/sessions`), session);
}

export function logJournalEntry(entry) {
  if (!database) return Promise.resolve(entry);
  return push(ref(database, `users/${userId}/journal`), entry);
}

export function watchActivities(callback) {
  if (!database) return watchDemo('activities', callback, {});
  return onValue(ref(database, `users/${userId}/activities`), (snapshot) => callback(snapshot.val() ?? {}));
}

export function addActivity(activity) {
  if (!database) {
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    demoData.activities = { ...demoData.activities, [id]: { ...activity, id } };
    listeners.activities.forEach((callback) => callback(demoData.activities));
    return Promise.resolve(id);
  }
  const activityRef = push(ref(database, `users/${userId}/activities`));
  return set(activityRef, { ...activity, id: activityRef.key }).then(() => activityRef.key);
}

export function confirmActivity(id) {
  if (!database) {
    demoData.activities = {
      ...demoData.activities,
      [id]: { ...demoData.activities[id], status: 'confirmed' },
    };
    listeners.activities.forEach((callback) => callback(demoData.activities));
    return Promise.resolve();
  }
  return update(ref(database, `users/${userId}/activities/${id}`), { status: 'confirmed' });
}