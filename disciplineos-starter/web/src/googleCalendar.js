const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
let tokenClient;
let accessToken = null;
let scriptPromise;

export const googleCalendarConfigured = Boolean(CLIENT_ID);

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function hasGoogleCalendarConnection() {
  return Boolean(accessToken);
}

export function disconnectGoogleCalendar() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
}

export async function connectGoogleCalendar() {
  if (!CLIENT_ID) {
    throw new Error("Add VITE_GOOGLE_CLIENT_ID to web/.env and restart the web app.");
  }
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
      error_callback: (error) => reject(new Error(error.message || "Google sign-in was closed.")),
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function calendarRequest(path, options = {}) {
  if (!accessToken) throw new Error("Connect Google Calendar first.");
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) accessToken = null;
    throw new Error(body.error?.message || `Google Calendar request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function eventDate(event) {
  if (event.start?.date) return event.start.date;
  if (!event.start?.dateTime) return null;
  const date = new Date(event.start.dateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchGoogleEvents(startDate, endDate) {
  const query = new URLSearchParams({
    timeMin: new Date(`${startDate}T00:00:00`).toISOString(),
    timeMax: new Date(`${endDate}T00:00:00`).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const events = [];
  let pageToken;
  do {
    if (pageToken) query.set("pageToken", pageToken);
    const result = await calendarRequest(`/calendars/primary/events?${query}`);
    events.push(...(result.items ?? []));
    pageToken = result.nextPageToken;
  } while (pageToken);

  return events
    .filter((event) => event.status !== "cancelled" && eventDate(event))
    .map((event) => ({
      id: event.id,
      title: event.summary || "Untitled event",
      date: eventDate(event),
      dimension: event.extendedProperties?.private?.disciplineOsDimension || null,
      disciplineOsActivityId: event.extendedProperties?.private?.disciplineOsActivityId || null,
      htmlLink: event.htmlLink,
      source: "google",
      startTime: event.start?.dateTime || null,
    }));
}

export async function createGoogleActivityEvent(activity) {
  const startDate = new Date(`${activity.date}T12:00:00`);
  startDate.setDate(startDate.getDate() + 1);
  const endDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  return calendarRequest("/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify({
      summary: activity.title,
      description: `DisciplineOS activity\nWellness dimension: ${activity.dimension}\nActivity ID: ${activity.id}`,
      start: { date: activity.date },
      end: { date: endDate },
      extendedProperties: { private: { disciplineOsActivityId: activity.id, disciplineOsDimension: activity.dimension } },
    }),
  });
}

export async function syncGoogleActivities(activities) {
  const confirmed = activities.filter((activity) => activity.status === "confirmed");
  if (!confirmed.length) return [];
  const dates = confirmed.map((activity) => activity.date).sort();
  const rangeStart = new Date(`${dates[0]}T00:00:00`);
  rangeStart.setDate(rangeStart.getDate() - 1);
  const rangeEnd = new Date(`${dates[dates.length - 1]}T00:00:00`);
  rangeEnd.setDate(rangeEnd.getDate() + 2);
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const existing = await fetchGoogleEvents(format(rangeStart), format(rangeEnd));
  const syncedIds = new Set(existing.map((event) => event.disciplineOsActivityId).filter(Boolean));
  for (const activity of confirmed) {
    if (!syncedIds.has(activity.id)) await createGoogleActivityEvent(activity);
  }
  return fetchGoogleEvents(format(rangeStart), format(rangeEnd));
}