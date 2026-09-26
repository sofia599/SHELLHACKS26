import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { saveDimensionAssessment, watchAssessments } from './firebase.js';
import { DIMENSIONS, SCALE_LABELS, scoreAnswers } from './wellnessModel.js';

const blankAnswers = () => Object.fromEntries(DIMENSIONS.map(({ key }) => [key, [0, 0, 0, 0]]));

export default function WellnessAssessment({ styles, scores, onScoresChanged }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState(blankAnswers);
  const [assessments, setAssessments] = useState({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const dimension = DIMENSIONS[activeIndex];
  const activeAnswers = answers[dimension.key];
  const result = activeAnswers.every((answer) => answer > 0) ? scoreAnswers(activeAnswers) : null;
  const finished = DIMENSIONS.filter(({ key }) => assessments[key]?.completedAt).length;

  useEffect(() => watchAssessments((saved) => {
    setAssessments(saved ?? {});
    if (saved) setAnswers((current) => Object.fromEntries(DIMENSIONS.map(({ key }) => [
      key,
      saved[key]?.answers?.length === 4 ? saved[key].answers : current[key],
    ])));
  }), []);

  function answer(questionIndex, value) {
    setAnswers((current) => ({
      ...current,
      [dimension.key]: current[dimension.key].map((old, index) => index === questionIndex ? value : old),
    }));
  }

  async function saveArea() {
    if (result === null) return;
    setSaving(true);
    setNotice('');
    try {
      await saveDimensionAssessment(dimension.key, activeAnswers, result, assessments[dimension.key]?.score ?? scores[dimension.key] ?? result);
      setAssessments((current) => ({ ...current, [dimension.key]: { answers: activeAnswers, score: result, completedAt: Date.now() } }));
      onScoresChanged?.();
      if (activeIndex < DIMENSIONS.length - 1) {
        setActiveIndex((index) => index + 1);
        setNotice(`${dimension.label} saved. Next: ${DIMENSIONS[activeIndex + 1].label}.`);
      } else {
        setNotice('Assessment saved. Your wellness scores are up to date.');
      }
    } catch (error) {
      setNotice(error.message || 'Could not save this assessment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screenSection}>
      <Text style={styles.kicker}>BASELINE CHECK-IN</Text>
      <Text style={styles.pageTitle}>Wellness assessment</Text>
      <Text style={styles.pageSubtitle}>Answer four prompts for each area. Scores are calculated on a 0–100 scale.</Text>
      <View style={styles.assessmentProgressCard}>
        <View style={styles.cardHeading}><Text style={styles.assessmentProgressTitle}>{finished} of 6 areas complete</Text><Text style={styles.pendingNote}>{Math.round(finished / 6 * 100)}%</Text></View>
        <View style={styles.assessmentTrack}><View style={[styles.assessmentTrackFill, { width: `${finished / 6 * 100}%` }]} /></View>
      </View>
      <View style={styles.assessmentDimensionList}>
        {DIMENSIONS.map((item, index) => (
          <Pressable key={item.key} onPress={() => { setActiveIndex(index); setNotice(''); }} style={[styles.assessmentDimensionButton, index === activeIndex && { borderColor: item.color, backgroundColor: `${item.color}14` }]}>
            <View style={[styles.dimensionDot, { backgroundColor: item.color }]} />
            <Text style={styles.assessmentDimensionText}>{item.label}</Text>
            <Text style={styles.assessmentDimensionScore}>{assessments[item.key]?.score ?? '—'}</Text>
            {assessments[item.key] && <Text style={styles.assessmentCheck}>✓</Text>}
          </Pressable>
        ))}
      </View>
      <View style={styles.assessmentCard}>
        <View style={styles.assessmentCardHeading}>
          <View><Text style={styles.kicker}>AREA {activeIndex + 1} OF 6</Text><Text style={styles.sectionTitle}>{dimension.label}</Text></View>
          <Text style={[styles.assessmentScore, { color: dimension.color }]}>{result ?? assessments[dimension.key]?.score ?? '—'}</Text>
        </View>
        {dimension.questions.map((question, questionIndex) => (
          <View key={question} style={styles.assessmentQuestion}>
            <Text style={styles.assessmentQuestionText}><Text style={styles.questionNumber}>0{questionIndex + 1}  </Text>{question}</Text>
            <View style={styles.assessmentAnswers}>
              {SCALE_LABELS.map((label, index) => {
                const value = index + 1;
                const selected = activeAnswers[questionIndex] === value;
                return <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${label}, ${value} of 5`} onPress={() => answer(questionIndex, value)} style={[styles.assessmentAnswer, selected && styles.assessmentAnswerSelected]}><Text style={[styles.assessmentAnswerText, selected && styles.assessmentAnswerTextSelected]}>{value}</Text></Pressable>;
              })}
            </View>
            <View style={styles.assessmentScaleLabels}><Text style={styles.assessmentScaleText}>RARELY</Text><Text style={styles.assessmentScaleText}>ALMOST ALWAYS</Text></View>
          </View>
        ))}
        <View style={styles.assessmentSaveRow}>
          <Text style={styles.assessmentNotice}>{notice || 'Rate each prompt from 1 to 5.'}</Text>
          <Pressable disabled={result === null || saving} onPress={saveArea} style={[styles.smallAction, (result === null || saving) && styles.disabledAction]}><Text style={styles.smallActionText}>{saving ? 'Saving…' : activeIndex === 5 ? 'Save area' : 'Save & next'}</Text></Pressable>
        </View>
      </View>
      <Text style={styles.assessmentMethod}>Score = average answer mapped to 0–100. Retake an area any time.</Text>
    </View>
  );
}
