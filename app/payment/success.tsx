import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useOrderStore } from '@/store/useOrderStore';
import { ordersApi } from '@/apis/orders';

export default function PaymentSuccessScreen() {
  const { order } = useLocalSearchParams<{ order?: string }>();

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

    if (router.canGoBack()) {
      router.back();
    } else if (order) {
      router.replace(`/(customer)/track/${order}`);
    } else {
      router.replace('/(customer)');
    }
  }, [order]);

  return null;
}

