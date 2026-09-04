import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, LayoutChangeEvent, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CustomHeader } from '@/components/core';
import { colors } from '@/constants/design';
import { MAX_QUEUE } from '@/lib/driverQueue';

const GOLD = '#FFE399';
const GREEN = '#00E297';

interface Props {
  pendingCount: number;
  queueCount: number;
  completedCount?: number;
  atCapacity: boolean;
  isConnected: boolean;
  isOnline?: boolean;
  onToggleOnline?: () => void;
  search?: string;
  onSearchChange?: (text: string) => void;
  showSearch?: boolean;
  onFilterPress?: () => void;
  showAvatar?: boolean;
  avatar?: string;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
  sticky?: boolean;
  translateY?: Animated.Value | Animated.AnimatedInterpolation<number>;
  animatedOpacity?: Animated.Value | Animated.AnimatedInterpolation<number>;
  onLayout?: (event: LayoutChangeEvent) => void;
  sortBy?: 'newest' | 'oldest';
  onSortChange?: (sort: 'newest' | 'oldest') => void;
}

export function OrdersHeader({
  pendingCount,
  queueCount,
  completedCount,
  atCapacity,
  isConnected,
  isOnline = true,
  onToggleOnline,
  search = '',
  onSearchChange,
  showSearch = false,
  onFilterPress,
  showAvatar = true,
  avatar = 'D',
  avatarUrl,
  onAvatarPress,
  sticky = false,
  translateY,
  animatedOpacity,
  onLayout,
  sortBy = 'newest',
  onSortChange,
}: Props) {
  const [toggleWidth, setToggleWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(sortBy === 'oldest' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: sortBy === 'oldest' ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [sortBy]);

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const pills = (
    <View style={styles.pillsContainer}>
      <View style={styles.pillsLeft}>
        <View
          style={[
            styles.pill,
            completedCount !== undefined && completedCount > 0 && styles.pillCompleted,
            atCapacity && styles.pillCapacity,
          ]}
        >
          <MaterialIcons
            name={completedCount !== undefined && completedCount > 0 ? 'task-alt' : 'inventory-2'}
            size={15}
            color={completedCount !== undefined && completedCount > 0 ? '#FFE399' : colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.pillText,
              completedCount !== undefined && completedCount > 0 && styles.pillCompletedText,
            ]}
          >
            My Queue {completedCount !== undefined ? completedCount : queueCount}/{MAX_QUEUE}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            haptic();
            onToggleOnline?.();
          }}
          style={[styles.pill, isOnline ? styles.pillLive : styles.pillOffline]}
        >
          <View style={[styles.liveDot, !isOnline && styles.offlineDot]} />
          <Text style={[styles.pillText, isOnline ? styles.pillLiveText : styles.pillOfflineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </Pressable>
      </View>

      {onSortChange && (
        <View
          style={styles.sortToggleContainer}
          onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
        >
          {toggleWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  width: (toggleWidth - 6) / 2,
                  left: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [3, toggleWidth - 3 - (toggleWidth - 6) / 2],
                  }),
                  borderColor:
                    sortBy === 'newest'
                      ? 'rgba(255, 227, 153, 0.5)'
                      : 'rgba(0, 226, 151, 0.5)',
                },
              ]}
            >
              <LinearGradient
                colors={
                  sortBy === 'newest'
                    ? ['rgba(255, 227, 153, 0.18)', 'rgba(255, 227, 153, 0.04)']
                    : ['rgba(0, 226, 151, 0.20)', 'rgba(0, 226, 151, 0.04)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.slidingGradient}
              />
            </Animated.View>
          )}

          <Pressable
            onPress={() => {
              onSortChange('newest');
              haptic();
            }}
            style={styles.sortTab}
          >
            <MaterialIcons
              name="schedule"
              size={14}
              color={sortBy === 'newest' ? GOLD : '#8C90A1'}
            />
            <Text
              style={[
                styles.sortTitle,
                sortBy === 'newest' && styles.sortTitleActiveNewest,
              ]}
            >
              Newest
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onSortChange('oldest');
              haptic();
            }}
            style={styles.sortTab}
          >
            <MaterialIcons
              name="history"
              size={14}
              color={sortBy === 'oldest' ? GREEN : '#8C90A1'}
            />
            <Text
              style={[
                styles.sortTitle,
                sortBy === 'oldest' && styles.sortTitleActiveOldest,
              ]}
            >
              Oldest
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <CustomHeader
      title="Orders"
      subtitle="pending • Tap Accept to grab orders"
      highlightText={pendingCount}
      showAvatar={showAvatar}
      avatar={avatar}
      avatarUrl={avatarUrl}
      onAvatarPress={onAvatarPress}
      pills={pills}
      showSearch={showSearch}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by name, phone, address..."
      showFilter={showSearch}
      onFilterPress={onFilterPress}
      sticky={sticky}
      translateY={translateY}
      animatedOpacity={animatedOpacity}
      onLayout={onLayout}
    />
  );
}

const styles = StyleSheet.create({
  pillsContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pillCapacity: {
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  pillCompleted: {
    backgroundColor: 'rgba(255, 227, 153, 0.12)',
    borderColor: 'rgba(255, 227, 153, 0.35)',
  },
  pillCompletedText: {
    color: '#FFE399',
    fontWeight: '700',
  },
  pillText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
    color: '#DFE2EF',
  },
  pillLive: {
    backgroundColor: 'rgba(0, 226, 151, 0.10)',
    borderColor: 'rgba(0, 226, 151, 0.30)',
  },
  pillLiveText: {
    color: '#00E297',
    fontWeight: '600',
  },
  pillOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillOfflineText: {
    color: '#8C90A1',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#00E297',
  },
  offlineDot: {
    backgroundColor: '#8C90A1',
  },
  sortToggleContainer: {
    width: 136,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 2,
  },
  slidingPill: {
    position: 'absolute',
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slidingGradient: {
    flex: 1,
  },
  sortTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 2,
    height: '100%',
  },
  sortTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8C90A1',
  },
  sortTitleActiveNewest: {
    color: GOLD,
    fontWeight: '700',
  },
  sortTitleActiveOldest: {
    color: GREEN,
    fontWeight: '700',
  },
});
