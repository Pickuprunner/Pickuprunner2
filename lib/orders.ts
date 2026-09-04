import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrderStore, Order, OrderStatus } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ordersApi, CreateOrderPayload, UpdateOrderPayload, AvailableOrdersParams } from '@/apis/orders';
import { createCheckoutForOrder } from '@/apis/checkout';
import { getSelectedOrder } from './selectedOrder';
import { publishOrderChange } from './realtime';
import { APP_CONFIG } from './config';

export type { Order, OrderStatus };

export function useAvailableOrders(params?: AvailableOrdersParams) {
  const token = useAuthStore((state) => state.token);
  const storeOrders = useOrderStore((state) => state.orders);

  return useQuery({
    queryKey: ['orders', 'available', params?.lat, params?.lng, params?.radiusMiles, params?.cityId],
    enabled: Boolean(token),
    queryFn: async () => {
      try {
        const availableItems = await ordersApi.getAvailable(params);
        if (Array.isArray(availableItems)) {
          useOrderStore.getState().setAvailableOrders(availableItems as Order[]);
          return availableItems as Order[];
        }
      } catch (err) {
        console.warn('[useAvailableOrders] GET /orders/available failed, fallback to local store:', err);
      }

      return useOrderStore.getState().orders.filter((o) => o.status === 'pending' && !o.driverUserId);
    },
    placeholderData: () => storeOrders.filter((o) => o.status === 'pending' && !o.driverUserId),
    staleTime: 2000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

/**
 * Hook to query the full list of active/all orders.
 */
export function useOrders() {
  const token = useAuthStore((state) => state.token);
  const storeOrders = useOrderStore((state) => state.orders);

  return useQuery<Order[]>({
    queryKey: ['orders', APP_CONFIG.CITY_ID, token],
    enabled: Boolean(token),
    queryFn: async () => {
      try {
        const mine = await ordersApi.getMine();
        if (Array.isArray(mine)) {
          useOrderStore.getState().setOrders(mine as Order[]);
          return mine as Order[];
        }
      } catch (err) {
        console.warn('[useOrders] GET /orders/mine failed, fallback to store:', err);
      }
      return useOrderStore.getState().orders;
    },
    placeholderData: () => storeOrders,
    staleTime: 2000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

export function useOrder(id: string | undefined) {
  const storeOrders = useOrderStore((state) => state.orders);

  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error('Order ID is required');

      try {
        const remoteOrder = await ordersApi.getById(id);
        if (remoteOrder && remoteOrder.id) {
          const synced = useOrderStore.getState().upsertOrder(remoteOrder);
          return synced;
        }
      } catch (err) {
        console.warn(`[useOrder] GET /orders/${id} failed, checking local store:`, err);
      }

      const localMatch = useOrderStore.getState().orders.find((o) => o.id === id);
      if (localMatch) return localMatch;

      const sel = getSelectedOrder();
      if (sel && sel.id === id) return sel;

      throw new Error(`Order ${id} not found`);
    },
    placeholderData: () => {
      if (!id) return undefined;
      return (
        storeOrders.find((o) => o.id === id) ||
        (getSelectedOrder()?.id === id ? getSelectedOrder()! : undefined)
      );
    },
    staleTime: 2000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      id?: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      pickupAddress: string;
      deliveryAddress: string;
      pickupLat?: number;
      pickupLng?: number;
      deliveryLat?: number;
      deliveryLng?: number;
      pickupPlaceId?: string;
      deliveryPlaceId?: string;
      pickupLocationSource?: 'nominatim' | 'photon' | 'manual';
      deliveryLocationSource?: 'nominatim' | 'photon' | 'manual';
      pickupPrecision?: string;
      deliveryPrecision?: string;
      items: string;
      tipAmount?: number;
      distanceMiles?: number;
      cityId?: string;
      storeId?: string;
      orderScope?: string;
      customerSessionId?: string;
    }): Promise<Order> => {
      const rawTip = Number(orderData.tipAmount ?? 500);
      const tipCents = rawTip > 0 && rawTip < 100 ? Math.round(rawTip * 100) : Math.round(rawTip);

      const payload: CreateOrderPayload = {
        id: orderData.id,
        customerName: orderData.customerName.trim(),
        customerPhone: orderData.customerPhone.trim(),
        customerEmail: orderData.customerEmail?.trim() || undefined,
        pickupAddress: orderData.pickupAddress.trim(),
        deliveryAddress: orderData.deliveryAddress.trim(),
        pickupLat: orderData.pickupLat,
        pickupLng: orderData.pickupLng,
        deliveryLat: orderData.deliveryLat,
        deliveryLng: orderData.deliveryLng,
        pickupPlaceId: orderData.pickupPlaceId,
        deliveryPlaceId: orderData.deliveryPlaceId,
        pickupLocationSource: orderData.pickupLocationSource,
        deliveryLocationSource: orderData.deliveryLocationSource,
        pickupPrecision: orderData.pickupPrecision,
        deliveryPrecision: orderData.deliveryPrecision,
        items: orderData.items?.trim() || '[LEAVE AT DOOR] Standard delivery items',
        tipAmount: tipCents,
        distanceMiles: Math.max(0, Number(orderData.distanceMiles ?? 0)),
        cityId: orderData.cityId || APP_CONFIG.CITY_ID,
        storeId: orderData.storeId || APP_CONFIG.STORE_ID,
        orderScope: orderData.orderScope,
        customerSessionId: orderData.customerSessionId,
      };

      let createdOrder: Order;

      try {
        const created = await ordersApi.create(payload);
        createdOrder = useOrderStore.getState().upsertOrder(created);
      } catch (err: any) {
        console.warn('[useCreateOrder] Backend POST /orders failed, saving locally as fallback:', err);
        // Fallback to local store if offline / guest mode without token
        createdOrder = useOrderStore.getState().addOrder({
          ...orderData,
          tipAmount: tipCents,
        });
      }

      return createdOrder;
    },
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['order', newOrder.id] });
      await publishOrderChange({
        orderId: newOrder.id,
        type: 'created',
        customerName: newOrder.customerName,
        deliveryAddress: newOrder.deliveryAddress,
        items: newOrder.items,
      }).catch(() => { });
    },
  });
}


export function useClaimOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      driverUserId,
      driverName,
    }: {
      orderId: string;
      driverUserId: string;
      driverName?: string;
    }): Promise<Order> => {
      try {
        const claimed = await ordersApi.claim(orderId, { driverUserId, driverName });
        let finalOrder = claimed;
        try {
          const accepted = await ordersApi.update(orderId, { status: 'accepted' });
          if (accepted && accepted.id) {
            finalOrder = accepted;
          }
        } catch {
          // If update to accepted fails, keep assigned
        }
        const saved = useOrderStore.getState().upsertOrder(finalOrder);
        return saved;
      } catch (err: any) {
        console.warn(`[useClaimOrder] POST /orders/${orderId}/claim failed:`, err);
        if (err?.isNetworkError || err?.status === 0) {
          const updated = useOrderStore.getState().claimOrder(orderId, driverUserId, driverName);
          if (updated) return updated;
        }
        throw err;
      }
    },
    onSuccess: async (updatedOrder) => {
      queryClient.setQueriesData<Order[]>({ queryKey: ['orders', 'available'] }, (old = []) =>
        old.filter((o) => o.id !== updatedOrder.id)
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', updatedOrder.id] });
      await publishOrderChange({
        orderId: updatedOrder.id,
        type: 'updated',
        status: updatedOrder.status,
      }).catch(() => { });
    },
  });
}
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
      tipAmount,
      distanceMiles,
      pickupAddress,
      deliveryAddress,
      items,
      customerName,
      customerPhone,
      customerEmail,
    }: {
      id: string;
      status?: OrderStatus;
      ageVerified?: number | boolean;
      ageVerifiedAt?: string;
      deliveryPhotoUrl?: string;
      driverUserId?: string;
      driverName?: string;
      tipAmount?: number;
      distanceMiles?: number;
      pickupAddress?: string;
      deliveryAddress?: string;
      items?: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
    }): Promise<Order> => {
      const payload: UpdateOrderPayload = {
        ...(status ? { status } : {}),
        ...(ageVerified !== undefined ? { ageVerified } : {}),
        ...(ageVerifiedAt ? { ageVerifiedAt } : {}),
        ...(deliveryPhotoUrl ? { deliveryPhotoUrl } : {}),
        ...(driverUserId ? { driverUserId } : {}),
        ...(driverName ? { driverName } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Math.round(tipAmount) } : {}),
        ...(distanceMiles !== undefined ? { distanceMiles } : {}),
        ...(pickupAddress ? { pickupAddress } : {}),
        ...(deliveryAddress ? { deliveryAddress } : {}),
        ...(items ? { items } : {}),
        ...(customerName ? { customerName } : {}),
        ...(customerPhone ? { customerPhone } : {}),
        ...(customerEmail ? { customerEmail } : {}),
      };

      try {
        const remoteUpdated = await ordersApi.update(id, payload);
        const saved = useOrderStore.getState().upsertOrder(remoteUpdated);
        return saved;
      } catch (err) {
        console.warn(`[useUpdateOrderStatus] PATCH /orders/${id} failed, fallback local:`, err);
        const updated = useOrderStore.getState().updateOrder(id, payload as Partial<Order>);
        if (!updated) throw new Error(`Order ${id} not found`);
        return updated;
      }
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID]);
      if (status) {
        queryClient.setQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID], (old = []) =>
          old.map((o) => (o.id === id ? { ...o, status } : o))
        );
      }
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
      }).catch(() => { });
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['order', vars?.id] });
    },
  });
}
