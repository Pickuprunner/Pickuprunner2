import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, shadows } from '@/constants/design';

export interface MapCalloutTooltipProps {
  title: string;
  subtitle: string;
  showArrow?: boolean;
  onClose?: () => void;
}

export function MapCalloutTooltip({
  title,
  subtitle,
  showArrow = true,
  onClose,
}: MapCalloutTooltipProps) {
  return (
    <View style={[styles.container, !showArrow && styles.floatingContainer]}>
      <View style={[styles.calloutCard, !showArrow && styles.floatingCard]}>
        <View style={styles.headerRow}>
          <Text style={styles.calloutTitle} numberOfLines={1}>
            {title}
          </Text>
          {onClose ? (
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityLabel="Dismiss tooltip"
            >
              <MaterialIcons name="close" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.calloutSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {showArrow && <View style={styles.calloutArrow} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    alignItems: 'center',
  },
  floatingContainer: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'stretch',
  },
  calloutCard: {
    width: 200,
    padding: 10,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    ...shadows.md,
  },
  floatingCard: {
    width: '100%',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 19, 28, 0.94)',
    borderColor: colors.glassLevel2Border,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  calloutTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 13,
    color: colors.onSurface,
    marginRight: 6,
  },
  closeBtn: {
    padding: 2,
    borderRadius: 10,
  },
  calloutSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  calloutArrow: {
    width: 10,
    height: 10,
    backgroundColor: colors.surfaceContainer,
    marginTop: -5,
    transform: [{ rotate: '45deg' }],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.glassLevel2Border,
  },
});
