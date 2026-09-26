import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DimensionCalendars from './DimensionCalendars.js';
import WellnessAssessment from './WellnessAssessment.js';

export default function DimensionsHub({ styles, scores, priorities, onScoresChanged, initialView = 'calendars' }) {
  const [view, setView] = useState(initialView);
  return (
    <View style={styles.screenSection}>
      <View style={styles.dimensionHubTabs}>
        <Pressable onPress={() => setView('calendars')} style={[styles.dimensionHubTab, view === 'calendars' && styles.dimensionHubTabSelected]}><Text style={[styles.dimensionHubTabText, view === 'calendars' && styles.dimensionHubTabTextSelected]}>▦  Calendars</Text></Pressable>
        <Pressable onPress={() => setView('assessment')} style={[styles.dimensionHubTab, view === 'assessment' && styles.dimensionHubTabSelected]}><Text style={[styles.dimensionHubTabText, view === 'assessment' && styles.dimensionHubTabTextSelected]}>◌  Assessment</Text></Pressable>
      </View>
      {view === 'calendars'
        ? <DimensionCalendars styles={styles} scores={scores} priorities={priorities} />
        : <WellnessAssessment styles={styles} scores={scores} onScoresChanged={onScoresChanged} />}
    </View>
  );
}
