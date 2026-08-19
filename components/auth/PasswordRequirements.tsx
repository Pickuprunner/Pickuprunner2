import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PasswordCheckResult } from '@/lib/validation';

interface PasswordRequirementsProps {
  check: PasswordCheckResult;
}

export function PasswordRequirements({ check }: PasswordRequirementsProps) {
  const items = [
    { label: 'At least 8 characters', met: check.hasMinLength },
    { label: '1 uppercase letter (A-Z)', met: check.hasUpper },
    { label: '1 lowercase letter (a-z)', met: check.hasLower },
    { label: '1 number (0-9)', met: check.hasNumber },
    { label: '1 special character (!@#$...)', met: check.hasSpecial },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PASSWORD REQUIREMENTS</Text>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Ionicons
              name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={13}
              color={item.met ? '#00E297' : '#6B7280'}
            />
            <Text style={[styles.itemText, item.met && styles.itemTextMet]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default PasswordRequirements;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#12151E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 8,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8C90A1',
    letterSpacing: 1,
  },
  grid: {
    gap: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemText: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemTextMet: {
    color: '#00E297',
    fontWeight: '500',
  },
});
