import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrderStore, Order, OrderStatus } from '@/store/useOrderStore';
import { ordersApi, CreateOrderPayload, UpdateOrderPayload } from '@/apis/orders';
import { createCheckoutForOrder } from '@/apis/checkout';
import { publishOrderChange } from './realtime';
import { APP_CONFIG } from './config';

export type { Order, OrderStatus };

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
 * Hook to query a single order by ID using GET /orders/:id
 */
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

      throw new Error(`Order ${id} not found`);
    },
    initialData: id ? storeOrders.find((o) => o.id === id) : undefined,
    staleTime: 1000 * 5,
  });
}

/**
 * Hook to place a new delivery order using POST /orders
 */
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
      items: string;
      tipAmount?: number; // In cents or dollars
      distanceMiles?: number;
      cityId?: string;
      storeId?: string;
      orderScope?: string;
      customerSessionId?: string;
    }): Promise<Order> => {
      // Ensure tip amount is integer cents for backend validation
      const rawTip = Number(orderData.tipAmount ?? 500);
      const tipCents = rawTip > 0 && rawTip < 100 ? Math.round(rawTip * 100) : Math.round(rawTip);

      const payload: CreateOrderPayload = {
        id: orderData.id,
        customerName: orderData.customerName.trim(),
        customerPhone: orderData.customerPhone.trim(),
        customerEmail: orderData.customerEmail?.trim() || undefined,
        pickupAddress: orderData.pickupAddress.trim(),
        deliveryAddress: orderData.deliveryAddress.trim(),
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

      // Automatically call create-checkout API after order is generated
      if (createdOrder?.id) {
        try {
          const checkoutRes = await createCheckoutForOrder(createdOrder.id, {
            amountCents: tipCents,
            customerEmail: orderData.customerEmail,
            testMode: true,
          });
          if (checkoutRes?.url) {
            createdOrder = useOrderStore.getState().upsertOrder({
              ...createdOrder,
              checkoutUrl: checkoutRes.url,
              checkoutSessionId: checkoutRes.sessionId,
            });
          }
        } catch (checkoutErr) {
          console.warn('[useCreateOrder] Post-order createCheckout failed:', checkoutErr);
        }
      }

      return createdOrder;
    },
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
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
        const saved = useOrderStore.getState().upsertOrder(claimed);
        return saved;
      } catch (err) {
        console.warn(`[useClaimOrder] POST /orders/${orderId}/claim failed, fallback local:`, err);
        const updated = useOrderStore.getState().claimOrder(orderId, driverUserId, driverName);
        if (!updated) throw new Error('Could not claim order');
        return updated;
      }
    },
    onSuccess: async (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['order', updatedOrder.id] });
      await publishOrderChange({
        orderId: updatedOrder.id,
        type: 'updated',
        status: updatedOrder.status,
      }).catch(() => { });
    },
  });
}

/**
 * Hook to update order fields and transition lifecycle status using PATCH /orders/:id
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
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}
