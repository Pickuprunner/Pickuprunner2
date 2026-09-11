import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, StatusBar } from 'react-native';

const splashIcon = require('@/assets/images/icon.png');

export function AppSplashScreen() {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [progressAnim]);

  const translateX = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 98],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F131C" />
      <Image source={splashIcon} style={styles.logo} resizeMode="contain" />
      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, { transform: [{ translateX }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  progressBarTrack: {
    width: 140,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 28,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 42,
    backgroundColor: '#FFE399',
    borderRadius: 2,
  },
});
