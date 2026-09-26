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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#15101d' : '#fbf5fa'} />
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
                <TextInput value={journalText} onChangeText={setJournalText} placeholder="What is on your mind today?" placeholderTextColor={isDark ? '#b7a6bf' : '#84948a'} multiline textAlignVertical="top" style={screenStyles.journalInput} />
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
  safeArea: { flex: 1, backgroundColor: '#fbf5fa' },
  appContainer: { flex: 1 },
  page: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 18 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#f05ba8', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  brand: { color: '#38253e', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  liveDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#15966a' },
  liveText: { color: '#6d8176', fontSize: 8, fontWeight: '800' },
  intro: { gap: 7 },
  greeting: { color: '#38253e', fontSize: 31, fontWeight: '800', lineHeight: 36 },
  dateLabel: { color: '#806f87', fontSize: 13, fontWeight: '500' },
  kicker: { color: '#78877d', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  wellnessHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#38253e', fontSize: 20, fontWeight: '800' },
  overallBadge: { alignItems: 'flex-end' },
  overallScore: { color: '#e34f9b', fontSize: 22, fontWeight: '900' },
  overallLabel: { color: '#84948a', fontSize: 8, fontWeight: '800' },
  screenSection: { gap: 10, paddingTop: 4 },
  pageTitle: { color: '#20372b', fontSize: 27, fontWeight: '800' },
  pageSubtitle: { color: '#718278', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  activityCard: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#eed8e9', borderLeftWidth: 3, borderLeftColor: '#f05ba8', borderRadius: 13, padding: 10, gap: 6 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityComposerKicker: { color: '#b66599', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  activityQuickRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityInput: { minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#eadce9', backgroundColor: '#fffafd', paddingHorizontal: 9, color: '#38253e', fontSize: 11 },
  activityTitleInput: { flex: 1 },
  dateInput: { minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#eadce9', backgroundColor: '#fffafd', paddingHorizontal: 7, color: '#38253e', fontSize: 10 },
  activityDateInput: { flex: 0.8 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 7, backgroundColor: '#f9edf6', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  suggestionLabel: { color: '#78877d', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  suggestionValue: { color: '#38253e', fontSize: 10, fontWeight: '700' },
  dimensionChips: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 10 },
  dimensionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#eadce9', borderRadius: 16, paddingHorizontal: 7, paddingVertical: 5 },
  dimensionDot: { width: 7, height: 7, borderRadius: 4 },
  dimensionText: { color: '#806f87', fontSize: 8, fontWeight: '700' },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pendingNote: { color: '#84948a', fontSize: 9, fontWeight: '600' },
  smallAction: { backgroundColor: '#f05ba8', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  disabledAction: { opacity: 0.55 },
  smallActionText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  calendarCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e9e2', borderRadius: 17, padding: 16, gap: 8 },
  googleCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  googleConnectButton: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#edf5e8', borderWidth: 1, borderColor: '#d2e2d0', borderRadius: 9 },
  googleConnectText: { color: '#395c47', fontSize: 9, fontWeight: '800' },
  googleNote: { color: '#84948a', fontSize: 9 },
  googleError: { color: '#b23c35', fontSize: 10 },
  mainMonthDay: { aspectRatio: 1.18 },
  googleEventDots: { position: 'absolute', bottom: 4, flexDirection: 'row', gap: 3 },
  googleEventDot: { width: 4, height: 4, borderRadius: 3 },
  mainAgenda: { borderTopWidth: 1, borderTopColor: '#e9eee9', marginTop: 10, paddingTop: 11, gap: 5 },
  agendaDate: { color: '#304638', fontSize: 12, fontWeight: '800' },
  calendarLink: { color: '#4b7b5c', fontSize: 16 },
  emptyState: { backgroundColor: '#f5f8f4', borderRadius: 11, padding: 14, gap: 4 },
  emptyTitle: { color: '#304638', fontSize: 12, fontWeight: '800' },
  emptyCopy: { color: '#718278', fontSize: 10, lineHeight: 15 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderTopWidth: 1, borderTopColor: '#edf1ed', paddingVertical: 9 },
  activityAccent: { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  activityCopy: { flex: 1, gap: 4 },
  activityTitle: { color: '#263a2e', fontSize: 12, fontWeight: '800' },
  activityMeta: { color: '#84948a', fontSize: 9 },
  confirmedMark: { color: '#398154', fontSize: 16, fontWeight: '900', paddingHorizontal: 5 },
  dimensionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 6 },
  dimensionCard: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%', paddingHorizontal: 9, paddingVertical: 10, borderWidth: 1, borderColor: '#dce7df', backgroundColor: '#fff', borderRadius: 11 },
  dimensionCount: { marginLeft: 'auto', color: '#84948a', fontSize: 9 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitleBlock: { alignItems: 'center' },
  monthArrow: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dce7df', borderRadius: 10 },
  monthArrowText: { color: '#304638', fontSize: 21, lineHeight: 24 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: '#84948a', fontSize: 9, fontWeight: '700', paddingVertical: 7 },
  monthBlank: { width: '14.2857%', aspectRatio: 1 },
  monthDay: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  monthDaySelected: { backgroundColor: '#263c30' },
  monthDayToday: { borderWidth: 1, borderColor: '#a8c7ad' },
  monthDayText: { color: '#304638', fontSize: 11, fontWeight: '600' },
  monthDayTextSelected: { color: '#fff' },
  monthDayMark: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 3 },
  dayAgenda: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e9e2', borderRadius: 17, padding: 16, marginTop: 12, gap: 8 },
  confirmButton: { backgroundColor: '#d9f05a', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  confirmButtonText: { color: '#26382c', fontSize: 9, fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#e8f3e6', borderRadius: 17, padding: 16, marginTop: 10 },
  profileAvatar: { width: 54, height: 54, borderRadius: 17, backgroundColor: '#dceaf0', alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: '#385b4a', fontSize: 23, fontWeight: '900' },
  profileCopy: { flex: 1 },
  profileTitle: { color: '#20372b', fontSize: 17, fontWeight: '800' },
  profileSubtitle: { color: '#718278', fontSize: 9, marginTop: 4 },
  profileStats: { flexDirection: 'row', gap: 9, marginVertical: 12 },
  profileStat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e9e2', borderRadius: 15, padding: 13 },
  profileStatNumber: { color: '#20372b', fontSize: 27, fontWeight: '900' },
  profileStatCaption: { color: '#84948a', fontSize: 9, marginTop: 3 },
  journalCard: { backgroundColor: '#e4f3e9', borderRadius: 17, padding: 16, gap: 12, marginTop: 4 },
  journalGlyph: { color: '#438261', fontSize: 19 },
  journalInput: { minHeight: 88, maxHeight: 140, backgroundColor: '#ffffffbf', borderRadius: 11, padding: 12, color: '#26382c', fontSize: 12, lineHeight: 18 },
  footerNote: { color: '#84948a', fontSize: 10, fontWeight: '600', textAlign: 'center', paddingVertical: 7 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 62, borderTopWidth: 1, borderTopColor: '#dce7df', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingBottom: 4 },
  navButton: { minWidth: 82, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 },
  navButtonSelected: { backgroundColor: '#eff5e9', borderRadius: 14 },
  navSymbol: { color: '#819086', fontSize: 17 },
  navLabel: { color: '#819086', fontSize: 9, fontWeight: '700' },
  navTextSelected: { color: '#b63e83' },
  appearanceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadce9', borderRadius: 14, padding: 14 },
  appearanceTitle: { color: '#38253e', fontSize: 16, fontWeight: '800' },
  appearanceSwitch: { flexDirection: 'row', gap: 4, padding: 3, borderWidth: 1, borderColor: '#eadce9', borderRadius: 10, backgroundColor: '#fbf5fa' },
  appearanceOption: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 7 },
  appearanceOptionSelected: { backgroundColor: '#f4e0ef' },
  appearanceOptionText: { color: '#594462', fontSize: 10, fontWeight: '800' },
});

const darkThemeStyles = StyleSheet.create({
  safeArea: { backgroundColor: '#15101d' },
  appContainer: { backgroundColor: '#15101d' },
  brandMark: { backgroundColor: '#ff72b8' },
  brandMarkText: { color: '#211626' },
  brand: { color: '#f7eefb' },
  liveText: { color: '#c6b5ce' },
  greeting: { color: '#f7eefb' },
  dateLabel: { color: '#b7a6bf' },
  kicker: { color: '#c4a9ca' },
  pageTitle: { color: '#f7eefb' },
  pageSubtitle: { color: '#b7a6bf' },
  sectionTitle: { color: '#f7eefb' },
  overallScore: { color: '#ff72b8' },
  overallLabel: { color: '#b7a6bf' },
  activityComposerKicker: { color: '#e9a5d1' },
  activityCard: { borderColor: '#52364e', borderLeftColor: '#ff72b8', backgroundColor: '#1d1727' },
  activityInput: { backgroundColor: '#211a2b', borderColor: '#4b3b58', color: '#f7eefb' },
  dateInput: { backgroundColor: '#211a2b', borderColor: '#4b3b58', color: '#f7eefb' },
  suggestionRow: { backgroundColor: '#302338' },
  suggestionValue: { color: '#f7eefb' },
  dimensionChip: { borderColor: '#51415e', backgroundColor: '#211a2b' },
  dimensionText: { color: '#cab8d1' },
  pendingNote: { color: '#b7a6bf' },
  calendarCard: { backgroundColor: '#211a2b', borderColor: '#40334c' },
  googleConnectButton: { backgroundColor: '#302338', borderColor: '#51415e' },
  googleConnectText: { color: '#f5c3df' },
  googleNote: { color: '#b7a6bf' },
  googleError: { color: '#ff9b9b' },
  monthArrow: { borderColor: '#51415e', backgroundColor: '#2c2237' },
  monthArrowText: { color: '#f7eefb' },
  weekday: { color: '#b7a6bf' },
  monthDaySelected: { backgroundColor: '#71345f' },
  monthDayToday: { borderColor: '#cf76ad' },
  monthDayText: { color: '#eaddec' },
  dayAgenda: { backgroundColor: '#211a2b', borderColor: '#40334c' },
  agendaDate: { color: '#f7eefb' },
  activityTitle: { color: '#f7eefb' },
  activityMeta: { color: '#b7a6bf' },
  emptyState: { backgroundColor: '#2c2237' },
  emptyTitle: { color: '#f7eefb' },
  emptyCopy: { color: '#b7a6bf' },
  dimensionCard: { backgroundColor: '#211a2b', borderColor: '#40334c' },
  dimensionCount: { color: '#b7a6bf' },
  profileCard: { backgroundColor: '#302338' },
  profileTitle: { color: '#f7eefb' },
  profileSubtitle: { color: '#b7a6bf' },
  profileStat: { backgroundColor: '#211a2b', borderColor: '#40334c' },
  profileStatNumber: { color: '#f7eefb' },
  profileStatCaption: { color: '#b7a6bf' },
  appearanceCard: { backgroundColor: '#211a2b', borderColor: '#40334c' },
  appearanceTitle: { color: '#f7eefb' },
  appearanceSwitch: { backgroundColor: '#17121f', borderColor: '#51415e' },
  appearanceOptionSelected: { backgroundColor: '#57314f' },
  appearanceOptionText: { color: '#e7d5ed' },
  journalCard: { backgroundColor: '#302338' },
  journalInput: { backgroundColor: '#211a2b', color: '#f7eefb' },
  journalGlyph: { color: '#f28fc9' },
  footerNote: { color: '#b7a6bf' },
  bottomNav: { backgroundColor: '#1b1525', borderTopColor: '#40334c' },
  navButtonSelected: { backgroundColor: '#38243d' },
  navSymbol: { color: '#b7a6bf' },
  navLabel: { color: '#b7a6bf' },
  navTextSelected: { color: '#ff9bd0' },
});