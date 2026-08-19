import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomInput } from '@/components/core';
import { colors, spacing, typography } from '@/constants/design';

interface CustomerDetailsCardProps {
  name: string;
  onNameChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
}

export function CustomerDetailsCard({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
}: CustomerDetailsCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>

      <View style={styles.content}>
        <CustomInput
          label="NAME *"
          placeholder="e.g. Maria Lopez"
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          leftIcon={<MaterialIcons name="person-outline" size={18} color={colors.outline} />}
        />

        <CustomInput
          label="PHONE *"
          placeholder="e.g. (520) 555-0101"
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          leftIcon={<MaterialIcons name="phone" size={18} color={colors.outline} />}
        />

        <CustomInput
          label="EMAIL (OPTIONAL)"
          placeholder="For delivery notification email"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<MaterialIcons name="mail-outline" size={18} color={colors.outline} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelMd,
    color: colors.outline,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  content: {
    gap: spacing.md,
  },
});
