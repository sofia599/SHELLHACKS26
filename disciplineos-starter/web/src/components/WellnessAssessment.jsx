import { useEffect, useState } from "react";
import { saveDimensionAssessment, watchAssessments } from "../firebase.js";
import { DIMENSIONS, SCALE_LABELS, scoreAnswers } from "../wellnessModel.js";

const EMPTY_ANSWERS = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, [0, 0, 0, 0]]));

export default function WellnessAssessment({ scores = {}, onScoresChanged }) {
  const [assessments, setAssessments] = useState({});
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => watchAssessments((saved) => {
    setAssessments(saved ?? {});
    if (saved) {
      setAnswers((current) => Object.fromEntries(DIMENSIONS.map(({ key }) => [
        key,
        saved[key]?.answers?.length === 4 ? saved[key].answers : current[key],
      ])));
    }
  }), []);

  const dimension = DIMENSIONS[activeIndex];
  const currentAnswers = answers[dimension.key];
  const score = currentAnswers.every((answer) => answer > 0) ? scoreAnswers(currentAnswers) : null;
  const completedCount = DIMENSIONS.filter((item) => assessments[item.key]?.completedAt).length;

  function selectAnswer(questionIndex, value) {
    setAnswers((current) => ({
      ...current,
      [dimension.key]: current[dimension.key].map((answer, index) => index === questionIndex ? value : answer),
    }));
  }

  async function saveAndContinue() {
    if (score === null) return;
    setSaving(true);
    setNotice("");
    try {
      const previous = assessments[dimension.key]?.score ?? scores[dimension.key] ?? 50;
      await saveDimensionAssessment(dimension.key, currentAnswers, score, previous);
      setAssessments((current) => ({ ...current, [dimension.key]: { answers: currentAnswers, score, completedAt: Date.now() } }));
      onScoresChanged?.();
      if (activeIndex < DIMENSIONS.length - 1) {
        setActiveIndex((index) => index + 1);
        setNotice(`${dimension.label} saved. Next: ${DIMENSIONS[activeIndex + 1].label}.`);
      } else {
        setNotice("Assessment saved. Your wellness scores are up to date.");
      }
    } catch (error) {
      setNotice(error.message || "Could not save this assessment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="assessment-screen">
      <header className="screen-heading">
        <p className="eyebrow">Baseline check-in</p>
        <h1>Wellness assessment</h1>
        <p className="muted">Rate how things have been going lately. Each area gets its own score from 0 to 100.</p>
      </header>
      <div className="assessment-progress" aria-label={`${completedCount} of 6 dimensions assessed`}>
        <div className="assessment-progress-copy"><strong>{completedCount} of 6 complete</strong><span>{Math.round(completedCount / DIMENSIONS.length * 100)}%</span></div>
        <div className="assessment-progress-track"><span style={{ width: `${completedCount / DIMENSIONS.length * 100}%` }} /></div>
      </div>
      <div className="assessment-layout">
        <nav className="assessment-nav" aria-label="Assessment dimensions">
          {DIMENSIONS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={`assessment-nav-item${index === activeIndex ? " is-active" : ""}`}
              style={{ "--dimension-color": item.color }}
              onClick={() => { setActiveIndex(index); setNotice(""); }}
            >
              <span className="dimension-dot" />
              <span>{item.label}</span>
              <strong>{assessments[item.key]?.score ?? "—"}</strong>
              {assessments[item.key]?.completedAt && <span className="assessment-done" aria-label="Complete">✓</span>}
            </button>
          ))}
        </nav>
        <section className="assessment-question-panel panel" style={{ "--dimension-color": dimension.color }}>
          <div className="assessment-dimension-heading">
            <div><p className="eyebrow">DIMENSION {activeIndex + 1} / 6</p><h2>{dimension.label}</h2></div>
            <div className="assessment-score-preview"><strong>{score ?? assessments[dimension.key]?.score ?? "—"}</strong><span>score</span></div>
          </div>
          <div className="question-list">
            {dimension.questions.map((question, questionIndex) => (
              <fieldset className="assessment-question" key={question}>
                <legend><span>{String(questionIndex + 1).padStart(2, "0")}</span>{question}</legend>
                <div className="answer-options">
                  {SCALE_LABELS.map((label, optionIndex) => {
                    const value = optionIndex + 1;
                    return (
                      <button
                        key={label}
                        type="button"
                        className={currentAnswers[questionIndex] === value ? "is-selected" : ""}
                        aria-pressed={currentAnswers[questionIndex] === value}
                        aria-label={`${label}, ${value} of 5`}
                        onClick={() => selectAnswer(questionIndex, value)}
                      >{value}</button>
                    );
                  })}
                </div>
                <div className="answer-endpoints"><span>Rarely / not at all</span><span>Almost always / very confident</span></div>
              </fieldset>
            ))}
          </div>
          <div className="assessment-footer">
            <span className="muted" role="status">{notice || "Answer all four prompts to calculate this score."}</span>
            <button className="primary" type="button" disabled={score === null || saving} onClick={saveAndContinue}>
              {saving ? "Saving…" : activeIndex === DIMENSIONS.length - 1 ? "Save assessment" : `Save & continue`}
            </button>
          </div>
        </section>
      </div>
      <p className="assessment-method-note">Scores use the average of four 1–5 answers, converted to 0–100. Retake any area when your situation changes.</p>
    </section>
  );
}
