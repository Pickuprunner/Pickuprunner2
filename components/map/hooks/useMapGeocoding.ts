import { useEffect, useRef, useState } from 'react';
import { Order } from '@/lib/orders';
import { geocode } from '@/lib/distance';
import { getPickupCoords, getDeliveryCoords } from '../mapTypes';

export function useMapGeocoding(orders: Order[]) {
  const [, setGeocodeTick] = useState(0);
  const attemptedAddressesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    orders.forEach((o) => {
      if (o.pickupAddress && !getPickupCoords(o) && !attemptedAddressesRef.current.has(o.pickupAddress)) {
        attemptedAddressesRef.current.add(o.pickupAddress);
        geocode(o.pickupAddress)
          .then(() => {
            if (mounted) setGeocodeTick((n) => n + 1);
          })
          .catch(() => {});
      }
      if (o.deliveryAddress && !getDeliveryCoords(o) && !attemptedAddressesRef.current.has(o.deliveryAddress)) {
        attemptedAddressesRef.current.add(o.deliveryAddress);
        geocode(o.deliveryAddress)
          .then(() => {
            if (mounted) setGeocodeTick((n) => n + 1);
          })
          .catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [orders]);
}
