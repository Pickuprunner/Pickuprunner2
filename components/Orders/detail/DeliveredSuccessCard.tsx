import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomCard } from '@/components/core';
import { colors } from '@/constants/design';

export interface DeliveredSuccessCardProps {
  earningsTotalDisplay?: string;
  photoUrl?: string | null;
}

export function DeliveredSuccessCard({
  earningsTotalDisplay,
  photoUrl,
}: DeliveredSuccessCardProps) {
  return (
    <View style={styles.container}>
      <CustomCard
        variant="glass"
        style={styles.deliveredCard}
        bodyStyle={styles.cardBody}
        padding={0}
      >
        <View style={styles.iconCircle}>
          <MaterialIcons name="celebration" size={30} color={colors.tertiary} />
        </View>
        <Text style={styles.deliveredTitle}>Order Delivered!</Text>
        {!!earningsTotalDisplay && (
          <Text style={styles.deliveredSubtitle}>
            You earned <Text style={styles.earningsHighlight}>{earningsTotalDisplay}</Text> on this delivery.
          </Text>
        )}
      </CustomCard>

      {!!photoUrl && (
        <View style={styles.deliveredPhotoBox}>
          <View style={styles.photoHeaderRow}>
            <MaterialIcons name="verified" size={16} color={colors.tertiary} />
            <Text style={styles.deliveredPhotoLabel}>VERIFIED PROOF OF DELIVERY</Text>
          </View>
          <Image
            source={{ uri: photoUrl }}
            style={styles.deliveredPhoto}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  deliveredCard: {
    backgroundColor: colors.greenAlpha10,
    borderColor: colors.greenAlpha30,
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.greenAlpha15,
    borderWidth: 1,
    borderColor: colors.greenAlpha40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 6,
  },
  deliveredTitle: {
    color: colors.onSurface,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    letterSpacing: -0.3,
  },
  deliveredSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    alignSelf: 'center',
  },
  earningsHighlight: {
    color: colors.secondary,
    fontWeight: '800',
  },
  deliveredPhotoBox: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassLevel2Border,
    backgroundColor: colors.glassLevel2Bg,
    padding: 14,
    gap: 10,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveredPhotoLabel: {
    color: colors.tertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deliveredPhoto: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
});


