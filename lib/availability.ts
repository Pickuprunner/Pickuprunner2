import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as Location from 'expo-location';
import { driverAvailabilityApi, driverLocationApi } from '@/apis/availability';
import { useAuthStore } from '@/store/useAuthStore';
import { useDriverStore } from '@/store/useDriverStore';

export const DRIVER_AVAILABILITY_QUERY_KEY = ['driver-availability'];

export function useDriverAvailability() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setIsOnline = useDriverStore((s) => s.setIsOnline);

  const query = useQuery({
    queryKey: DRIVER_AVAILABILITY_QUERY_KEY,
    queryFn: async () => {
      if (!token || user?.role !== 'driver') return false;
      const isAvailable = await driverAvailabilityApi.getAvailability();
      return isAvailable;
    },
    enabled: Boolean(token && user?.role === 'driver'),
    staleTime: 1000 * 15,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      useDriverStore.setState({ isOnline: query.data });
    }
  }, [query.data, setIsOnline]);

  return query;
}

export function useSetDriverAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (available: boolean) => {
      const result = await driverAvailabilityApi.setAvailability(available);
      return result;
    },
    onMutate: async (newStatus: boolean) => {
      await queryClient.cancelQueries({ queryKey: DRIVER_AVAILABILITY_QUERY_KEY });
      const previousStatus = queryClient.getQueryData<boolean>(DRIVER_AVAILABILITY_QUERY_KEY);
      
      queryClient.setQueryData(DRIVER_AVAILABILITY_QUERY_KEY, newStatus);
      useDriverStore.setState({ isOnline: newStatus });

      return { previousStatus };
    },
    onError: (err, newStatus, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(DRIVER_AVAILABILITY_QUERY_KEY, context.previousStatus);
        useDriverStore.setState({ isOnline: context.previousStatus });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DRIVER_AVAILABILITY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['availableOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDriverLocationHeartbeat(driverCoords?: { lat?: number; lng?: number }) {
  const isOnline = useDriverStore((s) => s.isOnline);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!token || user?.role !== 'driver' || !isOnline) return;

    let isMounted = true;

    async function sendHeartbeat() {
      try {
        let lat = driverCoords?.lat;
        let lng = driverCoords?.lng;

        if (!lat || !lng) {
          const { status } = await Location.getForegroundPermissionsAsync().catch(() => ({ status: 'undetermined' }));
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }).catch(() => null);
            if (loc?.coords) {
              lat = loc.coords.latitude;
              lng = loc.coords.longitude;
            }
          }
        }

        if (lat && lng && isMounted) {
          await driverLocationApi.reportLocation({ lat, lng });
        }
      } catch {
      }
    }

    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 60000); //6 sec

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOnline, token, user?.role, driverCoords?.lat, driverCoords?.lng]);
}
