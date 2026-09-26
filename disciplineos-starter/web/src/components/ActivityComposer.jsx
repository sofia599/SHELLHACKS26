import { useEffect, useState } from "react";
import { addActivity, watchActivities } from "../firebase.js";
import { DIMENSIONS, localDateKey, suggestDimension } from "../activityRules.js";
import { recommendDimension } from "../wellnessModel.js";

export default function ActivityComposer({ scores = {}, priorities = {} }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateKey(new Date()));
  const [dimension, setDimension] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activities, setActivities] = useState({});
  const [conflict, setConflict] = useState(null);
  const suggestion = suggestDimension(title);

  useEffect(() => watchActivities((value) => setActivities(value ?? {})), []);

  useEffect(() => {
    setDimension(suggestion);
  }, [suggestion]);

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || !dimension) return;
    const overlaps = Object.values(activities).filter((activity) => activity.date === date && activity.dimension !== dimension && activity.status !== "cancelled");
    if (overlaps.length) {
      const candidates = [...new Set([dimension, ...overlaps.map((activity) => activity.dimension)])];
      setConflict({ candidates, overlaps });
      return;
    }
    await addInDimension(dimension);
  }

  async function addInDimension(targetDimension) {
    await addActivity({
      title: title.trim(),
      date,
      dimension: targetDimension,
      status: "pending",
      createdAt: Date.now(),
    });
    setTitle("");
    setDimension(null);
    setConflict(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  const recommended = conflict ? recommendDimension(scores, priorities, conflict.candidates) : null;

  return (
    <section className="activity-composer panel">
      <div className="activity-composer-heading">
        <h2>Add an activity</h2>
        <span className="activity-kicker">SMART ROUTING</span>
      </div>
      <form onSubmit={submit}>
        <div className="activity-quick-row">
          <input
            id="activity-title"
            type="text"
            aria-label="Activity"
            placeholder="What are you planning?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
          />
          <input aria-label="Activity date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="activity-classification" aria-live="polite">
          <span className="dimension-dot" style={{ "--dimension-color": DIMENSIONS.find((item) => item.key === dimension)?.color || "var(--accent)" }} />
          <strong>{dimension ? DIMENSIONS.find((item) => item.key === dimension)?.label : "Choose a dimension"}</strong>
          <span className="muted">{suggestion ? "Suggested" : "Not sure? Pick one"}</span>
        </div>
        <div className="dimension-chips" aria-label="Adjust suggested dimension">
          {DIMENSIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`dimension-chip${dimension === item.key ? " is-active" : ""}`}
              style={{ "--dimension-color": item.color }}
              aria-pressed={dimension === item.key}
              onClick={() => setDimension(item.key)}
            >
              <span className="dimension-dot" />{item.label}
            </button>
          ))}
        </div>
        <div className="activity-submit-row">
          <span className="muted">Pending review</span>
          <button className="primary" type="submit" disabled={!title.trim() || !dimension} aria-label="Add activity to calendar">
            {saved ? "Added" : "Add to calendar"}
          </button>
        </div>
      </form>
      {conflict && (
        <div className="conflict-backdrop" role="presentation">
          <section className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
            <p className="eyebrow">SCHEDULE OVERLAP</p>
            <h2 id="conflict-title">You already have a plan on this day.</h2>
            <p className="muted">Your current wellbeing and pinned priorities suggest focusing on <strong>{DIMENSIONS.find((item) => item.key === recommended)?.label}</strong>.</p>
            <div className="conflict-existing-list">
              {conflict.overlaps.map((activity) => <span key={activity.id}>{activity.title} · {DIMENSIONS.find((item) => item.key === activity.dimension)?.label}</span>)}
            </div>
            <div className="conflict-actions">
              <button type="button" onClick={() => setConflict(null)}>Cancel</button>
              {recommended !== dimension && <button className="primary" type="button" onClick={() => addInDimension(recommended)}>Use suggestion</button>}
              <button type="button" onClick={() => addInDimension(dimension)}>Keep {DIMENSIONS.find((item) => item.key === dimension)?.label}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}