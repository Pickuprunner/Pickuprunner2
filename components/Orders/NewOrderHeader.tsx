import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomHeader } from '@/components/core';

const GOLD = '#F5C400';

interface NewOrderHeaderProps {
  onFillTest?: () => void;
}

export function NewOrderHeader({ onFillTest }: NewOrderHeaderProps) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onFillTest?.();
  };

  const titleNode = (
    <View style={styles.titleRow}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.headerLogo}
        contentFit="contain"
      />
      <Text style={styles.titleText}>New Order</Text>
    </View>
  );

  return (
    <CustomHeader
      title={titleNode}
      subtitle="Create a delivery task manually"
      showAvatar={false}
      rightContent={
        onFillTest ? (
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [styles.testBtn, pressed && styles.testBtnPressed]}
          >
            <MaterialIcons name="bolt" size={14} color={GOLD} />
            <Text style={styles.testBtnText}>Fill Test</Text>
          </Pressable>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 196, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 0, 0.3)',
  },
  testBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
  },
});
