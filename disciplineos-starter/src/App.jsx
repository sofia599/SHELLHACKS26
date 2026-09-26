import WellnessHexagon from "./components/WellnessHexagon.jsx";
import WellnessCalendar from "./components/WellnessCalendar.jsx";
import FocusSprint from "./components/FocusSprint.jsx";
import Journal from "./components/Journal.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <header>
        <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>DisciplineOS</p>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Your wellness, in one shape.</h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}>
          Start a sprint, log how you're feeling, and watch the hexagon and the clip react.
        </p>
      </header>

      <div className="dashboard-grid">
        <main className="main-column">
          <FocusSprint />
          <WellnessHexagon />
        </main>
        <aside className="side-column">
          <WellnessCalendar />
          <Journal />
        </aside>
      </div>
    </div>
  );
}
