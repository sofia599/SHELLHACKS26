import { useState } from "react";
import { logJournalEntry } from "../firebase.js";

// IMPORTANT: never call an LLM API directly from the browser with a real API key —
// it would be visible to anyone who opens dev tools. For the hackathon demo, either:
//   (a) stub this out and hardcode a couple of realistic-looking reflections, or
//   (b) proxy the call through a Firebase Cloud Function / small serverless endpoint
//       that holds the API key server-side and just returns the reflection text.
// This starter ships with (a) so it runs with zero backend setup; swap in (b) if you have time.
async function getAIReflection(text) {
  await new Promise((r) => setTimeout(r, 600)); // simulate latency
  if (!text.trim()) return "Write a few lines and I'll reflect it back to you.";
  const lower = text.toLowerCase();
  if (lower.includes("tired") || lower.includes("exhaust")) {
    return "Sounds like today ran you down. Worth checking your sleep log against this — that's usually the first thing to fix.";
  }
  if (lower.includes("stress") || lower.includes("overwhelm") || lower.includes("anxious")) {
    return "A lot on your plate today. Maybe pick one thing from your calendar to move or drop tomorrow.";
  }
  if (lower.includes("good") || lower.includes("great") || lower.includes("proud")) {
    return "Good day — worth noting what made it work so you can repeat it.";
  }
  return "Logged. Come back tomorrow and see how the pattern looks over a week.";
}

export default function Journal() {
  const [text, setText] = useState("");
  const [reflection, setReflection] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const aiReflection = await getAIReflection(text);
    setReflection(aiReflection);
    logJournalEntry({ text, createdAt: Date.now(), reflection: aiReflection });
    setLoading(false);
  }

  return (
    <div className="panel">
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Journal</h2>
      <textarea
        rows={4}
        placeholder="How's today going?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" onClick={submit} disabled={loading || !text.trim()}>
          {loading ? "Reflecting…" : "Log entry"}
        </button>
      </div>
      {reflection && (
        <p className="muted" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.5 }}>
          {reflection}
        </p>
      )}
    </div>
  );
}
