import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius } from '@/constants/design';

export type SubTabFilter = 'pending' | 'resolved' | 'all';

export interface AdminSubTabToggleProps {
  value: SubTabFilter;
  onChange: (tab: SubTabFilter) => void;
  pendingCount?: number;
  resolvedCount?: number;
}

const SUB_TABS: { id: SubTabFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
];

export function AdminSubTabToggle({
  value,
  onChange,
  pendingCount = 0,
  resolvedCount = 0,
}: AdminSubTabToggleProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = SUB_TABS.findIndex((t) => t.id === value);
  const slideAnim = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex >= 0 ? activeIndex : 0,
      useNativeDriver: false,
      bounciness: 4,
      speed: 18,
    }).start();
  }, [activeIndex]);

  const padding = 3;
  const tabWidth = containerWidth > 0 ? (containerWidth - padding * 2) / SUB_TABS.length : 0;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
    extrapolate: 'clamp',
  });

  const backgroundColor = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      'rgba(244, 195, 0, 0.16)',
      'rgba(0, 226, 151, 0.16)',
      'rgba(0, 102, 255, 0.16)',
    ],
    extrapolate: 'clamp',
  });

  const borderColor = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      'rgba(244, 195, 0, 0.45)',
      'rgba(0, 226, 151, 0.45)',
      'rgba(0, 102, 255, 0.45)',
    ],
    extrapolate: 'clamp',
  });

  const handleSelect = (tab: SubTabFilter) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(tab);
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== containerWidth) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Fluid Sliding Active Pill */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: tabWidth,
              transform: [{ translateX }],
              backgroundColor,
              borderColor,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Tab Buttons */}
      {SUB_TABS.map((tab) => {
        const isActive = tab.id === value;
        const count = tab.id === 'pending' ? pendingCount : tab.id === 'resolved' ? resolvedCount : 0;

        return (
          <Pressable
            key={tab.id}
            onPress={() => handleSelect(tab.id)}
            style={styles.tabBtn}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: true }}
          >
            <Text
              style={[
                styles.tabText,
                isActive && (tab.id === 'pending' ? styles.textPending : tab.id === 'resolved' ? styles.textResolved : styles.textAll),
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>

            {count > 0 && (
              <View
                style={[
                  styles.badge,
                  isActive
                    ? (tab.id === 'pending' ? styles.badgePending : styles.badgeResolved)
                    : styles.badgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isActive
                      ? (tab.id === 'pending' ? styles.badgeTextPending : styles.badgeTextResolved)
                      : styles.badgeTextInactive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 6,
    width: '100%',
    position: 'relative',
    height: 38,
  },
  slidingPill: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 4,
    borderRadius: borderRadius.full,
    gap: 5,
    zIndex: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  textPending: {
    color: '#FFE399',
    fontWeight: '700',
  },
  textResolved: {
    color: '#00E297',
    fontWeight: '700',
  },
  textAll: {
    color: '#B3C5FF',
    fontWeight: '700',
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePending: {
    backgroundColor: '#FFE399',
  },
  badgeResolved: {
    backgroundColor: '#00E297',
  },
  badgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: '#2A2000',
    fontWeight: '800',
  },
  badgeTextResolved: {
    color: '#003822',
    fontWeight: '800',
  },
  badgeTextInactive: {
    color: colors.outline,
  },
});
