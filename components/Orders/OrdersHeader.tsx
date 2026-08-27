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
  atCapacity: boolean;
  isConnected: boolean;
  search?: string;
  onSearchChange?: (text: string) => void;
  showSearch?: boolean;
  onFilterPress?: () => void;
  showAvatar?: boolean;
  avatar?: string;
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
  atCapacity,
  isConnected,
  search = '',
  onSearchChange,
  showSearch = false,
  onFilterPress,
  showAvatar = true,
  avatar = 'D',
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
        <View style={[styles.pill, atCapacity && styles.pillCapacity]}>
          <MaterialIcons name="inventory-2" size={15} color={colors.onSurfaceVariant} />
          <Text style={styles.pillText}>
            My Queue {queueCount}/{MAX_QUEUE}
          </Text>
        </View>

        <View style={[styles.pill, isConnected ? styles.pillLive : styles.pillOffline]}>
          <View style={[styles.liveDot, !isConnected && styles.offlineDot]} />
          <Text style={[styles.pillText, isConnected ? styles.pillLiveText : styles.pillOfflineText]}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
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
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pillCapacity: {
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
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
    width: 148,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 3,
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
    gap: 4,
    zIndex: 2,
    height: '100%',
  },
  sortTitle: {
    fontSize: 11,
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
