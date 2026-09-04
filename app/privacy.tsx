import React, { useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { PRIVACY_URL } from '@/lib/config';

export default function PrivacyRedirectScreen() {
  useEffect(() => {
    Linking.openURL(PRIVACY_URL).catch(() => {});
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(landing)/role-select');
    }
  }, []);

  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F131C',
  },
});
