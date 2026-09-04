import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/constants/design';
import { openTerms, openPrivacy } from '@/lib/config';

interface TermsAgreementProps {
  agreed: boolean;
  onToggle: () => void;
  accentColor?: string;
}

export function TermsAgreement({
  agreed,
  onToggle,
  accentColor = colors.primaryContainer,
}: TermsAgreementProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={styles.checkboxTouch}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: agreed ? accentColor : 'rgba(255, 255, 255, 0.25)',
              backgroundColor: agreed ? accentColor : 'transparent',
            },
          ]}
        >
          {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </Pressable>

      <Text style={styles.label}>
        I agree to the{' '}
        <Text
          onPress={openTerms}
          style={[styles.link, { color: accentColor }]}
        >
          Terms of Use
        </Text>
        {' '}&{' '}
        <Text
          onPress={openPrivacy}
          style={[styles.link, { color: accentColor }]}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

export default TermsAgreement;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  checkboxTouch: {
    padding: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    lineHeight: 19,
  },
  link: {
    fontWeight: '600',
  },
});
