import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { logJournalEntry, watchDimensions } from './firebase.js';
import ActivityComposer from './ActivityComposer.js';
import ConfirmedActivities from './ConfirmedActivities.js';
import DimensionCalendars from './DimensionCalendars.js';
import WellnessHexagon from './WellnessHexagon.js';
import { DIMENSIONS } from './activityRules.js';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_SCORES = Object.fromEntries(DIMENSIONS.map(({ key, initial }) => [key, initial]));
const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

function NavButton({ label, symbol, selected, onPress, styles: navStyles }) {
  return (
    <Pressable onPress={onPress} style={[navStyles.navButton, selected && navStyles.navButtonSelected]}>
      <Text style={[navStyles.navSymbol, selected && navStyles.navTextSelected]}>{symbol}</Text>
      <Text style={[navStyles.navLabel, selected && navStyles.navTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [appearance, setAppearance] = useState('bright');
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [scores, setScores] = useState(DEFAULT_SCORES);
  const [googleToken, setGoogleToken] = useState(null);
  const [journalText, setJournalText] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);
  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web || 'preview-disabled.apps.googleusercontent.com',
    androidClientId: GOOGLE_CLIENT_IDS.android || 'preview-disabled.apps.googleusercontent.com',
    iosClientId: GOOGLE_CLIENT_IDS.ios || 'preview-disabled.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  const overallScore = useMemo(() => Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / DIMENSIONS.length), [scores]);
  const googleConfigured = Boolean(GOOGLE_CLIENT_IDS[Platform.OS]);
  const isDark = appearance === 'dark';
  const screenStyles = isDark
    ? Object.fromEntries(Object.keys(styles).map((key) => [
      key,
      darkThemeStyles[key] ? [styles[key], darkThemeStyles[key]] : styles[key],
    ]))
    : styles;

  useEffect(() => watchDimensions((remote) => remote && setScores((current) => ({ ...current, ...remote }))), []);
  useEffect(() => {
    AsyncStorage.getItem('disciplineos-appearance')
      .then((saved) => saved && setAppearance(saved))
      .finally(() => setAppearanceReady(true));
  }, []);
  useEffect(() => {
    if (appearanceReady) AsyncStorage.setItem('disciplineos-appearance', appearance);
  }, [appearance, appearanceReady]);
  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    setGoogleToken(googleResponse.authentication?.accessToken ?? googleResponse.params?.access_token ?? null);
  }, [googleResponse]);

  async function saveJournal() {
    const note = journalText.trim();
    if (!note) return;
    await logJournalEntry({ text: note, createdAt: Date.now() });
    setJournalText('');
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2500);
  }

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111a28' : '#f5f7fb'} />
      <View style={screenStyles.appContainer}>
        <ScrollView contentContainerStyle={screenStyles.page} showsVerticalScrollIndicator={false}>
          <View style={screenStyles.topline}>
            <View style={screenStyles.brandMark}><Text style={screenStyles.brandMarkText}>D</Text></View>
            <Text style={screenStyles.brand}>DISCIPLINEOS</Text>
            <View style={screenStyles.liveTag}><View style={screenStyles.liveDot} /><Text style={screenStyles.liveText}>YOUR DAILY RESET</Text></View>
          </View>

          {screen === 'home' && (
            <>
              <View style={screenStyles.intro}>
                <Text style={screenStyles.greeting}>A little better,{ '\n' }one day at a time.</Text>
                <Text style={screenStyles.dateLabel}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              </View>

              <View style={screenStyles.wellnessHeading}>
                <View><Text style={screenStyles.kicker}>YOUR SIX DIMENSIONS</Text><Text style={screenStyles.sectionTitle}>Wellness shape</Text></View>
                <View style={screenStyles.overallBadge}><Text style={screenStyles.overallScore}>{overallScore}</Text><Text style={screenStyles.overallLabel}>OVERALL</Text></View>
              </View>
              <WellnessHexagon dimensions={DIMENSIONS} scores={scores} dark={isDark} />
              <ActivityComposer styles={screenStyles} dark={isDark} />
              <ConfirmedActivities
                styles={screenStyles}
                googleToken={googleToken}
                googleConfigured={googleConfigured}
                googleBusy={!googleRequest && googleConfigured}
                onConnect={promptGoogleAuth}
                onDisconnect={() => setGoogleToken(null)}
              />
            </>
          )}

          {screen === 'calendars' && <DimensionCalendars styles={screenStyles} googleToken={googleToken} />}

          {screen === 'profile' && (
            <View style={screenStyles.screenSection}>
              <Text style={screenStyles.kicker}>YOUR SPACE</Text>
              <Text style={screenStyles.pageTitle}>Profile</Text>
              <Text style={screenStyles.pageSubtitle}>Your progress and personal notes.</Text>
              <View style={screenStyles.profileCard}>
                <View style={screenStyles.profileAvatar}><Text style={screenStyles.profileInitial}>S</Text></View>
                <View style={screenStyles.profileCopy}><Text style={screenStyles.kicker}>DISCIPLINEOS MEMBER</Text><Text style={screenStyles.profileTitle}>Your profile</Text><Text style={screenStyles.profileSubtitle}>Demo profile · Sign-in is not connected yet</Text></View>
              </View>
              <View style={screenStyles.profileStats}>
                <View style={screenStyles.profileStat}><Text style={screenStyles.kicker}>WELLNESS SCORE</Text><Text style={screenStyles.profileStatNumber}>{overallScore}</Text><Text style={screenStyles.profileStatCaption}>Across six dimensions</Text></View>
                <View style={screenStyles.profileStat}><Text style={screenStyles.kicker}>WELLNESS AREAS</Text><Text style={screenStyles.profileStatNumber}>6</Text><Text style={screenStyles.profileStatCaption}>Tracked dimensions</Text></View>
              </View>
              <View style={screenStyles.appearanceCard}>
                <View><Text style={screenStyles.kicker}>DISPLAY</Text><Text style={screenStyles.appearanceTitle}>Appearance</Text><Text style={screenStyles.profileSubtitle}>Choose your atmosphere.</Text></View>
                <View style={screenStyles.appearanceSwitch}>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: !isDark }} onPress={() => setAppearance('bright')} style={[screenStyles.appearanceOption, !isDark && screenStyles.appearanceOptionSelected]}><Text style={screenStyles.appearanceOptionText}>✦ Bright</Text></Pressable>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: isDark }} onPress={() => setAppearance('dark')} style={[screenStyles.appearanceOption, isDark && screenStyles.appearanceOptionSelected]}><Text style={screenStyles.appearanceOptionText}>☾ Dark</Text></Pressable>
                </View>
              </View>
              <View style={screenStyles.journalCard}>
                <View style={screenStyles.cardHeading}><View><Text style={screenStyles.kicker}>A MOMENT FOR YOU</Text><Text style={screenStyles.sectionTitle}>Quick journal</Text></View><Text style={screenStyles.journalGlyph}>✎</Text></View>
                <TextInput value={journalText} onChangeText={setJournalText} placeholder="What is on your mind today?" placeholderTextColor={isDark ? '#a6b3c8' : '#6e7b91'} multiline textAlignVertical="top" style={screenStyles.journalInput} />
                <View style={screenStyles.activityFooter}><Text style={screenStyles.pendingNote}>{journalSaved ? 'Saved for today' : 'A few honest words are enough.'}</Text><Pressable onPress={saveJournal} disabled={!journalText.trim()} style={screenStyles.smallAction}><Text style={screenStyles.smallActionText}>Save note</Text></Pressable></View>
              </View>
            </View>
          )}

          <Text style={screenStyles.footerNote}>Small steps count. Keep showing up.</Text>
        </ScrollView>

        <View style={screenStyles.bottomNav}>
          <NavButton styles={screenStyles} label="Home" symbol="⌂" selected={screen === 'home'} onPress={() => setScreen('home')} />
          <NavButton styles={screenStyles} label="Calendars" symbol="▦" selected={screen === 'calendars'} onPress={() => setScreen('calendars')} />
          <NavButton styles={screenStyles} label="Profile" symbol="◉" selected={screen === 'profile'} onPress={() => setScreen('profile')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fb' },
  appContainer: { flex: 1 },
  page: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 18 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#426ee5', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  brand: { color: '#202a3b', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  liveDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#2c9877' },
  liveText: { color: '#6e7b91', fontSize: 8, fontWeight: '800' },
  intro: { gap: 7 },
  greeting: { color: '#202a3b', fontSize: 29, fontWeight: '800', lineHeight: 35 },
  dateLabel: { color: '#6e7b91', fontSize: 13, fontWeight: '500' },
  kicker: { color: '#6e7b91', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  wellnessHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#202a3b', fontSize: 19, fontWeight: '750' },
  overallBadge: { alignItems: 'flex-end' },
  overallScore: { color: '#426ee5', fontSize: 22, fontWeight: '800' },
  overallLabel: { color: '#6e7b91', fontSize: 8, fontWeight: '800' },
  screenSection: { gap: 10, paddingTop: 4 },
  pageTitle: { color: '#202a3b', fontSize: 26, fontWeight: '800' },
  pageSubtitle: { color: '#6e7b91', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  activityCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderLeftWidth: 3, borderLeftColor: '#426ee5', borderRadius: 10, padding: 11, gap: 7 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityComposerKicker: { color: '#6075ad', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  activityQuickRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityInput: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: '#e0e6ef', backgroundColor: '#fbfcfe', paddingHorizontal: 10, color: '#202a3b', fontSize: 12 },
  activityTitleInput: { flex: 1 },
  dateInput: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: '#e0e6ef', backgroundColor: '#fbfcfe', paddingHorizontal: 8, color: '#202a3b', fontSize: 11 },
  activityDateInput: { flex: 0.8 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 7, backgroundColor: '#f1f5fb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  suggestionLabel: { color: '#78877d', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  suggestionValue: { color: '#202a3b', fontSize: 10, fontWeight: '700' },
  dimensionChips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  dimensionChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, width: '31.5%', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 6, backgroundColor: '#fff' },
  dimensionDot: { width: 7, height: 7, borderRadius: 4 },
  dimensionText: { color: '#526079', fontSize: 9, fontWeight: '700' },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pendingNote: { color: '#6e7b91', fontSize: 9, fontWeight: '600' },
  smallAction: { backgroundColor: '#426ee5', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  disabledAction: { opacity: 0.55 },
  smallActionText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  calendarCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 10, padding: 14, gap: 8 },
  googleCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  googleConnectButton: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#eef3ff', borderWidth: 1, borderColor: '#d7e2fa', borderRadius: 8 },
  googleConnectText: { color: '#3459a7', fontSize: 9, fontWeight: '800' },
  googleNote: { color: '#6e7b91', fontSize: 9 },
  googleError: { color: '#b23c35', fontSize: 10 },
  mainMonthDay: { aspectRatio: 1.18 },
  googleEventDots: { position: 'absolute', bottom: 4, flexDirection: 'row', gap: 3 },
  googleEventDot: { width: 4, height: 4, borderRadius: 3 },
  mainAgenda: { borderTopWidth: 1, borderTopColor: '#e0e6ef', marginTop: 10, paddingTop: 11, gap: 5 },
  agendaDate: { color: '#202a3b', fontSize: 12, fontWeight: '800' },
  calendarLink: { color: '#426ee5', fontSize: 16 },
  emptyState: { backgroundColor: '#f5f7fb', borderRadius: 8, padding: 14, gap: 4 },
  emptyTitle: { color: '#202a3b', fontSize: 12, fontWeight: '800' },
  emptyCopy: { color: '#6e7b91', fontSize: 10, lineHeight: 15 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderTopWidth: 1, borderTopColor: '#e9edf4', paddingVertical: 9 },
  activityAccent: { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  activityCopy: { flex: 1, gap: 4 },
  activityTitle: { color: '#202a3b', fontSize: 12, fontWeight: '800' },
  activityMeta: { color: '#6e7b91', fontSize: 9 },
  confirmedMark: { color: '#24835f', fontSize: 16, fontWeight: '900', paddingHorizontal: 5 },
  dimensionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 6 },
  dimensionCard: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%', paddingHorizontal: 9, paddingVertical: 10, borderWidth: 1, borderColor: '#e0e6ef', backgroundColor: '#fff', borderRadius: 8 },
  dimensionCount: { marginLeft: 'auto', color: '#6e7b91', fontSize: 9 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitleBlock: { alignItems: 'center' },
  monthArrow: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8 },
  monthArrowText: { color: '#526079', fontSize: 21, lineHeight: 24 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: '#6e7b91', fontSize: 9, fontWeight: '700', paddingVertical: 7 },
  monthBlank: { width: '14.2857%', aspectRatio: 1 },
  monthDay: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  monthDaySelected: { backgroundColor: '#426ee5' },
  monthDayToday: { borderWidth: 1, borderColor: '#9db5ed' },
  monthDayText: { color: '#344258', fontSize: 11, fontWeight: '600' },
  monthDayTextSelected: { color: '#fff' },
  monthDayMark: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 3 },
  dayAgenda: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 10, padding: 14, marginTop: 12, gap: 8 },
  confirmButton: { backgroundColor: '#426ee5', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 },
  confirmButtonText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#eaf0fb', borderRadius: 10, padding: 16, marginTop: 10 },
  profileAvatar: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#d7e3fb', alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: '#3459a7', fontSize: 23, fontWeight: '900' },
  profileCopy: { flex: 1 },
  profileTitle: { color: '#202a3b', fontSize: 17, fontWeight: '800' },
  profileSubtitle: { color: '#6e7b91', fontSize: 9, marginTop: 4 },
  profileStats: { flexDirection: 'row', gap: 9, marginVertical: 12 },
  profileStat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9, padding: 13 },
  profileStatNumber: { color: '#202a3b', fontSize: 27, fontWeight: '900' },
  profileStatCaption: { color: '#6e7b91', fontSize: 9, marginTop: 3 },
  journalCard: { backgroundColor: '#e8effb', borderRadius: 10, padding: 15, gap: 12, marginTop: 4 },
  journalGlyph: { color: '#426ee5', fontSize: 19 },
  journalInput: { minHeight: 88, maxHeight: 140, backgroundColor: '#ffffff', borderRadius: 8, padding: 12, color: '#202a3b', fontSize: 12, lineHeight: 18 },
  footerNote: { color: '#6e7b91', fontSize: 10, fontWeight: '600', textAlign: 'center', paddingVertical: 7 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 62, borderTopWidth: 1, borderTopColor: '#e0e6ef', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingBottom: 4 },
  navButton: { minWidth: 82, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 },
  navButtonSelected: { backgroundColor: '#edf2ff', borderRadius: 8 },
  navSymbol: { color: '#6e7b91', fontSize: 17 },
  navLabel: { color: '#6e7b91', fontSize: 9, fontWeight: '700' },
  navTextSelected: { color: '#3459b5' },
  appearanceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9, padding: 14 },
  appearanceTitle: { color: '#202a3b', fontSize: 16, fontWeight: '800' },
  appearanceSwitch: { flexDirection: 'row', gap: 4, padding: 3, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8, backgroundColor: '#f5f7fb' },
  appearanceOption: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 7 },
  appearanceOptionSelected: { backgroundColor: '#dfe8ff' },
  appearanceOptionText: { color: '#526079', fontSize: 10, fontWeight: '800' },
});

const darkThemeStyles = StyleSheet.create({
  safeArea: { backgroundColor: '#111a28' },
  appContainer: { backgroundColor: '#111a28' },
  brandMark: { backgroundColor: '#82a4ff' },
  brandMarkText: { color: '#111a28' },
  brand: { color: '#f1f5fc' },
  liveText: { color: '#a6b3c8' },
  greeting: { color: '#f1f5fc' },
  dateLabel: { color: '#a6b3c8' },
  kicker: { color: '#a6b3c8' },
  pageTitle: { color: '#f1f5fc' },
  pageSubtitle: { color: '#a6b3c8' },
  sectionTitle: { color: '#f1f5fc' },
  overallScore: { color: '#82a4ff' },
  overallLabel: { color: '#a6b3c8' },
  activityComposerKicker: { color: '#b6caff' },
  activityCard: { borderColor: '#2d3d55', borderLeftColor: '#82a4ff', backgroundColor: '#192538' },
  activityInput: { backgroundColor: '#111a28', borderColor: '#354761', color: '#f1f5fc' },
  dateInput: { backgroundColor: '#111a28', borderColor: '#354761', color: '#f1f5fc' },
  suggestionRow: { backgroundColor: '#223149' },
  suggestionValue: { color: '#f1f5fc' },
  dimensionChip: { borderColor: '#354761', backgroundColor: '#192538' },
  dimensionText: { color: '#c0cce0' },
  pendingNote: { color: '#a6b3c8' },
  calendarCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  googleConnectButton: { backgroundColor: '#223149', borderColor: '#354761' },
  googleConnectText: { color: '#d6e2ff' },
  googleNote: { color: '#a6b3c8' },
  googleError: { color: '#ff9b9b' },
  monthArrow: { borderColor: '#354761', backgroundColor: '#223149' },
  monthArrowText: { color: '#f1f5fc' },
  weekday: { color: '#a6b3c8' },
  monthDaySelected: { backgroundColor: '#426ee5' },
  monthDayToday: { borderColor: '#82a4ff' },
  monthDayText: { color: '#e5edf9' },
  dayAgenda: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  agendaDate: { color: '#f1f5fc' },
  activityTitle: { color: '#f1f5fc' },
  activityMeta: { color: '#a6b3c8' },
  emptyState: { backgroundColor: '#223149' },
  emptyTitle: { color: '#f1f5fc' },
  emptyCopy: { color: '#a6b3c8' },
  dimensionCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  dimensionCount: { color: '#a6b3c8' },
  profileCard: { backgroundColor: '#223149' },
  profileTitle: { color: '#f1f5fc' },
  profileSubtitle: { color: '#a6b3c8' },
  profileStat: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  profileStatNumber: { color: '#f1f5fc' },
  profileStatCaption: { color: '#a6b3c8' },
  appearanceCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  appearanceTitle: { color: '#f1f5fc' },
  appearanceSwitch: { backgroundColor: '#111a28', borderColor: '#354761' },
  appearanceOptionSelected: { backgroundColor: '#2d4262' },
  appearanceOptionText: { color: '#d7e2f5' },
  journalCard: { backgroundColor: '#223149' },
  journalInput: { backgroundColor: '#192538', color: '#f1f5fc' },
  journalGlyph: { color: '#82a4ff' },
  footerNote: { color: '#a6b3c8' },
  bottomNav: { backgroundColor: '#141f2f', borderTopColor: '#2d3d55' },
  navButtonSelected: { backgroundColor: '#253a5b' },
  navSymbol: { color: '#a6b3c8' },
  navLabel: { color: '#a6b3c8' },
  navTextSelected: { color: '#b6caff' },
});