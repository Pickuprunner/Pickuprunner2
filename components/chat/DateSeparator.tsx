import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface DateSeparatorProps {
  ts: number;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function DateSeparator({ ts }: DateSeparatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.dateText}>{formatDate(ts)}</Text>
      <View style={styles.line} />
    </View>
  );
}

export default DateSeparator;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
