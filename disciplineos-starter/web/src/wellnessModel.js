export const DIMENSIONS = [
  {
    key: "physical",
    label: "Physical health",
    color: "var(--physical)",
    questions: [
      "How often do you engage in physical activity (skate, calisthenics, climbing)?",
      "How satisfied are you with your current physical routine?",
      "How often do you feel physically energized?",
      "How often do you meet your physical goals?",
    ],
  },
  {
    key: "emotional",
    label: "Mental health",
    color: "var(--emotional)",
    questions: [
      "How often do you journal or reflect?",
      "How often do you feel mentally rested?",
      "How often do you sleep 7+ hours?",
      "How often do you feel emotionally balanced?",
    ],
  },
  {
    key: "social",
    label: "Social",
    color: "var(--social)",
    questions: [
      "How often do you spend meaningful time with friends?",
      "How often do you attend social or club events?",
      "How connected do you feel to your community?",
      "How often do you feel socially fulfilled?",
    ],
  },
  {
    key: "financial",
    label: "Financial",
    color: "var(--financial)",
    questions: [
      "How often do you check your finances?",
      "How confident are you in your spending habits?",
      "How often do you contribute to savings goals?",
      "How often do you feel financially secure?",
    ],
  },
  {
    key: "intellectual",
    label: "Intellectual",
    color: "var(--intellectual)",
    questions: [
      "How often do you study or learn intentionally?",
      "How confident are you in your academic progress?",
      "How often do you meet academic deadlines?",
      "How often do you feel intellectually stimulated?",
    ],
  },
  {
    key: "occupational",
    label: "Occupational",
    color: "var(--occupational)",
    questions: [
      "How often do you work on career-related tasks?",
      "How confident are you in your professional growth?",
      "How often do you meet work/club responsibilities?",
      "How often do you feel aligned with your future goals?",
    ],
  },
];

export const SCALE_LABELS = ["Rarely", "Sometimes", "About half the time", "Most of the time", "Almost always"];
export const COMPLETED_POINTS = 4;
export const MISSED_POINTS = 3;

export function scoreAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== 4 || answers.some((answer) => !Number.isInteger(answer) || answer < 1 || answer > 5)) {
    throw new Error("Complete all four questions using the 1–5 scale.");
  }
  return Math.round(((answers.reduce((sum, answer) => sum + answer, 0) / answers.length) - 1) * 25);
}

export function recommendDimension(scores, priorities = {}, candidates = DIMENSIONS.map(({ key }) => key)) {
  return [...candidates].sort((left, right) => {
    const leftPriority = priorities[left] ? 1 : 0;
    const rightPriority = priorities[right] ? 1 : 0;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;
    return (scores[left] ?? 50) - (scores[right] ?? 50);
  })[0] ?? null;
}