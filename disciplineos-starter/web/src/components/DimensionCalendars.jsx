import { useEffect, useMemo, useState } from "react";
import { confirmActivity, watchActivities } from "../firebase.js";
import { DIMENSIONS, localDateKey } from "../activityRules.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthDays(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days = Array(offset).fill(null);
  for (let day = 1; day <= count; day += 1) days.push(new Date(year, month, day));
  while (days.length % 7) days.push(null);
  return days;
}

function formatDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DimensionCalendars() {
  const [dimensionKey, setDimensionKey] = useState(DIMENSIONS[0].key);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()));
  const [activities, setActivities] = useState({});

  useEffect(() => watchActivities((value) => setActivities(value ?? {})), []);

  const dimension = DIMENSIONS.find((item) => item.key === dimensionKey);
  const monthActivities = useMemo(
    () => Object.values(activities)
      .filter((activity) => activity.dimension === dimensionKey && activity.date.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`))
      .sort((left, right) => left.date.localeCompare(right.date)),
    [activities, dimensionKey, month]
  );
  const dayActivities = monthActivities.filter((activity) => activity.date === selectedDate);
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = localDateKey(new Date());

  function moveMonth(amount) {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelectedDate(localDateKey(next));
  }

  return (
    <section className="dimension-calendar-screen">
      <header className="screen-heading">
        <p className="eyebrow">Plan with intention</p>
        <h1>Dimension calendars</h1>
        <p className="muted">Activities are suggested to a wellness area, then confirmed here before joining your main calendar.</p>
      </header>

      <div className="dimension-overview-grid">
        {DIMENSIONS.map((item) => {
          const count = Object.values(activities).filter((activity) => activity.dimension === item.key).length;
          return (
            <button
              key={item.key}
              type="button"
              className={`dimension-overview${dimensionKey === item.key ? " is-active" : ""}`}
              style={{ "--dimension-color": item.color }}
              aria-pressed={dimensionKey === item.key}
              onClick={() => setDimensionKey(item.key)}
            >
              <span className="dimension-dot" />
              <span>{item.label}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </div>

      <div className="dimension-calendar-layout">
        <section className="panel dimension-month-panel" style={{ "--dimension-color": dimension.color }}>
          <div className="calendar-heading">
            <div>
              <p className="eyebrow">{dimension.label}</p>
              <h2>Activity calendar</h2>
            </div>
          </div>
          <div className="calendar-controls">
            <button type="button" className="calendar-arrow" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
            <h3>{monthLabel}</h3>
            <button type="button" className="calendar-arrow" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
          </div>
          <div className="calendar-grid" role="grid" aria-label={`${dimension.label} ${monthLabel}`}>
            {WEEKDAYS.map((weekday) => <div key={weekday} className="calendar-weekday">{weekday}</div>)}
            {buildMonthDays(month.getFullYear(), month.getMonth()).map((date, index) => {
              if (!date) return <span key={`empty-${index}`} className="calendar-empty" />;
              const key = localDateKey(date);
              const hasActivity = monthActivities.some((activity) => activity.date === key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`calendar-day${selectedDate === key ? " is-selected" : ""}${key === today ? " is-today" : ""}`}
                  style={{ "--dimension-color": dimension.color }}
                  aria-pressed={selectedDate === key}
                  aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${hasActivity ? ", has activities" : ""}`}
                  onClick={() => setSelectedDate(key)}
                >
                  {date.getDate()}
                  {hasActivity && <span className="calendar-day-mark" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel dimension-day-panel">
          <div className="calendar-heading">
            <div>
              <p className="eyebrow">Selected day</p>
              <h2>{formatDate(selectedDate)}</h2>
            </div>
            <span className="calendar-month-count">{dayActivities.length} activities</span>
          </div>
          {dayActivities.length === 0 ? (
            <div className="calendar-empty-state">
              <span className="empty-mark" aria-hidden="true">＋</span>
              <div><strong>No activities for this day</strong><p>Add an activity from Home to place it here.</p></div>
            </div>
          ) : (
            <div className="dimension-activity-list">
              {dayActivities.map((activity) => (
                <article className="dimension-activity" key={activity.id}>
                  <span className="activity-accent" style={{ background: dimension.color }} />
                  <div className="confirmed-activity-copy">
                    <strong>{activity.title}</strong>
                    <span>{activity.status === "confirmed" ? "Confirmed for main calendar" : "Pending confirmation"}</span>
                  </div>
                  {activity.status !== "confirmed" ? (
                    <button className="primary confirm-activity" type="button" onClick={() => confirmActivity(activity.id)}>Confirm</button>
                  ) : <span className="confirmed-check" aria-label="Confirmed">✓</span>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}