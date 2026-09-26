export const DIMENSIONS = [
  { key: 'physical', label: 'Physical', color: '#e85b45', initial: 70 },
  { key: 'emotional', label: 'Emotional', color: '#a24bc2', initial: 60 },
  { key: 'social', label: 'Social', color: '#258fc3', initial: 65 },
  { key: 'financial', label: 'Financial', color: '#15966a', initial: 55 },
  { key: 'intellectual', label: 'Intellectual', color: '#c18a12', initial: 75 },
  { key: 'occupational', label: 'Occupational', color: '#dc4774', initial: 70 },
];

const KEYWORDS = {
  physical: ['walk', 'run', 'workout', 'gym', 'exercise', 'yoga', 'swim', 'hike', 'stretch', 'sport', 'sleep', 'meal', 'cook'],
  emotional: ['therapy', 'therapist', 'meditate', 'meditation', 'rest', 'journal', 'breath', 'mindful', 'feelings', 'self-care', 'relax'],
  social: ['friend', 'family', 'call', 'dinner', 'lunch', 'meetup', 'date', 'community', 'visit', 'hang out', 'talk'],
  financial: ['budget', 'bill', 'bank', 'save', 'saving', 'invest', 'tax', 'payment', 'finance', 'money', 'debt'],
  intellectual: ['read', 'study', 'learn', 'class', 'course', 'research', 'puzzle', 'practice', 'language', 'lecture', 'book'],
  occupational: ['work', 'meeting', 'project', 'email', 'interview', 'career', 'presentation', 'client', 'deadline', 'office', 'application'],
};

export function suggestDimension(activity) {
  const text = activity.trim().toLowerCase();
  if (!text) return null;
  const ranked = Object.entries(KEYWORDS)
    .map(([key, words]) => ({ key, score: words.filter((word) => text.includes(word)).length }))
    .sort((left, right) => right.score - left.score);
  if (ranked[0].score === 0 || ranked[0].score === ranked[1].score) return null;
  return ranked[0].key;
}

export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}