import { useEffect, useState } from "react";
import {
  setDimensionScore,
  setWellnessCalendarScore,
  watchDimensions,
  watchWellnessCalendar,
} from "../firebase.js";

const DIMENSIONS = [
  { key: "physical", label: "Physical", color: "var(--physical)" },
  { key: "emotional", label: "Emotional", color: "var(--emotional)" },
  { key: "social", label: "Social", color: "var(--social)" },
  { key: "financial", label: "Financial", color: "var(--financial)" },
  { key: "intellectual", label: "Intellectual", color: "var(--intellectual)" },
  { key: "occupational", label: "Occupational", color: "var(--occupational)" },
];

const DEFAULT_SCORES = {
  physical: 70,
  emotional: 60,
  social: 65,
  financial: 55,
  intellectual: 75,
  occupational: 70,
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthDays(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstWeekday).fill(null);
  for (let day = 1; day <= count; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function WellnessCalendar() {
  const [activeDimension, setActiveDimension] = useState(DIMENSIONS[0].key);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [records, setRecords] = useState({});
  const [currentScores, setCurrentScores] = useState(DEFAULT_SCORES);
  const [draftScore, setDraftScore] = useState(DEFAULT_SCORES.physical);

  useEffect(() => watchWellnessCalendar((value) => setRecords(value ?? {})), []);
  useEffect(
    () => watchDimensions((value) => value && setCurrentScores((scores) => ({ ...scores, ...value }))),
    []
  );

  const activeMeta = DIMENSIONS.find((dimension) => dimension.key === activeDimension);
  const dimensionRecords = records[activeDimension] ?? {};
  const todayKey = dateKey(new Date());

  function chooseDimension(key) {
    setActiveDimension(key);
    setDraftScore(
      records[key]?.[selectedDate] ??
        (selectedDate === todayKey ? currentScores[key] : DEFAULT_SCORES[key])
    );
  }

  function chooseDate(date) {
    const key = dateKey(date);
    setSelectedDate(key);
    setDraftScore(
      dimensionRecords[key] ?? (key === todayKey ? currentScores[activeDimension] : DEFAULT_SCORES[activeDimension])
    );
  }

  function changeMonth(offset) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  async function saveCheckIn() {
    await setWellnessCalendarScore(activeDimension, selectedDate, draftScore);
    if (selectedDate === todayKey) {
      await setDimensionScore(activeDimension, draftScore);
      setCurrentScores((scores) => ({ ...scores, [activeDimension]: draftScore }));
    }
  }

  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="panel wellness-calendar" aria-label="Wellness calendar">
      <div className="calendar-heading">
        <div>
          <p className="eyebrow">Your rhythm</p>
          <h2>Wellness calendar</h2>
        </div>
        <span className="calendar-month-count">{Object.keys(dimensionRecords).length} logged</span>
      </div>

      <div className="dimension-picker" aria-label="Choose wellness dimension">
        {DIMENSIONS.map((dimension) => (
          <button
            key={dimension.key}
            type="button"
            className={`dimension-choice${activeDimension === dimension.key ? " is-active" : ""}`}
            style={{ "--dimension-color": dimension.color }}
            aria-pressed={activeDimension === dimension.key}
            onClick={() => chooseDimension(dimension.key)}
          >
            <span className="dimension-dot" />
            {dimension.label}
          </button>
        ))}
      </div>

      <div className="calendar-controls">
        <button type="button" className="calendar-arrow" aria-label="Previous month" onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <h3>{monthLabel}</h3>
        <button type="button" className="calendar-arrow" aria-label="Next month" onClick={() => changeMonth(1)}>
          ›
        </button>
      </div>

      <div className="calendar-grid" role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="calendar-weekday" role="columnheader">
            {weekday}
          </div>
        ))}
        {monthDays(visibleMonth.getFullYear(), visibleMonth.getMonth()).map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="calendar-empty" aria-hidden="true" />;
          const key = dateKey(date);
          const hasRecord = dimensionRecords[key] !== undefined;
          return (
            <button
              key={key}
              type="button"
              className={`calendar-day${selectedDate === key ? " is-selected" : ""}${key === todayKey ? " is-today" : ""}`}
              style={{ "--dimension-color": activeMeta.color }}
              aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${hasRecord ? `, score ${dimensionRecords[key]}` : ""}`}
              aria-pressed={selectedDate === key}
              onClick={() => chooseDate(date)}
            >
              {date.getDate()}
              {hasRecord && <span className="calendar-day-mark" />}
            </button>
          );
        })}
      </div>

      <div className="checkin-editor">
        <div className="checkin-title">
          <span className="dimension-dot" style={{ "--dimension-color": activeMeta.color }} />
          <div>
            <strong>{activeMeta.label}</strong>
            <span className="muted">{selectedLabel}</span>
          </div>
          {dimensionRecords[selectedDate] !== undefined && (
            <span className="saved-score">{dimensionRecords[selectedDate]}</span>
          )}
        </div>
        <label className="score-control">
          <span>Score <strong>{draftScore}</strong></span>
          <input
            type="range"
            min="0"
            max="100"
            value={draftScore}
            onChange={(event) => setDraftScore(Number(event.target.value))}
            aria-label={`${activeMeta.label} score for ${selectedLabel}`}
          />
        </label>
        <button type="button" className="primary save-checkin" onClick={saveCheckIn}>
          Save check-in
        </button>
      </div>
    </section>
  );
}