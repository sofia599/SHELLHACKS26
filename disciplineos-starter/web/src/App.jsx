import { useEffect, useMemo, useState } from "react";
import ActivityComposer from "./components/ActivityComposer.jsx";
import ConfirmedActivities from "./components/ConfirmedActivities.jsx";
import DimensionsHub from "./components/DimensionsHub.jsx";
import EmailInbox from "./components/EmailInbox.jsx";
import WellnessHexagon from "./components/WellnessHexagon.jsx";
import WellnessMark from "./components/WellnessMark.jsx";
import Journal from "./components/Journal.jsx";
import { watchAssessments, watchDimensionPriorities, watchDimensions, watchScoreHistory } from "./firebase.js";
import { DIMENSIONS } from "./wellnessModel.js";

const DEFAULT_SCORES = DIMENSIONS.map(() => 50);

export default function App() {
  const [screen, setScreen] = useState("home");
  const [appearance, setAppearance] = useState(() => localStorage.getItem("disciplineos-appearance") || "bright");
  const [scores, setScores] = useState(DEFAULT_SCORES);
  const [priorities, setPriorities] = useState({});
  const [scoreHistory, setScoreHistory] = useState([]);
  const [assessments, setAssessments] = useState({});
  const [dimensionsInitialView, setDimensionsInitialView] = useState("calendars");
  const average = useMemo(() => Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length), [scores]);
  const scoreMap = Object.fromEntries(DIMENSIONS.map(({ key }, index) => [key, scores[index]]));

  useEffect(() => watchDimensions((value) => {
    if (!value) return;
    setScores(DIMENSIONS.map(({ key }) => value[key] ?? 50));
  }), []);
  useEffect(() => watchDimensionPriorities(setPriorities), []);
  useEffect(() => watchScoreHistory((history) => setScoreHistory(Object.values(history ?? {}).sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0)))), []);
  useEffect(() => watchAssessments(setAssessments), []);

  function openAssessment() {
    setDimensionsInitialView("assessment");
    setScreen("dimensions");
  }

  useEffect(() => {
    localStorage.setItem("disciplineos-appearance", appearance);
  }, [appearance]);

  return (
    <div className="app-frame" data-theme={appearance}>
      <aside className="desktop-rail">
        <button className="brand-home" type="button" onClick={() => setScreen("home")} aria-label="Go to home">
          <WellnessMark className="brand-mark-icon" size={34} /><span>DisciplineOS</span>
        </button>
        <div className="rail-caption">YOUR SPACE</div>
        <nav className="rail-nav" aria-label="Main navigation">
          <button className={`rail-link${screen === "profile" ? " is-active" : ""}`} onClick={() => setScreen("profile")} type="button">
            <span aria-hidden="true">◉</span> Profile
          </button>
          <button className={`rail-link${screen === "dimensions" ? " is-active" : ""}`} onClick={() => setScreen("dimensions")} type="button">
            <WellnessMark className="rail-dimensions-icon" size={22} /> Dimensions
          </button>
          <button className={`rail-link${screen === "emails" ? " is-active" : ""}`} onClick={() => setScreen("emails")} type="button">
            <span aria-hidden="true">✉</span> Emails
          </button>
        </nav>
        <div className="rail-footer"><span className="rail-avatar">S</span><span><strong>Your account</strong><small>Demo profile</small></span></div>
      </aside>

      <main className="app-main">
        {screen === "home" && (
          <div className="screen-content home-screen">
            <header className="screen-heading home-heading">
              <div><p className="eyebrow">Your daily overview</p><h1>Wellness, in balance.</h1><p className="muted">A little care across every part of your life.</p></div>
              <div className="date-stamp">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
            </header>
            {DIMENSIONS.some(({ key }) => !assessments[key]?.completedAt) && (
              <button className="assessment-banner" type="button" onClick={openAssessment}>
                <span className="assessment-banner-mark" aria-hidden="true">✦</span>
                <span><strong>Set your wellness baseline</strong><small>Answer 24 quick prompts to calculate your six starting scores.</small></span>
                <span className="assessment-banner-arrow" aria-hidden="true">→</span>
              </button>
            )}
            <div className="home-top-grid">
              <WellnessHexagon />
              <ActivityComposer scores={scoreMap} priorities={priorities} />
            </div>
            <ConfirmedActivities />
          </div>
        )}

        {screen === "dimensions" && <DimensionsHub scores={scoreMap} priorities={priorities} initialView={dimensionsInitialView} />}

        {screen === "emails" && <EmailInbox />}

        {screen === "profile" && (
          <div className="screen-content profile-screen">
            <header className="screen-heading"><p className="eyebrow">Your space</p><h1>Profile</h1><p className="muted">Your progress and personal notes.</p></header>
            <section className="profile-hero panel">
              <div className="profile-avatar-large">S</div>
              <div><p className="eyebrow">DISCIPLINEOS MEMBER</p><h2>Your profile</h2><p className="muted">Demo profile · Sign-in is not connected yet</p></div>
            </section>
            <div className="profile-stats">
              <div className="profile-stat panel"><span className="eyebrow">WELLNESS SCORE</span><strong>{average}</strong><span className="muted">Across six dimensions</span></div>
              <div className="profile-stat panel"><span className="eyebrow">WELLNESS AREAS</span><strong>6</strong><span className="muted">Tracked dimensions</span></div>
            </div>
            <section className="appearance-setting panel">
              <div>
                <p className="eyebrow">DISPLAY</p>
                <h2>Appearance</h2>
                <p className="muted">Choose your DisciplineOS atmosphere.</p>
              </div>
              <div className="appearance-switch" role="group" aria-label="Appearance">
                <button type="button" className={appearance === "bright" ? "is-active" : ""} aria-pressed={appearance === "bright"} onClick={() => setAppearance("bright")}>
                  <span aria-hidden="true">✦</span> Bright
                </button>
                <button type="button" className={appearance === "dark" ? "is-active" : ""} aria-pressed={appearance === "dark"} onClick={() => setAppearance("dark")}>
                  <span aria-hidden="true">☾</span> Dark
                </button>
              </div>
            </section>
            <section className="score-history panel">
              <div className="calendar-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2>Score history</h2></div><span className="calendar-month-count">{scoreHistory.length} changes</span></div>
              {scoreHistory.length === 0 ? (
                <div className="calendar-empty-state"><span className="empty-mark" aria-hidden="true">↗</span><div><strong>Your score story starts with the assessment</strong><p>Complete an area assessment or report an activity outcome to see score changes here.</p></div></div>
              ) : scoreHistory.slice().reverse().slice(-8).reverse().map((entry, index) => {
                const item = DIMENSIONS.find((dimension) => dimension.key === entry.dimension);
                return <article className="score-history-row" key={entry.id || `${entry.createdAt}-${index}`}><span className="dimension-dot" style={{ "--dimension-color": item?.color || "var(--accent)" }} /><div><strong>{item?.label || entry.dimension}</strong><span>{entry.reason} · {new Date(entry.createdAt).toLocaleDateString()}</span></div><b className={entry.delta >= 0 ? "score-increase" : "score-decrease"}>{entry.delta > 0 ? "+" : ""}{entry.delta}</b></article>;
              })}
            </section>
            <Journal />
          </div>
        )}
      </main>
    </div>
  );
}
