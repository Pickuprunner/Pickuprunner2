import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { CustomConfirmModal } from '@/components/core';
import { useOrderStore } from '@/store/useOrderStore';
import { ordersApi } from '@/apis/orders';

export default function PaymentSuccessScreen() {
  const { order } = useLocalSearchParams<{ order?: string }>();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();

    if (order) {
      useOrderStore.getState().updateOrder(order, {
        paymentStatus: 'paid',
        payment_status: 'paid',
      });
      ordersApi
        .getById(order)
        .then((fresh: any) => {
          if (fresh?.id) {
            useOrderStore.getState().upsertOrder({
              ...fresh,
              paymentStatus: 'paid',
              payment_status: 'paid',
            });
          }
        })
        .catch(() => {});
    }
  }, [order]);

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
        variant="success"
        title="Payment Successful"
        message="Your payment was processed successfully. Thank you!"
        confirmText="View Order Status"
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
