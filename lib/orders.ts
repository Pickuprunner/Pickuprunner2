import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrderStore, Order } from '@/store/useOrderStore';
import { publishOrderChange } from './realtime';
import { APP_CONFIG } from './config';

export type { Order };

/**
 * Hook to query the full list of active/all orders.
 */
export function useOrders() {
  const storeOrders = useOrderStore((state) => state.orders);

  return useQuery({
    queryKey: ['orders', APP_CONFIG.CITY_ID],
    queryFn: async () => {
      return useOrderStore.getState().orders;
    },
    initialData: storeOrders,
    staleTime: 1000 * 5,
  });
}

/**
 * Hook to query a single order by ID.
 */
export function useOrder(id: string | undefined) {
  const storeOrders = useOrderStore((state) => state.orders);

  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const orders = useOrderStore.getState().orders;
      const match = orders.find((o) => o.id === id);
      if (!match) throw new Error(`Order ${id} not found`);
      return match;
    },
    initialData: id ? storeOrders.find((o) => o.id === id) : undefined,
    staleTime: 1000 * 5,
  });
}

/**
 * Hook to place a new delivery order.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      pickupAddress: string;
      deliveryAddress: string;
      items: string;
      tipAmount?: number;
      distanceMiles?: number;
    }) => {
      const newOrder = useOrderStore.getState().addOrder(orderData);
      return newOrder;
    },
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      await publishOrderChange({
        orderId: newOrder.id,
        type: 'created',
        customerName: newOrder.customerName,
        deliveryAddress: newOrder.deliveryAddress,
        items: newOrder.items,
      }).catch(() => {});
    },
  });
}

/**
 * Hook for drivers to claim an available order.
 */
export function useClaimOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, driverUserId, driverName }: { orderId: string; driverUserId: string; driverName?: string }) => {
      const updated = useOrderStore.getState().claimOrder(orderId, driverUserId, driverName);
      if (!updated) throw new Error('Could not claim order');
      return updated;
    },
    onSuccess: async (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['order', updatedOrder.id] });
      await publishOrderChange({
        orderId: updatedOrder.id,
        type: 'updated',
        status: updatedOrder.status,
      }).catch(() => {});
    },
  });
}

/**
 * Hook to transition order status through the delivery lifecycle.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ageVerified,
      ageVerifiedAt,
      deliveryPhotoUrl,
      driverUserId,
      driverName,
    }: {
      id: string;
      status: 'delivered' | 'accepted' | 'picked_up' | 'pending';
      ageVerified?: number;
      ageVerifiedAt?: string;
      deliveryPhotoUrl?: string;
      driverUserId?: string;
      driverName?: string;
    }) => {
      const updated = useOrderStore.getState().updateOrder(id, {
        status,
        ...(ageVerified !== undefined ? { ageVerified } : {}),
        ...(ageVerifiedAt ? { ageVerifiedAt } : {}),
        ...(deliveryPhotoUrl ? { deliveryPhotoUrl } : {}),
        ...(driverUserId ? { driverUserId } : {}),
        ...(driverName ? { driverName } : {}),
      });

      if (!updated) throw new Error(`Order ${id} not found`);
      return updated;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID]);
      queryClient.setQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID], (old = []) =>
        old.map((o) => (o.id === id ? { ...o, status } : o))
      );
      return { previousOrders };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders', APP_CONFIG.CITY_ID], context.previousOrders);
      }
    },
    onSuccess: async (updatedOrder) => {
      await publishOrderChange({
        orderId: updatedOrder.id,
        type: 'updated',
        status: updatedOrder.status,
      }).catch(() => {});
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}
