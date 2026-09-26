import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { confirmActivity, watchActivities } from './firebase.js';
import { DIMENSIONS, localDateKey } from './activityRules.js';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function monthDays(year, month) {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days = Array(startOffset).fill(null);
  for (let day = 1; day <= count; day += 1) days.push(new Date(year, month, day));
  while (days.length % 7) days.push(null);
  return days;
}

export default function DimensionCalendars({ styles }) {
  const [dimensionKey, setDimensionKey] = useState(DIMENSIONS[0].key);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [activities, setActivities] = useState({});

  useEffect(() => watchActivities((value) => setActivities(value ?? {})), []);

  const dimension = DIMENSIONS.find((item) => item.key === dimensionKey);
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthActivities = useMemo(() => Object.values(activities)
    .filter((activity) => activity.dimension === dimensionKey && activity.date.startsWith(monthPrefix))
    .sort((left, right) => left.date.localeCompare(right.date)), [activities, dimensionKey, monthPrefix]);
  const selectedActivities = monthActivities.filter((activity) => activity.date === selectedDate);

  function shiftMonth(offset) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(localDateKey(next));
  }

  return (
    <View style={styles.screenSection}>
      <Text style={styles.kicker}>PLAN WITH INTENTION</Text>
      <Text style={styles.pageTitle}>Dimension calendars</Text>
      <Text style={styles.pageSubtitle}>Review each area, then confirm plans for your main calendar.</Text>

      <View style={styles.dimensionGrid}>
        {DIMENSIONS.map((item) => {
          const count = Object.values(activities).filter((activity) => activity.dimension === item.key).length;
          return (
            <Pressable
              key={item.key}
              onPress={() => setDimensionKey(item.key)}
              style={[styles.dimensionCard, dimensionKey === item.key && { borderColor: item.color, backgroundColor: `${item.color}12` }]}
            >
              <View style={[styles.dimensionDot, { backgroundColor: item.color }]} />
              <Text style={styles.dimensionText}>{item.label}</Text>
              <Text style={styles.dimensionCount}>{count}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => shiftMonth(-1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></Pressable>
          <View style={styles.monthTitleBlock}>
            <Text style={styles.kicker}>{dimension.label.toUpperCase()}</Text>
            <Text style={styles.sectionTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
          </View>
          <Pressable onPress={() => shiftMonth(1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></Pressable>
        </View>
        <View style={styles.monthGrid}>
          {WEEKDAYS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
          {monthDays(month.getFullYear(), month.getMonth()).map((date, index) => {
            if (!date) return <View key={`blank-${index}`} style={styles.monthBlank} />;
            const key = localDateKey(date);
            const hasActivity = monthActivities.some((activity) => activity.date === key);
            const isSelected = selectedDate === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedDate(key)}
                style={[styles.monthDay, isSelected && styles.monthDaySelected, key === localDateKey(new Date()) && styles.monthDayToday]}
              >
                <Text style={[styles.monthDayText, isSelected && styles.monthDayTextSelected]}>{date.getDate()}</Text>
                <View style={[styles.monthDayMark, { backgroundColor: hasActivity ? dimension.color : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.dayAgenda}>
        <View style={styles.cardHeading}>
          <View><Text style={styles.kicker}>SELECTED DAY</Text><Text style={styles.sectionTitle}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text></View>
          <Text style={styles.pendingNote}>{selectedActivities.length} activities</Text>
        </View>
        {selectedActivities.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyTitle}>No activities for this day</Text><Text style={styles.emptyCopy}>Add an activity from Home to place it here.</Text></View>
        ) : selectedActivities.map((activity) => (
          <View key={activity.id} style={styles.activityRow}>
            <View style={[styles.activityAccent, { backgroundColor: dimension.color }]} />
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityMeta}>{activity.status === 'confirmed' ? 'Confirmed for main calendar' : 'Pending confirmation'}</Text>
            </View>
            {activity.status === 'confirmed' ? (
              <Text style={styles.confirmedMark}>✓</Text>
            ) : (
              <Pressable onPress={() => confirmActivity(activity.id)} style={styles.confirmButton}><Text style={styles.confirmButtonText}>Confirm</Text></Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}