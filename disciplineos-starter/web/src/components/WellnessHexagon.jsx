import { useEffect, useMemo, useState } from "react";
import { watchDimensions } from "../firebase.js";

const DIMENSION_META = [
  { key: "physical", label: "Physical health", color: "var(--physical)" },
  { key: "emotional", label: "Mental health", color: "var(--emotional)" },
  { key: "social", label: "Social", color: "var(--social)" },
  { key: "financial", label: "Financial", color: "var(--financial)" },
  { key: "intellectual", label: "Intellectual", color: "var(--intellectual)" },
  { key: "occupational", label: "Occupational", color: "var(--occupational)" },
];

const DEFAULTS = {
  physical: 50,
  emotional: 50,
  social: 50,
  financial: 50,
  intellectual: 50,
  occupational: 50,
};

const CX = 260,
  CY = 218,
  R = 136,
  LABEL_R = 190;
const N = DIMENSION_META.length;

function pointAt(index, radiusFrac) {
  const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
  const r = R * radiusFrac;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function labelPointAt(index) {
  const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
  return { x: CX + LABEL_R * Math.cos(angle), y: CY + LABEL_R * Math.sin(angle) };
}

export default function WellnessHexagon() {
  const [scores, setScores] = useState(DEFAULTS);

  // Pull real scores from Firebase if they exist; otherwise keep local defaults.
  useEffect(() => {
    const unsub = watchDimensions((remote) => {
      if (remote) setScores((prev) => ({ ...prev, ...remote }));
    });
    return unsub;
  }, []);

  const overall = useMemo(
    () => Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / N),
    [scores]
  );

  const rings = [0.25, 0.5, 0.75, 1];
  const fillPts = DIMENSION_META
    .map((d, i) => {
      const p = pointAt(i, scores[d.key] / 100);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <section className="wellness-embedded" aria-label="Six dimensions of wellness">
      <div className="wellness-score-heading">
        <div className="wellness-overall-score">
          {overall}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>overall wellness score</div>
      </div>

      <svg viewBox="0 0 520 440" style={{ width: "100%", maxWidth: 640 }}>
        {rings.map((f, ri) => (
          <polygon
            key={ri}
            fill="none"
            stroke="var(--line)"
            strokeWidth="1"
            points={DIMENSION_META.map((d, i) => {
              const p = pointAt(i, f);
              return `${p.x},${p.y}`;
            }).join(" ")}
          />
        ))}

        {DIMENSION_META.map((d, i) => {
          const p = pointAt(i, 1);
          return <line key={d.key} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="var(--line)" strokeWidth="1" />;
        })}

        <polygon points={fillPts} fill="var(--chart-fill)" fillOpacity="0.26" stroke="var(--chart-stroke)" strokeWidth="2.5" />

        {DIMENSION_META.map((d, i) => {
          const p = pointAt(i, scores[d.key] / 100);
          return (
            <circle
              key={d.key}
              cx={p.x}
              cy={p.y}
              r="6"
              fill={d.color}
              stroke="var(--chart-point-outline)"
              strokeWidth="2"
            />
          );
        })}

        {DIMENSION_META.map((d, i) => {
          const lp = labelPointAt(i);
          const anchor = lp.x < CX - 5 ? "end" : lp.x > CX + 5 ? "start" : "middle";
          return (
            <text key={d.key}>
              <tspan x={lp.x} y={lp.y - 4} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill="var(--text)">
                {d.label}
              </tspan>
              <tspan x={lp.x} y={lp.y + 12} textAnchor={anchor} fontSize="12" fill="var(--muted)">
                {scores[d.key]}
              </tspan>
            </text>
          );
        })}
      </svg>

    </section>
  );
}
