import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CustomInput } from '@/components/core';
import { colors, spacing, typography } from '@/constants/design';
import { isValidEmail } from '@/lib/validation';

const GOLD = '#FFE399';
const GREEN = '#00E297';

interface CustomerDetailsCardProps {
  name: string;
  onNameChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  pickupNumber?: string;
  onPickupNumberChange?: (val: string) => void;
  deliveryType?: 'door' | 'meet';
  onDeliveryTypeChange?: (val: 'door' | 'meet') => void;
}

export function CustomerDetailsCard({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  pickupNumber = '',
  onPickupNumberChange,
  deliveryType = 'door',
  onDeliveryTypeChange,
}: CustomerDetailsCardProps) {
  const [toggleWidth, setToggleWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(deliveryType === 'meet' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: deliveryType === 'meet' ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [deliveryType]);

  const haptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>CUSTOMER DETAILS & PREFERENCE</Text>

      <View style={styles.content}>
        {/* Delivery Preference Toggle */}
        <View style={styles.prefContainer}>
          <Text style={styles.inputSectionLabel}>DELIVERY PREFERENCE</Text>
          <View
            style={styles.prefToggleContainer}
            onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
          >
            {toggleWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingPill,
                  {
                    width: (toggleWidth - 12) / 2,
                    left: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, toggleWidth - 4 - (toggleWidth - 12) / 2],
                    }),
                    borderColor:
                      deliveryType === 'door'
                        ? 'rgba(255, 227, 153, 0.5)'
                        : 'rgba(0, 226, 151, 0.5)',
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    deliveryType === 'door'
                      ? ['rgba(255, 227, 153, 0.18)', 'rgba(255, 227, 153, 0.04)']
                      : ['rgba(0, 226, 151, 0.20)', 'rgba(0, 226, 151, 0.04)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.slidingGradient}
                />
              </Animated.View>
            )}

            {/* Option 1: Leave at Door */}
            <Pressable
              onPress={() => {
                onDeliveryTypeChange?.('door');
                haptic();
              }}
              style={styles.prefTab}
            >
              <MaterialIcons
                name="door-front"
                size={20}
                color={deliveryType === 'door' ? GOLD : '#8C90A1'}
              />
              <View style={styles.prefTextCol}>
                <Text
                  style={[
                    styles.prefTitle,
                    deliveryType === 'door' && styles.prefTitleActiveDoor,
                  ]}
                >
                  Leave at Door
                </Text>
                <Text style={styles.prefDesc}>Photo on delivery</Text>
              </View>
            </Pressable>

            {/* Option 2: Meet at Door */}
            <Pressable
              onPress={() => {
                onDeliveryTypeChange?.('meet');
                haptic();
              }}
              style={styles.prefTab}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={deliveryType === 'meet' ? GREEN : '#8C90A1'}
              />
              <View style={styles.prefTextCol}>
                <Text
                  style={[
                    styles.prefTitle,
                    deliveryType === 'meet' && styles.prefTitleActiveMeet,
                  ]}
                >
                  Meet at Door
                </Text>
                <Text style={styles.prefDesc}>Hand off directly</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* CUSTOMER NAME */}
        <CustomInput
          label="CUSTOMER NAME *"
          placeholder="e.g. Maria Lopez"
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          returnKeyType="next"
          leftIcon={<MaterialIcons name="person-outline" size={18} color={colors.outline} />}
          status={name.trim().length >= 2 ? 'success' : 'default'}
        />

        {/* PHONE NUMBER */}
        <CustomInput
          label="PHONE *"
          placeholder="e.g. (520) 555-0101"
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          autoCapitalize="none"
          returnKeyType="next"
          leftIcon={<MaterialIcons name="phone" size={18} color={colors.outline} />}
          status={phone.trim().length >= 7 ? 'success' : 'default'}
        />

        {/* PICKUP INFO / ORDER NUMBER */}
        {onPickupNumberChange && (
          <CustomInput
            label="PICKUP INFO / ORDER #"
            placeholder="e.g. #1042 or 'Deli Counter'"
            value={pickupNumber}
            onChangeText={onPickupNumberChange}
            autoCapitalize="none"
            returnKeyType="next"
            leftIcon={<MaterialIcons name="tag" size={18} color={colors.outline} />}
          />
        )}

        {/* EMAIL ADDRESS */}
        <CustomInput
          label="EMAIL (OPTIONAL)"
          placeholder="For delivery notification email"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          leftIcon={<MaterialIcons name="mail-outline" size={18} color={colors.outline} />}
          status={email.length > 0 && isValidEmail(email) ? 'success' : 'default'}
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
    letterSpacing: 1,
  },
  content: {
    gap: spacing.md,
  },
  prefContainer: {
    gap: 8,
  },
  inputSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.8,
  },
  prefToggleContainer: {
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 4,
  },
  slidingPill: {
    position: 'absolute',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slidingGradient: {
    flex: 1,
  },
  prefTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
    height: '100%',
  },
  prefTextCol: {
    flexDirection: 'column',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C90A1',
  },
  prefTitleActiveDoor: {
    color: GOLD,
    fontWeight: '700',
  },
  prefTitleActiveMeet: {
    color: GREEN,
    fontWeight: '700',
  },
  prefDesc: {
    fontSize: 10,
    color: '#8C90A1',
  },
});
