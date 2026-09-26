import { useEffect, useState } from "react";
import { addActivity } from "../firebase.js";
import { DIMENSIONS, localDateKey, suggestDimension } from "../activityRules.js";

export default function ActivityComposer() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateKey(new Date()));
  const [dimension, setDimension] = useState(null);
  const [saved, setSaved] = useState(false);
  const suggestion = suggestDimension(title);

  useEffect(() => {
    setDimension(suggestion);
  }, [suggestion]);

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || !dimension) return;
    await addActivity({
      title: title.trim(),
      date,
      dimension,
      status: "pending",
      createdAt: Date.now(),
    });
    setTitle("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

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
    </section>
  );
}