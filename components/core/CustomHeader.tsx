import React, { useRef } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ViewStyle,
  TextStyle,
  StyleProp,
  ActivityIndicator,
  StatusBar,
  LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/design';

export type HeaderVariant = 'glass' | 'solid' | 'transparent';
export type TitleSize = 'large' | 'medium' | 'small';

export interface CustomHeaderProps {
  /** Screen or page title */
  title?: string | React.ReactNode;
  /** Subtitle or secondary description */
  subtitle?: string | React.ReactNode;
  /** Highlighted accent text inside subtitle (e.g. count) */
  highlightText?: string | number;
  /** Alias for highlightText */
  subtitleHighlight?: string | number;
  /** Header visual style variant */
  variant?: HeaderVariant;
  /** Title typography sizing */
  titleSize?: TitleSize;

  /** Automatically add top padding for safe area (Dynamic Island, notch, status bar) */
  withSafeArea?: boolean;

  /** Make header position absolute/sticky at top */
  sticky?: boolean;
  /** Animated translateY transform for scroll-hide effect */
  translateY?: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** Animated opacity for smooth fade */
  animatedOpacity?: Animated.Value | Animated.AnimatedInterpolation<number>;

  /** Show back navigation arrow */
  showBack?: boolean;
  /** Custom back press handler, defaults to router.back() */
  onBack?: () => void;
  /** Custom back icon component */
  backIcon?: React.ReactNode;

  /** Primary right action icon name from MaterialIcons */
  rightIconName?: keyof typeof MaterialIcons.glyphMap;
  /** Custom right action node */
  rightAction?: React.ReactNode;
  /** Custom right action node alias */
  rightContent?: React.ReactNode;
  /** Press handler for right action button */
  onRightActionPress?: () => void;
  /** Accessibility label for right action */
  rightActionLabel?: string;
  /** Shows loading indicator inside right action button */
  rightActionLoading?: boolean;

  /** Show avatar profile button in top right */
  showAvatar?: boolean;
  /** Avatar initial or icon label */
  avatar?: string;
  /** Press handler for avatar button, defaults to router.push('/(tabs)/profile') */
  onAvatarPress?: () => void;

  /** Secondary content slot (e.g., status badges, queue pills) */
  pills?: React.ReactNode;

  /** Whether to render the integrated search bar */
  showSearch?: boolean;
  /** Current search input value */
  search?: string;
  /** Search text change callback */
  onSearchChange?: (text: string) => void;
  /** Search input placeholder text */
  searchPlaceholder?: string;

  /** Whether to render the filter / tune button next to search */
  showFilter?: boolean;
  /** Filter button press callback */
  onFilterPress?: () => void;

  /** Bottom custom slot */
  children?: React.ReactNode;

  /** Layout change callback to measure header height */
  onLayout?: (event: LayoutChangeEvent) => void;

  /** Include bottom border line */
  borderBottom?: boolean;
  /** Custom background color override */
  backgroundColor?: string;
  /** Container style overrides */
  containerStyle?: StyleProp<ViewStyle>;
  /** Title text style overrides */
  titleStyle?: StyleProp<TextStyle>;
  /** Subtitle text style overrides */
  subtitleStyle?: StyleProp<TextStyle>;
}

/**
 * Reusable hook to create smooth hide-on-scroll animation for CustomHeader
 */
export function useCollapsibleHeader(headerHeight = 210) {
  const scrollY = useRef(new Animated.Value(0)).current;

  // Clamp scrollY to prevent negative iOS pull/rubber-band bounce from glitching diffClamp
  const safeScrollY = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: 'clamp',
  });

  const clampedScroll = Animated.diffClamp(safeScrollY, 0, headerHeight);

  const translateY = clampedScroll.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  const opacity = clampedScroll.interpolate({
    inputRange: [0, headerHeight * 0.7, headerHeight],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: Platform.OS !== 'web' }
  );

  return {
    scrollY,
    translateY,
    opacity,
    onScroll,
    headerHeight,
  };
}

export function CustomHeader({
  title,
  subtitle,
  highlightText,
  subtitleHighlight,
  variant = 'glass',
  titleSize = 'large',
  withSafeArea = true,

  sticky = false,
  translateY,
  animatedOpacity,

  showBack = false,
  onBack,
  backIcon,

  rightIconName,
  rightAction,
  rightContent,
  onRightActionPress,
  rightActionLabel,
  rightActionLoading = false,

  showAvatar = false,
  avatar = 'D',
  onAvatarPress,

  pills,

  showSearch = false,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',

  showFilter = false,
  onFilterPress,

  children,
  onLayout,

  borderBottom = false,
  backgroundColor,
  containerStyle,
  titleStyle,
  subtitleStyle,
}: CustomHeaderProps) {
  const insets = useSafeAreaInsets();
  const activeHighlight = subtitleHighlight ?? highlightText;
  const activeRightContent = rightContent ?? rightAction;

  const topInset = withSafeArea
    ? Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)
    : 0;

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleRightAction = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    onRightActionPress?.();
  };

  const handleAvatarPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  const handleFilter = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    onFilterPress?.();
  };

  const getContainerBg = () => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'solid':
        return '#0F131C';
      case 'transparent':
        return 'transparent';
      case 'glass':
      default:
        return 'rgba(15, 19, 28, 0.95)';
    }
  };

  const getTitleFontSize = () => {
    switch (titleSize) {
      case 'small':
        return { fontSize: 17, lineHeight: 22, fontWeight: '600' as const };
      case 'medium':
        return { fontSize: 20, lineHeight: 26, fontWeight: '700' as const };
      case 'large':
      default:
        return { fontSize: 28, lineHeight: 36, fontWeight: '700' as const };
    }
  };

  const animatedStyles = {
    ...(translateY ? { transform: [{ translateY }] } : {}),
    ...(animatedOpacity ? { opacity: animatedOpacity } : {}),
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: getContainerBg(),
          paddingTop: topInset + 12,
        },
        sticky && styles.stickyHeader,
        borderBottom && styles.borderBottom,
        animatedStyles,
        containerStyle,
      ]}
    >
      <View style={styles.topRow}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
            ]}
          >
            {backIcon || <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />}
          </Pressable>
        )}

        <View style={styles.titleColumn}>
          {typeof title === 'string' ? (
            <Text style={[styles.title, getTitleFontSize(), titleStyle]} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            title
          )}

          {activeHighlight !== undefined || subtitle ? (
            <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>
              {activeHighlight !== undefined && (
                <Text style={styles.highlightText}>{activeHighlight} </Text>
              )}
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightActionsGroup}>
          {activeRightContent ? (
            activeRightContent
          ) : rightIconName ? (
            <Pressable
              onPress={handleRightAction}
              disabled={rightActionLoading}
              accessibilityLabel={rightActionLabel || rightIconName}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { transform: [{ scale: 0.95 }], backgroundColor: 'rgba(244, 195, 0, 0.15)' },
              ]}
            >
              {rightActionLoading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <MaterialIcons name={rightIconName} size={22} color={colors.secondary} />
              )}
            </Pressable>
          ) : null}

          {showAvatar && (
            <Pressable
              onPress={handleAvatarPress}
              accessibilityLabel="Profile"
              style={({ pressed }) => [
                styles.avatarBtn,
                pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 },
              ]}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{avatar}</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
      {pills ? <View style={styles.pillsRow}>{pills}</View> : null}
      {showSearch && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor="rgba(194, 198, 216, 0.5)"
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && Platform.OS === 'android' && (
              <Pressable onPress={() => onSearchChange?.('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            )}
          </View>

          {showFilter && (
            <Pressable
              onPress={handleFilter}
              accessibilityLabel="Filters"
              style={({ pressed }) => [
                styles.filterBtn,
                pressed && { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
              ]}
            >
              <MaterialIcons name="tune" size={20} color={colors.onSurface} />
            </Pressable>
          )}
        </View>
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    color: '#DFE2EF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#C2C6D8',
    marginTop: 3,
  },
  highlightText: {
    color: '#FFE399',
    fontWeight: '700',
  },
  rightActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 195, 0, 0.3)',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 195, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: '#FFE399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFE399',
    fontSize: 15,
    fontWeight: '700',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#DFE2EF',
    fontSize: 14,
    padding: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
