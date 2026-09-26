import { useState } from "react";
import DimensionCalendars from "./DimensionCalendars.jsx";
import WellnessAssessment from "./WellnessAssessment.jsx";

export default function DimensionsHub({ scores, priorities, onScoresChanged, initialView = "calendars" }) {
  const [view, setView] = useState(initialView);

  return (
    <div className="screen-content dimensions-screen">
      <div className="dimensions-screen-tabs" role="tablist" aria-label="Dimensions views">
        <button type="button" role="tab" aria-selected={view === "calendars"} className={view === "calendars" ? "is-active" : ""} onClick={() => setView("calendars")}>
          <span aria-hidden="true">▦</span> Calendars
        </button>
        <button type="button" role="tab" aria-selected={view === "assessment"} className={view === "assessment" ? "is-active" : ""} onClick={() => setView("assessment")}>
          <span aria-hidden="true">◌</span> Assessment
        </button>
      </div>
      {view === "calendars"
        ? <DimensionCalendars scores={scores} priorities={priorities} />
        : <WellnessAssessment scores={scores} onScoresChanged={onScoresChanged} />}
    </div>
  );
}
