import { useEffect, useMemo, useState } from "react";
import ActivityComposer from "./components/ActivityComposer.jsx";
import ConfirmedActivities from "./components/ConfirmedActivities.jsx";
import DimensionCalendars from "./components/DimensionCalendars.jsx";
import WellnessHexagon from "./components/WellnessHexagon.jsx";
import Journal from "./components/Journal.jsx";
import { watchDimensions } from "./firebase.js";

const DEFAULT_SCORES = [70, 60, 65, 55, 75, 70];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [appearance, setAppearance] = useState(() => localStorage.getItem("disciplineos-appearance") || "bright");
  const [scores, setScores] = useState(DEFAULT_SCORES);
  const average = useMemo(() => Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length), [scores]);

  useEffect(() => watchDimensions((value) => {
    if (!value) return;
    setScores([value.physical ?? 70, value.emotional ?? 60, value.social ?? 65, value.financial ?? 55, value.intellectual ?? 75, value.occupational ?? 70]);
  }), []);

  useEffect(() => {
    localStorage.setItem("disciplineos-appearance", appearance);
  }, [appearance]);

  return (
    <div className="app-frame" data-theme={appearance}>
      <aside className="desktop-rail">
        <button className="brand-home" type="button" onClick={() => setScreen("home")} aria-label="Go to home">
          <span className="brand-mark">D</span><span>DisciplineOS</span>
        </button>
        <div className="rail-caption">YOUR SPACE</div>
        <nav className="rail-nav" aria-label="Main navigation">
          <button className={`rail-link${screen === "profile" ? " is-active" : ""}`} onClick={() => setScreen("profile")} type="button">
            <span aria-hidden="true">◉</span> Profile
          </button>
          <button className={`rail-link${screen === "dimensions" ? " is-active" : ""}`} onClick={() => setScreen("dimensions")} type="button">
            <span aria-hidden="true">▦</span> Dimension calendars
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
            <div className="home-top-grid">
              <WellnessHexagon />
              <ActivityComposer />
            </div>
            <ConfirmedActivities />
          </div>
        )}

        {screen === "dimensions" && <div className="screen-content"><DimensionCalendars /></div>}

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
            <Journal />
          </div>
        )}
      </main>
    </div>
  );
}
