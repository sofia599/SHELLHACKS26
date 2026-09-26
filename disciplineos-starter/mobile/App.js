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
import { logJournalEntry, watchAssessments, watchDimensionPriorities, watchDimensions, watchScoreHistory } from './firebase.js';
import ActivityComposer from './ActivityComposer.js';
import ConfirmedActivities from './ConfirmedActivities.js';
import DimensionCalendars from './DimensionCalendars.js';
import DimensionsHub from './DimensionsHub.js';
import EmailInbox from './EmailInbox.js';
import WellnessHexagon from './WellnessHexagon.js';
import WellnessMark from './WellnessMark.js';
import { DIMENSIONS } from './wellnessModel.js';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_SCORES = Object.fromEntries(DIMENSIONS.map(({ key, initial }) => [key, initial]));
const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

function NavButton({ label, symbol, selected, onPress, styles: navStyles, wellnessIcon = false }) {
  return (
    <Pressable onPress={onPress} style={[navStyles.navButton, selected && navStyles.navButtonSelected]}>
      {wellnessIcon ? <WellnessMark size={20} /> : <Text style={[navStyles.navSymbol, selected && navStyles.navTextSelected]}>{symbol}</Text>}
      <Text style={[navStyles.navLabel, selected && navStyles.navTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [appearance, setAppearance] = useState('bright');
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [scores, setScores] = useState(DEFAULT_SCORES);
  const [priorities, setPriorities] = useState({});
  const [scoreHistory, setScoreHistory] = useState([]);
  const [assessments, setAssessments] = useState({});
  const [dimensionsInitialView, setDimensionsInitialView] = useState('calendars');
  const [googleToken, setGoogleToken] = useState(null);
  const [gmailToken, setGmailToken] = useState(null);
  const [journalText, setJournalText] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);
  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web || 'preview-disabled.apps.googleusercontent.com',
    androidClientId: GOOGLE_CLIENT_IDS.android || 'preview-disabled.apps.googleusercontent.com',
    iosClientId: GOOGLE_CLIENT_IDS.ios || 'preview-disabled.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  const [gmailRequest, gmailResponse, promptGmailAuth] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web || 'preview-disabled.apps.googleusercontent.com',
    androidClientId: GOOGLE_CLIENT_IDS.android || 'preview-disabled.apps.googleusercontent.com',
    iosClientId: GOOGLE_CLIENT_IDS.ios || 'preview-disabled.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
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
  useEffect(() => watchDimensionPriorities(setPriorities), []);
  useEffect(() => watchScoreHistory((history) => setScoreHistory(Object.values(history ?? {}).sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0)))), []);
  useEffect(() => watchAssessments(setAssessments), []);
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
  useEffect(() => {
    if (gmailResponse?.type !== 'success') return;
    setGmailToken(gmailResponse.authentication?.accessToken ?? gmailResponse.params?.access_token ?? null);
  }, [gmailResponse]);

  async function saveJournal() {
    const note = journalText.trim();
    if (!note) return;
    await logJournalEntry({ text: note, createdAt: Date.now() });
    setJournalText('');
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2500);
  }

  function openAssessment() {
    setDimensionsInitialView('assessment');
    setScreen('dimensions');
  }

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111a28' : '#f5f7fb'} />
      <View style={screenStyles.appContainer}>
        <ScrollView contentContainerStyle={screenStyles.page} showsVerticalScrollIndicator={false}>
          <View style={screenStyles.topline}>
            <WellnessMark size={30} />
            <Text style={screenStyles.brand}>DISCIPLINEOS</Text>
            <View style={screenStyles.liveTag}><View style={screenStyles.liveDot} /><Text style={screenStyles.liveText}>YOUR DAILY RESET</Text></View>
          </View>

          {screen === 'home' && (
            <>
              <View style={screenStyles.intro}>
                <Text style={screenStyles.greeting}>A little better,{ '\n' }one day at a time.</Text>
                <Text style={screenStyles.dateLabel}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              </View>

              {DIMENSIONS.some(({ key }) => !assessments[key]?.completedAt) && (
                <Pressable onPress={openAssessment} style={screenStyles.assessmentBanner}>
                  <View style={screenStyles.assessmentBannerMark}><Text style={screenStyles.assessmentBannerIcon}>✦</Text></View>
                  <View style={screenStyles.assessmentBannerCopy}><Text style={screenStyles.assessmentBannerTitle}>Set your wellness baseline</Text><Text style={screenStyles.assessmentBannerSubtitle}>24 prompts · 4 per area</Text></View>
                  <Text style={screenStyles.assessmentBannerArrow}>›</Text>
                </Pressable>
              )}

              <View style={screenStyles.wellnessHeading}>
                <View><Text style={screenStyles.kicker}>YOUR SIX DIMENSIONS</Text><Text style={screenStyles.sectionTitle}>Wellness shape</Text></View>
                <View style={screenStyles.overallBadge}><Text style={screenStyles.overallScore}>{overallScore}</Text><Text style={screenStyles.overallLabel}>OVERALL</Text></View>
              </View>
              <WellnessHexagon dimensions={DIMENSIONS} scores={scores} dark={isDark} />
              <ActivityComposer styles={screenStyles} dark={isDark} scores={scores} priorities={priorities} />
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

          {screen === 'dimensions' && <DimensionsHub styles={screenStyles} scores={scores} priorities={priorities} initialView={dimensionsInitialView} />}

          {screen === 'emails' && <EmailInbox styles={screenStyles} token={gmailToken} configured={Boolean(GOOGLE_CLIENT_IDS[Platform.OS])} onConnect={promptGmailAuth} onDisconnect={() => setGmailToken(null)} />}

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
              <View style={screenStyles.scoreHistoryCard}>
                <Text style={screenStyles.kicker}>SCORE HISTORY</Text>
                {scoreHistory.length === 0 ? (
                  <Text style={screenStyles.profileSubtitle}>Complete an assessment or record an activity outcome to begin tracking changes.</Text>
                ) : scoreHistory.slice(0, 8).map((entry, index) => {
                  const dimension = DIMENSIONS.find((item) => item.key === entry.dimension);
                  return (
                    <View key={entry.id || `${entry.createdAt}-${index}`} style={screenStyles.scoreHistoryRow}>
                      <View style={[screenStyles.dimensionDot, { backgroundColor: dimension?.color || '#426ee5' }]} />
                      <View style={screenStyles.scoreHistoryCopy}>
                        <Text style={screenStyles.scoreHistoryTitle}>{dimension?.label || entry.dimension} · {entry.reason}</Text>
                        <Text style={screenStyles.profileSubtitle}>{new Date(entry.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[screenStyles.scoreHistoryDelta, { color: entry.delta >= 0 ? '#2c9877' : '#c85f82' }]}>{entry.delta > 0 ? '+' : ''}{entry.delta}</Text>
                    </View>
                  );
                })}
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
          <NavButton styles={screenStyles} label="Dimensions" symbol="" wellnessIcon selected={screen === 'dimensions'} onPress={() => setScreen('dimensions')} />
          <NavButton styles={screenStyles} label="Email" symbol="✉" selected={screen === 'emails'} onPress={() => setScreen('emails')} />
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
  assessmentBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#d6e2f8', borderRadius: 9, backgroundColor: '#edf3ff' },
  assessmentBannerMark: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#dce7ff' },
  assessmentBannerIcon: { color: '#426ee5', fontSize: 16, fontWeight: '900' },
  assessmentBannerCopy: { flex: 1, gap: 2 },
  assessmentBannerTitle: { color: '#263d67', fontSize: 11, fontWeight: '800' },
  assessmentBannerSubtitle: { color: '#657895', fontSize: 9 },
  assessmentBannerArrow: { color: '#426ee5', fontSize: 19 },
  dimensionHubTabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 8, backgroundColor: '#eaf0fa', marginBottom: 8 },
  dimensionHubTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 6 },
  dimensionHubTabSelected: { backgroundColor: '#fff', elevation: 1 },
  dimensionHubTabText: { color: '#6e7b91', fontSize: 10, fontWeight: '700' },
  dimensionHubTabTextSelected: { color: '#3459b5' },
  priorityCard: { gap: 7, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8 },
  priorityHeading: { color: '#202a3b', fontSize: 11, fontWeight: '800' },
  priorityHelp: { color: '#6e7b91', fontSize: 9 },
  priorityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 16 },
  priorityChipText: { color: '#526079', fontSize: 8, fontWeight: '700' },
  priorityStar: { color: '#bd8b20', fontSize: 10 },
  outcomeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  outcomeDone: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 6, backgroundColor: '#e5f4ed' },
  outcomeMissed: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 6, backgroundColor: '#fff0ed' },
  outcomeButtonText: { color: '#344258', fontSize: 8, fontWeight: '800' },
  outcomeNotice: { color: '#426ee5', fontSize: 10, fontWeight: '700', marginTop: 6 },
  scheduledLabel: { color: '#6e7b91', fontSize: 8 },
  assessmentProgressCard: { padding: 12, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8, backgroundColor: '#fff', gap: 8 },
  assessmentProgressTitle: { color: '#202a3b', fontSize: 10, fontWeight: '800' },
  assessmentTrack: { height: 6, backgroundColor: '#e8edf5', borderRadius: 4, overflow: 'hidden' },
  assessmentTrackFill: { height: '100%', backgroundColor: '#426ee5', borderRadius: 4 },
  assessmentDimensionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  assessmentDimensionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '48%', padding: 8, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 7, backgroundColor: '#fff' },
  assessmentDimensionText: { flex: 1, color: '#344258', fontSize: 9, fontWeight: '700' },
  assessmentDimensionScore: { color: '#344258', fontSize: 9, fontWeight: '800' },
  assessmentCheck: { color: '#2c9877', fontSize: 10, fontWeight: '900' },
  assessmentCard: { marginTop: 4, padding: 13, gap: 12, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8, backgroundColor: '#fff' },
  assessmentCardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e9edf4' },
  assessmentScore: { fontSize: 25, fontWeight: '900' },
  assessmentQuestion: { gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#edf0f5' },
  assessmentQuestionText: { color: '#28364b', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  questionNumber: { color: '#426ee5', fontWeight: '900' },
  assessmentAnswers: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  assessmentAnswer: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dfe5ef', borderRadius: 6, backgroundColor: '#f8f9fc' },
  assessmentAnswerSelected: { backgroundColor: '#426ee5', borderColor: '#426ee5' },
  assessmentAnswerText: { color: '#526079', fontSize: 10, fontWeight: '800' },
  assessmentAnswerTextSelected: { color: '#fff' },
  assessmentScaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  assessmentScaleText: { color: '#7b8799', fontSize: 7, fontWeight: '800' },
  assessmentSaveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 2 },
  assessmentNotice: { flex: 1, color: '#6e7b91', fontSize: 8 },
  assessmentMethod: { color: '#6e7b91', fontSize: 9, lineHeight: 14 },
  emailPanel: { padding: 13, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9, backgroundColor: '#fff', gap: 8 },
  emailHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e9edf4' },
  emailLogo: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf0ff' },
  emailLogoText: { color: '#426ee5', fontWeight: '900', fontSize: 15 },
  emailHeaderCopy: { flex: 1 },
  emailHeaderTitle: { color: '#202a3b', fontSize: 11, fontWeight: '800' },
  emailButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 7, backgroundColor: '#426ee5' },
  emailButtonText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  emailRow: { flexDirection: 'row', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#edf0f5' },
  emailRowUnread: { backgroundColor: '#f6f8fd' },
  emailUnreadDot: { width: 6, height: 6, marginTop: 4, borderRadius: 4, backgroundColor: '#426ee5' },
  emailMessageCopy: { flex: 1, gap: 3 },
  emailMessageTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  emailSender: { flex: 1, color: '#344258', fontSize: 9, fontWeight: '800' },
  emailDate: { color: '#7b8799', fontSize: 8 },
  emailSubject: { color: '#202a3b', fontSize: 9, fontWeight: '700' },
  emailSnippet: { color: '#6e7b91', fontSize: 8, lineHeight: 12 },
  emailPrivacy: { color: '#6e7b91', fontSize: 8, lineHeight: 12, paddingTop: 5 },
  scoreHistoryCard: { padding: 13, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8, backgroundColor: '#fff', gap: 8 },
  scoreHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#edf0f5' },
  scoreHistoryCopy: { flex: 1, gap: 2 },
  scoreHistoryTitle: { color: '#344258', fontSize: 9, fontWeight: '700' },
  scoreHistoryDelta: { fontSize: 11, fontWeight: '900' },
  assessmentBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#d6e2f8', borderRadius: 9, backgroundColor: '#edf3ff' },
  assessmentBannerMark: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#dce7ff' },
  assessmentBannerIcon: { color: '#426ee5', fontSize: 16, fontWeight: '900' },
  assessmentBannerCopy: { flex: 1, gap: 2 },
  assessmentBannerTitle: { color: '#263d67', fontSize: 11, fontWeight: '800' },
  assessmentBannerSubtitle: { color: '#657895', fontSize: 9 },
  assessmentBannerArrow: { color: '#426ee5', fontSize: 19 },
  dimensionHubTabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 9, backgroundColor: '#eaf0fa', marginBottom: 9 },
  dimensionHubTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 7 },
  dimensionHubTabSelected: { backgroundColor: '#fff', shadowColor: '#344b71', shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  dimensionHubTabText: { color: '#6e7b91', fontSize: 10, fontWeight: '700' },
  dimensionHubTabTextSelected: { color: '#3459b5' },
  priorityCard: { gap: 7, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9 },
  priorityHeading: { color: '#202a3b', fontSize: 11, fontWeight: '800' },
  priorityHelp: { color: '#6e7b91', fontSize: 9 },
  priorityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 16 },
  priorityChipText: { color: '#526079', fontSize: 8, fontWeight: '700' },
  priorityStar: { color: '#c29432', fontSize: 10 },
  outcomeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  outcomeDone: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 7, backgroundColor: '#e5f4ed' },
  outcomeMissed: { paddingHorizontal: 7, paddingVertical: 6, borderRadius: 7, backgroundColor: '#fff0ed' },
  outcomeButtonText: { color: '#344258', fontSize: 8, fontWeight: '800' },
  outcomeNotice: { color: '#426ee5', fontSize: 10, fontWeight: '700', marginTop: 6 },
  scheduledLabel: { color: '#6e7b91', fontSize: 8 },
  assessmentProgressCard: { padding: 12, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9, backgroundColor: '#fff', gap: 8 },
  assessmentProgressTitle: { color: '#202a3b', fontSize: 10, fontWeight: '800' },
  assessmentTrack: { height: 6, backgroundColor: '#e8edf5', borderRadius: 4, overflow: 'hidden' },
  assessmentTrackFill: { height: '100%', backgroundColor: '#426ee5', borderRadius: 4 },
  assessmentDimensionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  assessmentDimensionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '48%', padding: 8, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 8, backgroundColor: '#fff' },
  assessmentDimensionText: { flex: 1, color: '#344258', fontSize: 9, fontWeight: '700' },
  assessmentDimensionScore: { color: '#344258', fontSize: 9, fontWeight: '800' },
  assessmentCheck: { color: '#2c9877', fontSize: 10, fontWeight: '900' },
  assessmentCard: { marginTop: 4, padding: 13, gap: 12, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9, backgroundColor: '#fff' },
  assessmentCardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e9edf4' },
  assessmentScore: { fontSize: 25, fontWeight: '900' },
  assessmentQuestion: { gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#edf0f5' },
  assessmentQuestionText: { color: '#28364b', fontSize: 10, lineHeight: 15, fontWeight: '650' },
  questionNumber: { color: '#426ee5', fontWeight: '900' },
  assessmentAnswers: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  assessmentAnswer: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dfe5ef', borderRadius: 7, backgroundColor: '#f8f9fc' },
  assessmentAnswerSelected: { backgroundColor: '#426ee5', borderColor: '#426ee5' },
  assessmentAnswerText: { color: '#526079', fontSize: 10, fontWeight: '800' },
  assessmentAnswerTextSelected: { color: '#fff' },
  assessmentScaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  assessmentScaleText: { color: '#7b8799', fontSize: 7, fontWeight: '800' },
  assessmentSaveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 2 },
  assessmentNotice: { flex: 1, color: '#6e7b91', fontSize: 8 },
  assessmentMethod: { color: '#6e7b91', fontSize: 9, lineHeight: 14 },
  emailPanel: { padding: 13, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 10, backgroundColor: '#fff', gap: 8 },
  emailHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e9edf4' },
  emailLogo: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf0ff' },
  emailLogoText: { color: '#426ee5', fontWeight: '900', fontSize: 15 },
  emailHeaderCopy: { flex: 1 },
  emailHeaderTitle: { color: '#202a3b', fontSize: 11, fontWeight: '800' },
  emailButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 7, backgroundColor: '#426ee5' },
  emailButtonText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  emailRow: { flexDirection: 'row', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#edf0f5' },
  emailRowUnread: { backgroundColor: '#f6f8fd' },
  emailUnreadDot: { width: 6, height: 6, marginTop: 4, borderRadius: 4, backgroundColor: '#426ee5' },
  emailMessageCopy: { flex: 1, gap: 3 },
  emailMessageTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  emailSender: { flex: 1, color: '#344258', fontSize: 9, fontWeight: '800' },
  emailDate: { color: '#7b8799', fontSize: 8 },
  emailSubject: { color: '#202a3b', fontSize: 9, fontWeight: '700' },
  emailSnippet: { color: '#6e7b91', fontSize: 8, lineHeight: 12 },
  emailPrivacy: { color: '#6e7b91', fontSize: 8, lineHeight: 12, paddingTop: 5 },
  scoreHistoryCard: { padding: 13, borderWidth: 1, borderColor: '#e0e6ef', borderRadius: 9, backgroundColor: '#fff', gap: 8 },
  scoreHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#edf0f5' },
  scoreHistoryCopy: { flex: 1, gap: 2 },
  scoreHistoryTitle: { color: '#344258', fontSize: 9, fontWeight: '700' },
  scoreHistoryDelta: { fontSize: 11, fontWeight: '900' },
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
  assessmentBanner: { backgroundColor: '#1d2c43', borderColor: '#354761' },
  assessmentBannerMark: { backgroundColor: '#2d4262' },
  assessmentBannerTitle: { color: '#e7efff' },
  assessmentBannerSubtitle: { color: '#a6b3c8' },
  dimensionHubTabs: { backgroundColor: '#192538' },
  dimensionHubTabSelected: { backgroundColor: '#2d4262' },
  dimensionHubTabText: { color: '#a6b3c8' },
  dimensionHubTabTextSelected: { color: '#e7efff' },
  priorityCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  priorityHeading: { color: '#f1f5fc' },
  priorityHelp: { color: '#a6b3c8' },
  priorityChip: { borderColor: '#354761' },
  priorityChipText: { color: '#c0cce0' },
  outcomeDone: { backgroundColor: '#203d3a' },
  outcomeMissed: { backgroundColor: '#493035' },
  outcomeButtonText: { color: '#e5edf9' },
  outcomeNotice: { color: '#9cb7ff' },
  scheduledLabel: { color: '#a6b3c8' },
  assessmentProgressCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  assessmentProgressTitle: { color: '#f1f5fc' },
  assessmentTrack: { backgroundColor: '#354761' },
  assessmentDimensionButton: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  assessmentDimensionText: { color: '#e5edf9' },
  assessmentDimensionScore: { color: '#e5edf9' },
  assessmentCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  assessmentCardHeading: { borderBottomColor: '#2d3d55' },
  assessmentQuestion: { borderBottomColor: '#2d3d55' },
  assessmentQuestionText: { color: '#e5edf9' },
  assessmentAnswer: { backgroundColor: '#111a28', borderColor: '#354761' },
  assessmentAnswerText: { color: '#c0cce0' },
  assessmentScaleText: { color: '#a6b3c8' },
  assessmentNotice: { color: '#a6b3c8' },
  assessmentMethod: { color: '#a6b3c8' },
  emailPanel: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  emailHeader: { borderBottomColor: '#2d3d55' },
  emailLogo: { backgroundColor: '#2d4262' },
  emailLogoText: { color: '#d6e2ff' },
  emailHeaderTitle: { color: '#f1f5fc' },
  emailRow: { borderBottomColor: '#2d3d55' },
  emailRowUnread: { backgroundColor: '#223149' },
  emailSender: { color: '#e5edf9' },
  emailDate: { color: '#a6b3c8' },
  emailSubject: { color: '#f1f5fc' },
  emailSnippet: { color: '#a6b3c8' },
  emailPrivacy: { color: '#a6b3c8' },
  scoreHistoryCard: { backgroundColor: '#192538', borderColor: '#2d3d55' },
  scoreHistoryRow: { borderTopColor: '#2d3d55' },
  scoreHistoryTitle: { color: '#e5edf9' },
});