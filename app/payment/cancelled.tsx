import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { CustomConfirmModal } from '@/components/core';

export default function PaymentCancelledScreen() {
  const { order } = useLocalSearchParams<{ order?: string }>();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (order) {
      router.replace(`/(customer)/track/${order}`);
    } else {
      router.replace('/(customer)');
    }
  };

  return (
    <View style={styles.container}>
      <CustomConfirmModal
        visible={visible}
        variant="warning"
        title="Payment Cancelled"
        message="Your payment was not completed. Nothing was charged to your card."
        confirmText="Return to Order"
        singleButton
        orderId={order}
        onClose={handleClose}
        onConfirm={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
