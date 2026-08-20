import React from 'react';
import { Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { ChevronRight } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';

const TEXT_PRIMARY = '#DFE2EF';
const TEXT_MUTED = '#94A3B8';

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS !== 'web') {
    const feedback =
      style === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(feedback).catch(() => { });
  }
}

export interface ProfileActionRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  iconBorder?: string;
  title: string;
  subtitle?: string;
  titleColor?: string;
  onPress?: () => void;
  rightControl?: React.ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy';
}

export function ProfileActionRow({
  icon,
  iconBg = 'rgba(255, 255, 255, 0.06)',
  iconBorder,
  title,
  subtitle,
  titleColor = TEXT_PRIMARY,
  onPress,
  rightControl,
  showChevron = true,
  disabled = false,
  hapticStyle = 'medium',
}: ProfileActionRowProps) {
  const handlePress = () => {
    if (!onPress || disabled) return;
    haptic(hapticStyle);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [styles.actionRow, pressed && onPress && { opacity: 0.8 }]}
    >
      <View
        style={[
          styles.actionIconWrap,
          { backgroundColor: iconBg },
          iconBorder ? { borderColor: iconBorder, borderWidth: 1 } : null,
        ]}
      >
        {icon}
      </View>
      <View style={styles.actionTextCol}>
        <Text style={[styles.actionTitle, { color: titleColor }]}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightControl ? (
        rightControl
      ) : showChevron && onPress ? (
        <ChevronRight size={16} color="rgba(255, 255, 255, 0.4)" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
});
