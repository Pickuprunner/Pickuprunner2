import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius } from '@/constants/design';

export type AdminTab = 'overview' | 'docs' | 'bgcheck';

export interface AdminTabToggleProps {
  value: AdminTab;
  onChange: (tab: AdminTab) => void;
  pendingDocs?: number;
  pendingBG?: number;
}

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'docs', label: 'Docs' },
  { id: 'bgcheck', label: 'BG Check' },
];

export function AdminTabToggle({
  value,
  onChange,
  pendingDocs = 0,
  pendingBG = 0,
}: AdminTabToggleProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = TABS.findIndex((t) => t.id === value);
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex >= 0 ? activeIndex : 0,
      useNativeDriver: false,
      bounciness: 4,
      speed: 18,
    }).start();
  }, [activeIndex]);

  const padding = 5;
  const tabWidth = containerWidth > 0 ? (containerWidth - padding * 2) / TABS.length : 0;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
    extrapolate: 'clamp',
  });

  const handleSelect = (tab: AdminTab) => {
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
      {/* Sliding Active Indicator */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Tabs */}
      {TABS.map((tab) => {
        const isActive = tab.id === value;
        const badgeCount =
          tab.id === 'docs' ? pendingDocs : tab.id === 'bgcheck' ? pendingBG : 0;

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
                isActive ? styles.tabTextActive : styles.tabTextInactive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>

            {badgeCount > 0 && (
              <View
                style={[
                  styles.badge,
                  isActive ? styles.badgeActive : styles.badgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isActive ? styles.badgeTextActive : styles.badgeTextInactive,
                  ]}
                >
                  {badgeCount}
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.full,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    height: 48,
    alignItems: 'center',
  },
  slidingPill: {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer, // #0066FF
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
    zIndex: 1,
    gap: 4,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  tabTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: colors.onSurfaceVariant,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.full,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  badgeActive: {
    backgroundColor: colors.onPrimaryContainer, // #F8F7FF
  },
  badgeInactive: {
    backgroundColor: 'rgba(244, 195, 0, 0.12)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: colors.primaryContainer, // #0066FF
  },
  badgeTextInactive: {
    color: '#FFE399',
  },
});
