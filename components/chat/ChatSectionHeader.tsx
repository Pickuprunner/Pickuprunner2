import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ChatSectionHeaderProps {
  title: string;
  count?: number;
  marginTop?: number;
}

export function ChatSectionHeader({ title, count, marginTop = 0 }: ChatSectionHeaderProps) {
  return (
    <View style={[styles.container, { marginTop }]}>
      <Text style={styles.title}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export default ChatSectionHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(194, 198, 216, 0.45)',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(194, 198, 216, 0.7)',
    letterSpacing: 0.4,
  },
});
