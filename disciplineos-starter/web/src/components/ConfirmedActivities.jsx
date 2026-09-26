import { useEffect, useMemo, useState } from "react";
import { recordActivityOutcome, watchActivities } from "../firebase.js";
import { DIMENSIONS, localDateKey } from "../activityRules.js";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  fetchGoogleEvents,
  googleCalendarConfigured,
  hasGoogleCalendarConnection,
  syncGoogleActivities,
} from "../googleCalendar.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthDays(year, month) {
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days = Array(firstDay).fill(null);
  for (let day = 1; day <= count; day += 1) days.push(new Date(year, month, day));
  while (days.length % 7) days.push(null);
  return days;
}

function shiftDate(date, amount) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return localDateKey(next);
}

export default function ConfirmedActivities() {
  const [activities, setActivities] = useState({});
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()));
  const [googleEvents, setGoogleEvents] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(hasGoogleCalendarConnection());
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [outcomeNotice, setOutcomeNotice] = useState("");

  useEffect(() => watchActivities((value) => setActivities(value ?? {})), []);

  const confirmed = useMemo(() => Object.values(activities)
    .filter((activity) => activity.status === "confirmed")
    .sort((left, right) => left.date.localeCompare(right.date)), [activities]);
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const localMonthEvents = confirmed.filter((activity) => activity.date.startsWith(monthPrefix));

  useEffect(() => {
    if (!googleConnected) return undefined;
    let cancelled = false;
    const year = month.getFullYear();
    const monthNumber = String(month.getMonth() + 1).padStart(2, "0");
    const start = `${year}-${monthNumber}-01`;
    const end = localDateKey(new Date(year, month.getMonth() + 1, 1));
    setGoogleBusy(true);
    Promise.all([
      fetchGoogleEvents(start, end),
      syncGoogleActivities(confirmed.filter((activity) => activity.date.startsWith(monthPrefix))),
    ])
      .then(([events]) => {
        if (!cancelled) setGoogleEvents(events);
      })
      .catch((error) => {
        if (!cancelled) setGoogleError(error.message);
      })
      .finally(() => {
        if (!cancelled) setGoogleBusy(false);
      });
    return () => { cancelled = true; };
  }, [googleConnected, month, monthPrefix, confirmed]);

  const externalMonthEvents = googleEvents.filter((event) => !confirmed.some((activity) => activity.id === event.disciplineOsActivityId));
  const allMonthEvents = [...localMonthEvents, ...externalMonthEvents];
  const dayEvents = allMonthEvents.filter((event) => event.date === selectedDate);
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = localDateKey(new Date());

  function moveMonth(amount) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(nextMonth);
    setSelectedDate(localDateKey(nextMonth));
  }

  async function connect() {
    setGoogleError("");
    setGoogleBusy(true);
    try {
      await connectGoogleCalendar();
      setGoogleConnected(true);
    } catch (error) {
      setGoogleError(error.message);
    } finally {
      setGoogleBusy(false);
    }
  }

  function disconnect() {
    disconnectGoogleCalendar();
    setGoogleConnected(false);
    setGoogleEvents([]);
    setGoogleError("");
  }

  async function saveOutcome(activity, outcome) {
    const result = await recordActivityOutcome(activity.id, outcome);
    setOutcomeNotice(result.committed
      ? `${activity.dimension} ${outcome === "completed" ? "+4" : "−3"} · score ${result.score}`
      : "Outcome already recorded.");
  }

  return (
    <section className="confirmed-calendar panel">
      <div className="calendar-heading main-calendar-heading">
        <div>
          <p className="eyebrow">Your week at a glance</p>
          <h2>Main calendar</h2>
        </div>
        <div className="google-calendar-actions">
          {googleConnected ? (
            <button type="button" className="google-connect is-connected" onClick={disconnect}>Google connected · Disconnect</button>
          ) : (
            <button type="button" className="google-connect" disabled={!googleCalendarConfigured || googleBusy} onClick={connect}>
              {googleBusy ? "Connecting…" : "Connect Google Calendar"}
            </button>
          )}
          <span className="calendar-month-count">{localMonthEvents.length + externalMonthEvents.length} events</span>
        </div>
      </div>
      {!googleCalendarConfigured && !googleConnected && (
        <p className="google-calendar-note">Google Calendar isn’t configured for this app.</p>
      )}
      {googleError && <p className="google-calendar-error" role="alert">{googleError}</p>}

      <div className="calendar-controls main-month-controls">
        <button type="button" className="calendar-arrow" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
        <h3>{monthLabel}</h3>
        <button type="button" className="calendar-arrow" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
      </div>
      <div className="calendar-grid main-calendar-grid" role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((weekday) => <div key={weekday} className="calendar-weekday">{weekday}</div>)}
        {monthDays(month.getFullYear(), month.getMonth()).map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="calendar-empty" />;
          const key = localDateKey(date);
          const events = allMonthEvents.filter((event) => event.date === key);
          return (
            <button
              key={key}
              type="button"
              className={`calendar-day main-calendar-day${selectedDate === key ? " is-selected" : ""}${key === today ? " is-today" : ""}`}
              aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${events.length ? `, ${events.length} events` : ""}`}
              aria-pressed={selectedDate === key}
              onClick={() => setSelectedDate(key)}
            >
              <span>{date.getDate()}</span>
              {!!events.length && <span className="calendar-event-dots">{events.slice(0, 3).map((event) => {
                const dimension = DIMENSIONS.find((item) => item.key === event.dimension);
                return <i key={event.id} style={{ background: dimension?.color || "#4285f4" }} />;
              })}</span>}
            </button>
          );
        })}
      </div>

      <div className="main-calendar-agenda">
        <div className="agenda-date-heading">
          <strong>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</strong>
          <span>{dayEvents.length} events{googleBusy ? " · syncing" : ""}</span>
        </div>
        {dayEvents.length === 0 ? (
          <p className="agenda-empty">No events on this day.</p>
        ) : dayEvents.map((event) => {
          const dimension = DIMENSIONS.find((item) => item.key === event.dimension);
          const localActivity = event.source !== "google" && event.id && activities[event.id];
          return (
            <article className="confirmed-activity" key={`${event.source || "local"}-${event.id}`}>
              <span className="activity-accent" style={{ background: dimension?.color || "#4285f4" }} />
              <div className="confirmed-activity-copy">
                <strong>{event.title}</strong>
                <span>{localActivity?.outcome ? `${localActivity.outcome.status === "completed" ? "Completed" : "Not completed"} · ${localActivity.outcome.delta > 0 ? "+" : ""}${localActivity.outcome.delta} points` : event.source === "google" ? "Google Calendar" : dimension?.label || "Confirmed activity"}{event.startTime ? ` · ${new Date(event.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</span>
              </div>
              {event.htmlLink && <a className="calendar-open-link" href={event.htmlLink} target="_blank" rel="noreferrer" aria-label={`Open ${event.title} in Google Calendar`}>↗</a>}
              {localActivity && !localActivity.outcome && selectedDate <= today && (
                <div className="outcome-actions">
                  <button className="outcome-complete" type="button" onClick={() => saveOutcome(localActivity, "completed")}>Done +4</button>
                  <button className="outcome-missed" type="button" onClick={() => saveOutcome(localActivity, "missed")}>Missed −3</button>
                </div>
              )}
            </article>
          );
        })}
        {outcomeNotice && <p className="outcome-notice" role="status">{outcomeNotice}</p>}
      </div>
    </section>
  );
}