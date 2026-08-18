import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from './blink';
import { publishOrderChange } from './realtime';
import { APP_CONFIG, ORDER_SCOPE, IS_STORE_BUILD } from './config';
import { blinkDbCreate, blinkDbUpdate, blinkDbList, blinkDbGet } from './blinkApi';

// SDK auto-converts snake_case DB columns → camelCase in JS
export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupAddress: string;
  deliveryAddress: string;
  items: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered';
  createdAt: string;
  userId?: string;
  cityId?: string;
  storeId?: string;
  orderScope?: string;
  tipAmount?: number;
  paymentStatus?: string;
  distanceMiles?: number;
  customerSessionId?: string;
  hasAlcohol?: number;
  ageVerified?: number;
  ageVerifiedAt?: string;
  deliveryPhotoUrl?: string;
  driverUserId?: string;
  driverName?: string;
  deliveryNotification?: {
    sent: boolean;
    reason?: string;
    messageSid?: string;
  };
}

export const ordersTable = blink.db.table<Order>('orders');

/** Send a delivery notification email to the customer (non-fatal) */
async function sendDeliveryNotification(order: Order) {
  if (!order.customerEmail) return;
  const orderId = order?.id ? order.id.slice(-6).toUpperCase() : '------';
  const { APP_NAME, PRIMARY_COLOR, CITY_NAME, STORE_NAME, STORE_PHONE } = APP_CONFIG;
  const brandName = IS_STORE_BUILD ? STORE_NAME : APP_NAME;

  // Build a delivery photo block if we have one
  const photoUrl = order.deliveryPhotoUrl;
  const photoBlock = photoUrl
    ? `
      <div style="margin: 24px 0; text-align: center;">
        <p style="font-size: 14px; color: #555; margin: 0 0 12px;"><strong>📸 Delivery Photo</strong></p>
        <a href="${photoUrl}" target="_blank" rel="noopener">
          <img src="${photoUrl}" alt="Delivery photo for order #${orderId}" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
        </a>
        <p style="font-size: 12px; color: #999; margin-top: 8px;">Tap the photo to view full size.</p>
      </div>
    `
    : '';

  const photoText = photoUrl ? `\nDelivery photo: ${photoUrl}\n` : '';

  try {
    await blink.notifications.email({
      to: order.customerEmail,
      subject: `✅ Your order #${orderId} has been delivered!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
          <div style="background: ${PRIMARY_COLOR}; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📦 Order Delivered!</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">${brandName}</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Hi <strong>${order.customerName}</strong>,</p>
            <p style="font-size: 16px; color: #333;">Great news — your order has just been delivered to:</p>
            <div style="background: #e8f0ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
              <p style="margin: 0; font-size: 15px; color: #003399;"><strong>📍 ${order.deliveryAddress}</strong></p>
            </div>
            <p style="font-size: 15px; color: #555;"><strong>Items:</strong> ${order.items}</p>
            <p style="font-size: 15px; color: #555;"><strong>Order ID:</strong> #${orderId}</p>
            ${photoBlock}
            ${IS_STORE_BUILD ? `<p style="font-size: 14px; color: #555;"><strong>Questions?</strong> Call us at ${STORE_PHONE}</p>` : ''}
            <p style="font-size: 14px; color: #888; margin-top: 24px;">Thank you for choosing ${brandName}. Enjoy your order!</p>
          </div>
          <div style="background: #f0f0f0; padding: 16px; text-align: center;">
            <p style="font-size: 12px; color: #999; margin: 0;">© ${new Date().getFullYear()} ${brandName} · ${CITY_NAME} · Automated notification</p>
          </div>
        </div>
      `,
      text: `Hi ${order.customerName},\n\nYour order #${orderId} has been delivered to:\n${order.deliveryAddress}\n\nItems: ${order.items}\n${photoText}\nThank you for choosing ${brandName}!`,
    });
  } catch (err) {
    console.warn('[notifications] Failed to send delivery email:', err);
  }
}

/** All orders — drivers see everything scoped to their market */
function validOrders(rows: unknown[]): Order[] {
  return rows.filter((row): row is Order => {
    const candidate = row as Partial<Order> | null;
    return typeof candidate?.id === 'string' && candidate.id.length > 0;
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders', APP_CONFIG.CITY_ID],
    queryFn: async () => {
      // Try SDK first, then REST fallback. Malformed legacy rows without IDs
      // are ignored because they cannot be accepted or opened safely.
      try {
        const result = await ordersTable.list({
          where: { orderScope: ORDER_SCOPE },
          orderBy: { createdAt: 'desc' },
          limit: 200,
        });
        return validOrders(result as unknown[]);
      } catch (sdkErr: any) {
        console.warn('[useOrders] SDK failed, trying REST fallback:', sdkErr?.message);
        const rows = await blinkDbList('orders', {
          where: { orderScope: ORDER_SCOPE },
          orderBy: { createdAt: 'desc' },
          limit: 200,
        });
        return validOrders(rows as unknown[]);
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      // Try SDK first, then REST fallback
      try {
        const result = await ordersTable.get(id!);
        return result as Order;
      } catch (sdkErr: any) {
        console.warn('[useOrder] SDK failed, trying REST fallback:', sdkErr?.message);
        const result = await blinkDbGet('orders', id!);
        return result as unknown as Order;
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 2,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      pickupAddress: string;
      deliveryAddress: string;
      items: string;
    }) => {
      const orderData = {
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail ?? '',
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        items: order.items,
        status: 'pending',
        cityId: APP_CONFIG.CITY_ID,
        storeId: APP_CONFIG.STORE_ID,
        orderScope: ORDER_SCOPE,
      };

      // Direct REST first (publishable key works without auth); SDK fallback.
      let result: any = null;
      const snakeData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(orderData)) {
        const snakeKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        snakeData[snakeKey] = value;
      }
      try {
        result = await blinkDbCreate('orders', snakeData);
      } catch (restErr: any) {
        console.warn('[useCreateOrder] REST failed, trying SDK fallback:', restErr?.message);
        try {
          result = await ordersTable.create(orderData as any);
        } catch (sdkErr: any) {
          throw sdkErr;
        }
      }
      return result as Order;
    },
    onSuccess: async (newOrder) => {
      queryClient.setQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID], (old = []) => [newOrder, ...old]);
      await publishOrderChange({
        orderId: newOrder.id,
        type: 'created',
        customerName: newOrder.customerName,
        deliveryAddress: newOrder.deliveryAddress,
        items: newOrder.items,
      });
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
    }: {
      id: string;
      status: 'delivered' | 'accepted' | 'picked_up' | 'pending';
      ageVerified?: number;
      ageVerifiedAt?: string;
      deliveryPhotoUrl?: string;
      driverUserId?: string;
      driverName?: string;
    }) => {
      const patch: Record<string, unknown> = { status };
      if (ageVerified !== undefined) patch.ageVerified = ageVerified;
      if (ageVerifiedAt) patch.ageVerifiedAt = ageVerifiedAt;
      if (deliveryPhotoUrl) patch.deliveryPhotoUrl = deliveryPhotoUrl;
      if (driverUserId) patch.driverUserId = driverUserId;
      if (driverName) patch.driverName = driverName;

      if (!id) throw new Error('This order is missing its ID. Refresh the Orders tab and try again.');

      // Use the backend first: guest/test-driver mode is intentionally allowed
      // to update public orders, while the SDK update may require a user JWT.
      let result: any;
      const snakePatch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        const snakeKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        snakePatch[snakeKey] = value;
      }
      try {
        result = await blinkDbUpdate('orders', id, snakePatch);
      } catch (backendErr: any) {
        console.warn('[useUpdateOrderStatus] Backend failed, trying SDK fallback:', backendErr?.message);
        result = await ordersTable.update(id, patch);
      }
      return result as Order;
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
    onSuccess: async (_updated, vars) => {
      const { id, status, deliveryPhotoUrl } = vars;
      await publishOrderChange({ orderId: id, type: 'updated', status });
      if (status === 'delivered') {
        // Get the order with the deliveryPhotoUrl from the in-flight data
        const allOrders = queryClient.getQueryData<Order[]>(['orders', APP_CONFIG.CITY_ID]);
        let order = allOrders?.find((o) => o.id === id);
        // Fallback: use the mutated variables (which includes the photo URL)
        if (!order) order = { id, status } as Order;
        const fullOrder: Order = {
          ...order,
          deliveryPhotoUrl: deliveryPhotoUrl ?? order.deliveryPhotoUrl,
        };
        sendDeliveryNotification(fullOrder);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders', APP_CONFIG.CITY_ID] });
      queryClient.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}
