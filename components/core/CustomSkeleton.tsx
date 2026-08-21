import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';

export interface CustomSkeletonProps {
  /** Width in pixels or percentage string (e.g. 100, '100%') */
  width?: DimensionValue;
  /** Height in pixels or percentage string */
  height?: DimensionValue;
  /** Corner border radius */
  borderRadius?: number;
  /** Set to true for perfect circle */
  circle?: boolean;
  /** Custom background color override */
  color?: string;
  /** Shimmer animation speed in milliseconds */
  duration?: number;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Basic animated pulse/shimmer skeleton block
 */
export function CustomSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  circle = false,
  color = 'rgba(255, 255, 255, 0.07)',
  duration = 900,
  style,
  children,
}: CustomSkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [duration, pulseAnim]);

  const computedRadius = circle
    ? typeof width === 'number'
      ? width / 2
      : typeof height === 'number'
        ? height / 2
        : 9999
    : borderRadius;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: computedRadius,
          backgroundColor: color,
          opacity: pulseAnim,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}


export function OrderCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerUser}>
          <CustomSkeleton width={40} height={40} circle />
          <View style={styles.headerTextCol}>
            <CustomSkeleton width={120} height={18} borderRadius={6} />
            <CustomSkeleton width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
        <CustomSkeleton width={80} height={24} borderRadius={9999} />
      </View>

      <View style={styles.routesSection}>
        <View style={styles.routeStep}>
          <CustomSkeleton width={20} height={20} circle />
          <View style={styles.routeTextCol}>
            <CustomSkeleton width={90} height={10} borderRadius={4} />
            <CustomSkeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>

        <View style={styles.routeStep}>
          <CustomSkeleton width={20} height={20} circle />
          <View style={styles.routeTextCol}>
            <CustomSkeleton width={80} height={10} borderRadius={4} />
            <CustomSkeleton width="75%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      </View>

      <View style={styles.footerSection}>
        <View style={styles.footerPricing}>
          <CustomSkeleton width={70} height={26} borderRadius={6} />
          <CustomSkeleton width={100} height={14} borderRadius={4} />
        </View>
        <View style={styles.footerButtons}>
          <CustomSkeleton width="35%" height={48} borderRadius={24} />
          <CustomSkeleton width="60%" height={48} borderRadius={24} />
        </View>
      </View>
    </View>
  );
}


export function SkeletonList({
  count = 3,
  renderSkeleton,
}: {
  count?: number;
  renderSkeleton?: () => React.ReactNode;
}) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton ? renderSkeleton() : <OrderCardSkeleton />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  listContainer: {
    paddingBottom: 24,
    gap: 16,
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 32,
    padding: 20,
    gap: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextCol: {
    flexDirection: 'column',
  },
  routesSection: {
    gap: 16,
  },
  routeStep: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  routeTextCol: {
    flex: 1,
  },
  footerSection: {
    gap: 16,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
