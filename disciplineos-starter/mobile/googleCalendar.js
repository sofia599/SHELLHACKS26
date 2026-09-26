function getEventDate(event) {
  if (event.start?.date) return event.start.date;
  if (!event.start?.dateTime) return null;
  const date = new Date(event.start.dateTime);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function calendarRequest(accessToken, path, options = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `Google Calendar request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

export async function fetchGoogleEvents(accessToken, startDate, endDate) {
  const query = new URLSearchParams({
    timeMin: new Date(`${startDate}T00:00:00`).toISOString(),
    timeMax: new Date(`${endDate}T00:00:00`).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const result = await calendarRequest(accessToken, `/calendars/primary/events?${query}`);
  return (result.items ?? [])
    .filter((event) => event.status !== 'cancelled' && getEventDate(event))
    .map((event) => ({
      id: event.id,
      title: event.summary || 'Untitled event',
      date: getEventDate(event),
      dimension: event.extendedProperties?.private?.disciplineOsDimension || null,
      disciplineOsActivityId: event.extendedProperties?.private?.disciplineOsActivityId || null,
      source: 'google',
      htmlLink: event.htmlLink,
      startTime: event.start?.dateTime || null,
    }));
}

export function createGoogleActivityEvent(accessToken, activity) {
  const nextDay = new Date(`${activity.date}T12:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
  return calendarRequest(accessToken, '/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify({
      summary: activity.title,
      description: `DisciplineOS activity\nWellness dimension: ${activity.dimension}\nActivity ID: ${activity.id}`,
      start: { date: activity.date },
      end: { date: endDate },
      extendedProperties: { private: { disciplineOsActivityId: activity.id, disciplineOsDimension: activity.dimension } },
    }),
  });
}

export async function syncGoogleActivities(accessToken, activities) {
  const confirmed = activities.filter((activity) => activity.status === 'confirmed');
  if (!confirmed.length) return [];
  const dates = confirmed.map((activity) => activity.date).sort();
  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00`);
  start.setDate(start.getDate() - 1);
  end.setDate(end.getDate() + 2);
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const existing = await fetchGoogleEvents(accessToken, format(start), format(end));
  const synced = new Set(existing.map((event) => event.disciplineOsActivityId).filter(Boolean));
  for (const activity of confirmed) {
    if (!synced.has(activity.id)) await createGoogleActivityEvent(accessToken, activity);
  }
  return fetchGoogleEvents(accessToken, format(start), format(end));
}