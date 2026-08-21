import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/design';

const SCREEN_WIDTH = Dimensions.get('window').width;

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  description?: string;
}

interface ToastContextValue {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function triggerHaptic(type: ToastType) {
  if (Platform.OS === 'web') return;
  switch (type) {
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
      break;
    case 'info':
    default:
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
      break;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [type, setType] = useState<ToastType>('info');
  const [duration, setDuration] = useState(2500);

  const toastY = useRef(new Animated.Value(-100)).current;
  const toastScale = useRef(new Animated.Value(0.88)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const beamRotate = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(toastY, {
        toValue: -100,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastScale, {
        toValue: 0.88,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setMessage('');
      setDescription(undefined);
    });
  }, [toastY, toastScale, toastOpacity]);

  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const showToast = useCallback(
    (msg: string, typeOrOptions?: ToastType | ToastOptions) => {
      let toastType: ToastType = 'info';
      let toastDuration = 2500;
      let toastDesc: string | undefined = undefined;

      if (typeof typeOrOptions === 'string') {
        toastType = typeOrOptions;
      } else if (typeOrOptions && typeof typeOrOptions === 'object') {
        toastType = typeOrOptions.type || 'info';
        toastDuration = typeOrOptions.duration || 2500;
        toastDesc = typeOrOptions.description;
      }

      if (visibleRef.current) {
        hideToast();
        setTimeout(() => {
          setMessage(msg);
          setDescription(toastDesc);
          setType(toastType);
          setDuration(toastDuration);
          setVisible(true);
        }, 220);
      } else {
        setMessage(msg);
        setDescription(toastDesc);
        setType(toastType);
        setDuration(toastDuration);
        setVisible(true);
      }
    },
    [hideToast]
  );

  useEffect(() => {
    if (visible) {
      triggerHaptic(type);

      toastScale.setValue(0.88);
      toastY.setValue(-100);
      toastOpacity.setValue(0);
      beamRotate.setValue(0);

      // 1. Spring into view
      Animated.parallel([
        Animated.spring(toastY, {
          toValue: 0,
          tension: 90,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(toastScale, {
          toValue: 1,
          tension: 90,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Smooth perimeter beam path rotation (laser orbiting border)
      const beamLoop = Animated.loop(
        Animated.timing(beamRotate, {
          toValue: 1,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      beamLoop.start();

      // 3. Auto dismiss timer
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);

      return () => {
        beamLoop.stop();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [visible, duration, type, toastY, toastScale, toastOpacity, beamRotate, hideToast]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          color: colors.tertiary, // #00E297
          icon: 'check-circle' as const,
          bg: '#0F131C',
        };
      case 'error':
        return {
          color: '#FF6B6B',
          icon: 'error-outline' as const,
          bg: '#140E13',
        };
      case 'warning':
        return {
          color: colors.secondaryContainer, // #F4C300
          icon: 'warning-amber' as const,
          bg: '#16140E',
        };
      case 'info':
      default:
        return {
          color: colors.primaryContainer, // #0066FF
          icon: 'info-outline' as const,
          bg: '#0F131C',
        };
    }
  };

  const config = getToastConfig();

  // Rotate perimeter beam 360 degrees
  const rotateDeg = beamRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const topInset = Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 16;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: topInset,
              opacity: toastOpacity,
              transform: [{ translateY: toastY }, { scale: toastScale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.borderBeamOuter}>
            <Animated.View
              style={[
                styles.rotatingBeamWrapper,
                { transform: [{ rotate: rotateDeg }] },
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'transparent',
                  config.color,
                  'rgba(255, 255, 255, 0.9)',
                  config.color,
                  'transparent',
                ]}
                locations={[0, 0.42, 0.48, 0.5, 0.52, 0.6]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rotatingBeamGradient}
              />
            </Animated.View>

            <View style={[styles.innerCard, { backgroundColor: config.bg }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={hideToast}
                style={styles.toastInner}
              >
                <View style={[styles.iconBox, { backgroundColor: `${config.color}1C` }]}>
                  <MaterialIcons name={config.icon} size={20} color={config.color} />
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.messageText} numberOfLines={2}>
                    {message}
                  </Text>
                  {!!description && (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {description}
                    </Text>
                  )}
                </View>

                <MaterialIcons name="close" size={16} color="rgba(194, 198, 216, 0.5)" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999,
  },
  borderBeamOuter: {
    width: '100%',
    maxWidth: Math.min(SCREEN_WIDTH - 40, 480),
    borderRadius: 20,
    padding: 1.5, // The exact thickness of the traveling laser border
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingBeamWrapper: {
    position: 'absolute',
    width: 650,
    height: 650,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingBeamGradient: {
    width: '100%',
    height: '100%',
  },
  innerCard: {
    width: '100%',
    borderRadius: 18.5,
    overflow: 'hidden',
    backgroundColor: '#0F131C',
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  messageText: {
    color: '#DFE2EF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  descriptionText: {
    color: '#C2C6D8',
    fontSize: 12,
    lineHeight: 16,
  },
});
