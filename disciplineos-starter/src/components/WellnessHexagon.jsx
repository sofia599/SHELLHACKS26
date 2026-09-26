import { useEffect, useMemo, useRef, useState } from "react";
import { watchDimensions, setDimensionScore } from "../firebase.js";

const DIMENSION_META = [
  { key: "physical", label: "Physical", color: "var(--physical)" },
  { key: "emotional", label: "Emotional", color: "var(--emotional)" },
  { key: "social", label: "Social", color: "var(--social)" },
  { key: "financial", label: "Financial", color: "var(--financial)" },
  { key: "intellectual", label: "Intellectual", color: "var(--intellectual)" },
  { key: "occupational", label: "Occupational", color: "var(--occupational)" },
];

const DEFAULTS = {
  physical: 70,
  emotional: 60,
  social: 65,
  financial: 55,
  intellectual: 75,
  occupational: 70,
};

const CX = 210,
  CY = 210,
  R = 150,
  LABEL_R = 185;
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
  const svgRef = useRef(null);

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

  function updateScore(key, value) {
    setScores((prev) => ({ ...prev, [key]: value }));
    setDimensionScore(key, value); // writes to Firebase; the clip's status logic can read this too
  }

  function startDrag(index) {
    function onMove(ev) {
      const rect = svgRef.current.getBoundingClientRect();
      const scale = 420 / rect.width;
      const x = (ev.clientX - rect.left) * scale;
      const y = (ev.clientY - rect.top) * scale;
      const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
      const dx = x - CX,
        dy = y - CY;
      const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
      let frac = proj / R;
      frac = Math.max(0.03, Math.min(1, frac));
      updateScore(DIMENSION_META[index].key, Math.round(frac * 100));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const rings = [0.25, 0.5, 0.75, 1];
  const fillPts = DIMENSION_META
    .map((d, i) => {
      const p = pointAt(i, scores[d.key] / 100);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 48 }}>
          {overall}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>overall wellness score</div>
      </div>

      <svg ref={svgRef} viewBox="0 0 420 420" style={{ width: "100%", maxWidth: 420 }}>
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

        <polygon points={fillPts} fill="#8FA6FF" fillOpacity="0.16" stroke="#8FA6FF" strokeWidth="2" />

        {DIMENSION_META.map((d, i) => {
          const p = pointAt(i, scores[d.key] / 100);
          return (
            <circle
              key={d.key}
              cx={p.x}
              cy={p.y}
              r="6"
              fill={d.color}
              stroke="#0B0C0F"
              strokeWidth="2"
              style={{ cursor: "grab" }}
              onPointerDown={(e) => {
                e.preventDefault();
                startDrag(i);
              }}
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

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {DIMENSION_META.map((d) => (
          <div key={d.key} className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 9, height: 9, borderRadius: 9, background: d.color, display: "inline-block" }} />
              {d.label}
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={scores[d.key]}
              onChange={(e) => updateScore(d.key, +e.target.value)}
              style={{ width: 140 }}
            />
            <span className="muted" style={{ fontSize: 13, width: 24, textAlign: "right" }}>
              {scores[d.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
