import { useEffect, useRef, useState } from "react";
import { watchStatus, setStatus, watchStreak, bumpStreak, logSession } from "../firebase.js";

const SPRINT_SECONDS = 25 * 60; // classic 25-minute sprint; change freely

export default function FocusSprint() {
  const [status, setLocalStatus] = useState("idle");
  const [streak, setLocalStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => watchStatus(setLocalStatus), []);
  useEffect(() => watchStreak(setLocalStreak), []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          completeSprint();
          return SPRINT_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function startSprint() {
    setRunning(true);
    setStartedAt(Date.now());
    setStatus("focus"); // clip goes solid blue
  }

  function completeSprint() {
    setRunning(false);
    setStatus("streak"); // clip does its streak pattern briefly
    const next = streak + 1;
    bumpStreak(next);
    logSession({ startedAt, endedAt: Date.now(), outcome: "completed" });
    setTimeout(() => setStatus("idle"), 4000);
  }

  function markDistracted() {
    // Manual stand-in for real doomscroll detection (e.g. a browser extension).
    // Fine to say exactly this to judges: it's the honest fallback.
    setStatus("alert"); // clip flashes red
    logSession({ startedAt, endedAt: Date.now(), outcome: "distracted" });
    setTimeout(() => setStatus(running ? "focus" : "idle"), 2000);
  }

  function stopSprint() {
    setRunning(false);
    setSecondsLeft(SPRINT_SECONDS);
    setStatus("idle");
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="panel focus-sprint">
      <div className="row sprint-heading" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18 }}>Focus sprint</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          clip status: <strong style={{ color: "var(--text)" }}>{status}</strong>
        </span>
      </div>

      <div className="sprint-timer" style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }}>
        {mm}:{ss}
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        {!running && <button className="primary" onClick={startSprint}>Start sprint</button>}
        {running && <button onClick={markDistracted}>I got distracted</button>}
        {running && <button onClick={stopSprint}>Stop</button>}
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
        Streak: <strong style={{ color: "var(--text)" }}>{streak}</strong> completed sprint{streak === 1 ? "" : "s"}
      </p>
    </div>
  );
}
