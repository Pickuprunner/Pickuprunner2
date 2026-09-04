import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { Avatar, Camera, Edit3, Check, X } from '@blinkdotnew/mobile-ui';
import * as Haptics from 'expo-haptics';

const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const BLUE = '#0066FF';
const GOLD = '#FFE399';
const TEXT_PRIMARY = '#DFE2EF';
const TEXT_MUTED = '#94A3B8';
const BG = '#0F131C';

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

export interface MetricItemData {
  label: string;
  value: string | number;
  color: string;
  onPress?: () => void;
}

export interface ProfileHeroCardProps {
  displayName: string;
  emailText: string;
  photoUrl?: string | null;
  isUploading?: boolean;
  onPickPhoto?: () => void;
  onRemovePhoto?: () => void;
  onSaveDisplayName?: (name: string) => Promise<void> | void;
  metrics: MetricItemData[];
  initialsFallback?: string;
}

function getInitials(name: string, fallback: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || fallback;
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none', outline: 'none', boxShadow: 'none' } as any) : {};

export function ProfileHeroCard({
  displayName,
  emailText,
  photoUrl,
  isUploading = false,
  onPickPhoto,
  onRemovePhoto,
  onSaveDisplayName,
  metrics,
  initialsFallback = 'PR',
}: ProfileHeroCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setEditValue(displayName);
    }
  }, [displayName, editing]);

  const startEdit = () => {
    haptic('light');
    setEditValue(displayName);
    setEditing(true);
  };

  const cancelEdit = () => {
    haptic('light');
    setEditValue(displayName);
    setEditing(false);
  };

  const confirmEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    if (trimmed === displayName) {
      setEditing(false);
      return;
    }
    haptic('medium');
    if (onSaveDisplayName) {
      setIsSaving(true);
      try {
        await onSaveDisplayName(trimmed);
      } catch (err) {
        console.warn('[ProfileHeroCard] save error:', err);
      } finally {
        setIsSaving(false);
      }
    }
    setEditing(false);
  };

  const initialsText = getInitials(displayName, initialsFallback);

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <View style={styles.avatarWrap}>
          <Pressable onPress={onPickPhoto} disabled={isUploading || !onPickPhoto}>
            <Avatar size="$7" borderRadius="$full" backgroundColor="#31353f" borderWidth={1} borderColor="#424656">
              {photoUrl ? (
                <Avatar.Image source={{ uri: photoUrl }} />
              ) : (
                <Text style={styles.heroAvatarText}>{initialsText}</Text>
              )}
            </Avatar>
            {isUploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </Pressable>

          {onPickPhoto && (
            <Pressable onPress={onPickPhoto} style={styles.cameraBadge}>
              <Camera size={12} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        <View style={styles.infoCol}>
          {editing ? (
            <View style={styles.editingWrap}>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Enter name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoFocus
                underlineColorAndroid="transparent"
                returnKeyType="done"
                onSubmitEditing={confirmEdit}
                maxLength={30}
                style={[styles.nameEditInput, webNoOutline]}
              />
              <View style={styles.editActionRow}>
                <Pressable
                  onPress={cancelEdit}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.editCancelBtn,
                    pressed && styles.btnPressed,
                  ]}
                  hitSlop={4}
                >
                  <X size={13} color={TEXT_MUTED} />
                </Pressable>
                <Pressable
                  onPress={confirmEdit}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.editSaveBtn,
                    pressed && styles.btnPressed,
                  ]}
                  hitSlop={4}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Check size={13} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">
                {displayName}
              </Text>
              <Pressable
                onPress={startEdit}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.editIconBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Edit3 size={14} color={GOLD} />
              </Pressable>
            </View>
          )}

          <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="tail">
            {emailText}
          </Text>
        </View>
      </View>

      {metrics && metrics.length > 0 && (
        <View style={styles.metricsRow}>
          {metrics.map((item, idx) => (
            <React.Fragment key={item.label}>
              {item.onPress ? (
                <Pressable
                  onPress={() => {
                    haptic('light');
                    item.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.metricItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  <Text style={[styles.metricValue, { color: item.color }]}>{item.value}</Text>
                </Pressable>
              ) : (
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  <Text style={[styles.metricValue, { color: item.color }]}>{item.value}</Text>
                </View>
              )}
              {idx < metrics.length - 1 && <View style={styles.metricDivider} />}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  heroAvatarText: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '700',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    maxWidth: '85%',
  },
  editIconBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emailText: {
    color: TEXT_MUTED,
    fontSize: 12.5,
    marginTop: 4,
  },

 
  editingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.2,
    borderColor: BLUE,
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 5,
    height: 38,
    gap: 6,
  },
  nameEditInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editCancelBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 16,
    paddingTop: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15.5,
    fontWeight: '900',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

