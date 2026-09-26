import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { addActivity } from './firebase.js';
import { DIMENSIONS, localDateKey, suggestDimension } from './activityRules.js';

export default function ActivityComposer({ styles, dark = false }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => localDateKey(new Date()));
  const [dimension, setDimension] = useState(null);
  const [saved, setSaved] = useState(false);
  const suggestion = suggestDimension(title);

  useEffect(() => {
    setDimension(suggestion);
  }, [suggestion]);

  async function submit() {
    if (!title.trim() || !dimension || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    await addActivity({ title: title.trim(), date, dimension, status: 'pending', createdAt: Date.now() });
    setTitle('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  return (
    <View style={styles.activityCard}>
      <View style={styles.cardHeading}>
        <Text style={styles.sectionTitle}>Add an activity</Text>
        <Text style={styles.activityComposerKicker}>SMART ROUTING</Text>
      </View>
      <View style={styles.activityQuickRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What are you planning?"
          placeholderTextColor={dark ? '#b7a6bf' : '#84948a'}
          maxLength={100}
          style={[styles.activityInput, styles.activityTitleInput]}
        />
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          accessibilityLabel="Activity date"
          style={[styles.dateInput, styles.activityDateInput]}
        />
      </View>
      <View style={styles.suggestionRow}>
        <View style={[styles.dimensionDot, { backgroundColor: DIMENSIONS.find((item) => item.key === dimension)?.color || '#f05ba8' }]} />
        <Text style={styles.suggestionValue}>
          {dimension ? `${DIMENSIONS.find((item) => item.key === dimension).label}${suggestion ? ' · suggested' : ''}` : 'Choose below'}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dimensionChips}>
        {DIMENSIONS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setDimension(item.key)}
            style={[styles.dimensionChip, dimension === item.key && { borderColor: item.color, backgroundColor: `${item.color}16` }]}
          >
            <View style={[styles.dimensionDot, { backgroundColor: item.color }]} />
            <Text style={styles.dimensionText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.activityFooter}>
        <Text style={styles.pendingNote}>Pending review</Text>
        <Pressable disabled={!title.trim() || !dimension} onPress={submit} style={[styles.smallAction, (!title.trim() || !dimension) && styles.disabledAction]}>
          <Text style={styles.smallActionText}>{saved ? 'Added' : 'Add activity'}</Text>
        </Pressable>
      </View>
    </View>
  );
}