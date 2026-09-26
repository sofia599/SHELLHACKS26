import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { recordActivityOutcome, watchActivities } from './firebase.js';
import { DIMENSIONS, localDateKey } from './activityRules.js';
import { fetchGoogleEvents, syncGoogleActivities } from './googleCalendar.js';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function monthDays(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days = Array(offset).fill(null);
  for (let day = 1; day <= count; day += 1) days.push(new Date(year, month, day));
  while (days.length % 7) days.push(null);
  return days;
}

export default function ConfirmedActivities({ styles, googleToken, googleConfigured, googleBusy, onConnect, onDisconnect }) {
  const [activities, setActivities] = useState({});
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [googleEvents, setGoogleEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [outcomeNotice, setOutcomeNotice] = useState('');

  useEffect(() => watchActivities((value) => setActivities(value ?? {})), []);

  const confirmed = useMemo(() => Object.values(activities)
    .filter((activity) => activity.status === 'confirmed')
    .sort((left, right) => left.date.localeCompare(right.date)), [activities]);
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const localMonthEvents = useMemo(() => confirmed.filter((activity) => activity.date.startsWith(monthPrefix)), [confirmed, monthPrefix]);

  useEffect(() => {
    if (!googleToken) {
      setGoogleEvents([]);
      return undefined;
    }
    let cancelled = false;
    const start = `${monthPrefix}-01`;
    const end = localDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    setSyncing(true);
    Promise.all([
      fetchGoogleEvents(googleToken, start, end),
      syncGoogleActivities(googleToken, localMonthEvents),
    ])
      .then(([events]) => {
        if (!cancelled) setGoogleEvents(events);
      })
      .catch((error) => {
        if (!cancelled) setGoogleError(error.message);
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => { cancelled = true; };
  }, [googleToken, month, monthPrefix, localMonthEvents]);

  const externalEvents = googleEvents.filter((event) => !confirmed.some((activity) => activity.id === event.disciplineOsActivityId));
  const monthEvents = [...localMonthEvents, ...externalEvents];
  const dayEvents = monthEvents.filter((event) => event.date === selectedDate);
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = localDateKey(new Date());

  function shiftMonth(offset) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(nextMonth);
    setSelectedDate(localDateKey(nextMonth));
  }

  async function connect() {
    setGoogleError('');
    try {
      await onConnect();
    } catch (error) {
      setGoogleError(error.message || 'Google sign-in did not complete.');
    }
  }

  async function recordOutcome(activity, outcome) {
    const result = await recordActivityOutcome(activity.id, outcome);
    setOutcomeNotice(result.committed
      ? `${activity.dimension} ${outcome === 'completed' ? '+4' : '−3'} · score ${result.score}`
      : 'Outcome already recorded.');
  }

  return (
    <View style={styles.calendarCard}>
      <View style={styles.googleCalendarHeader}>
        <View><Text style={styles.kicker}>YOUR WEEK AT A GLANCE</Text><Text style={styles.sectionTitle}>Main calendar</Text></View>
        {googleToken ? (
          <Pressable onPress={onDisconnect} style={styles.googleConnectButton}><Text style={styles.googleConnectText}>Disconnect</Text></Pressable>
        ) : (
          <Pressable disabled={!googleConfigured || googleBusy} onPress={connect} style={[styles.googleConnectButton, (!googleConfigured || googleBusy) && styles.disabledAction]}>
            <Text style={styles.googleConnectText}>{googleBusy ? 'Loading…' : 'Connect Google'}</Text>
          </Pressable>
        )}
      </View>
      {!googleConfigured && <Text style={styles.googleNote}>Google Calendar isn’t configured for this app.</Text>}
      {!!googleError && <Text style={styles.googleError}>{googleError}</Text>}
      <View style={styles.monthHeader}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></Pressable>
        <Text style={styles.sectionTitle}>{monthLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></Pressable>
      </View>
      <View style={styles.monthGrid}>
        {WEEKDAYS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
        {monthDays(month.getFullYear(), month.getMonth()).map((date, index) => {
          if (!date) return <View key={`blank-${index}`} style={styles.monthBlank} />;
          const key = localDateKey(date);
          const events = monthEvents.filter((event) => event.date === key);
          const selected = key === selectedDate;
          return (
            <Pressable key={key} onPress={() => setSelectedDate(key)} style={[styles.monthDay, styles.mainMonthDay, selected && styles.monthDaySelected, key === today && styles.monthDayToday]}>
              <Text style={[styles.monthDayText, selected && styles.monthDayTextSelected]}>{date.getDate()}</Text>
              <View style={styles.googleEventDots}>
                {events.slice(0, 3).map((event) => {
                  const dimension = DIMENSIONS.find((item) => item.key === event.dimension);
                  return <View key={event.id} style={[styles.googleEventDot, { backgroundColor: dimension?.color || '#4285f4' }]} />;
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.mainAgenda}>
        <View style={styles.cardHeading}>
          <Text style={styles.agendaDate}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
          <Text style={styles.pendingNote}>{dayEvents.length} events{syncing ? ' · syncing' : ''}</Text>
        </View>
        {dayEvents.length === 0 ? (
          <Text style={styles.emptyCopy}>No events on this day.</Text>
        ) : dayEvents.map((event) => {
          const dimension = DIMENSIONS.find((item) => item.key === event.dimension);
          const activity = event.source !== 'google' ? activities[event.id] : null;
          return (
            <View key={`${event.source || 'local'}-${event.id}`} style={styles.activityRow}>
              <View style={[styles.activityAccent, { backgroundColor: dimension?.color || '#4285f4' }]} />
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{event.title}</Text>
                <Text style={styles.activityMeta}>{activity?.outcome ? `${activity.outcome.status === 'completed' ? 'Completed' : 'Not completed'} · ${activity.outcome.delta > 0 ? '+' : ''}${activity.outcome.delta} pts` : event.source === 'google' ? 'Google Calendar' : dimension?.label || 'Confirmed activity'}{event.startTime ? ` · ${new Date(event.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</Text>
              </View>
              {event.htmlLink && <Pressable onPress={() => Linking.openURL(event.htmlLink)}><Text style={styles.calendarLink}>↗</Text></Pressable>}
              {activity && !activity.outcome && selectedDate <= today && (
                <View style={styles.outcomeActions}>
                  <Pressable onPress={() => recordOutcome(activity, 'completed')} style={styles.outcomeDone}><Text style={styles.outcomeButtonText}>Done +4</Text></Pressable>
                  <Pressable onPress={() => recordOutcome(activity, 'missed')} style={styles.outcomeMissed}><Text style={styles.outcomeButtonText}>Missed −3</Text></Pressable>
                </View>
              )}
            </View>
          );
        })}
        {!!outcomeNotice && <Text style={styles.outcomeNotice}>{outcomeNotice}</Text>}
      </View>
    </View>
  );
}