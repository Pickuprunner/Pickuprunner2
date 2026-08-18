import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@blinkdotnew/sdk";
import Stripe from "stripe";

const app = new Hono();
app.use("*", cors());

// ── Public order writes ──────────────────────────────────────────────────────
// The app intentionally allows guest ordering and guest test-driver mode. Keep
// these small routes limited to the order fields used by the client; the Blink
// secret stays server-side in the backend environment.
const orderWriteFields = new Set([
  "id", "customer_name", "customer_phone", "customer_email", "pickup_address",
  "delivery_address", "items", "status", "distance_miles", "tip_amount",
  "payment_status", "city_id", "store_id", "order_scope", "customer_session_id",
  "driver_user_id", "driver_name", "age_verified", "age_verified_at",
  "delivery_photo_url",
]);

function filterOrderWrite(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => orderWriteFields.has(key))
  );
}

function toCamelCase(key: string) {
  return key.replace(/_([a-z])/g, (_, character) => character.toUpperCase());
}

function normalizeOrderPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [toCamelCase(key), value])
  );
}

type DeliveryNotificationResult = {
  sent: boolean;
  reason?: string;
  messageSid?: string;
};

function normalizeCustomerPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone.startsWith('+') ? `+${digits}` : phone;
}

async function sendDeliveryMms(
  env: Record<string, string>,
  order: Record<string, unknown>,
): Promise<DeliveryNotificationResult> {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM_PHONE_NUMBER;
  const customerPhone = typeof order.customerPhone === 'string' ? order.customerPhone : '';
  const photoUrl = typeof order.deliveryPhotoUrl === 'string' ? order.deliveryPhotoUrl : '';

  if (!accountSid || !authToken || !from) {
    return { sent: false, reason: 'Twilio is not configured' };
  }
  if (!customerPhone) {
    return { sent: false, reason: 'Customer has no phone number' };
  }
  if (!photoUrl || !photoUrl.startsWith('https://')) {
    return { sent: false, reason: 'Delivery photo URL is unavailable' };
  }

  const orderId = typeof order.id === 'string' ? order.id.slice(-6).toUpperCase() : '------';
  const body = [
    `Pickup Runner: Your order #${orderId} was delivered.`,
    `Delivery address: ${order.deliveryAddress || 'your requested address'}.`,
    'Your delivery photo is attached.',
  ].join(' ');
  const params = new URLSearchParams({
    To: normalizeCustomerPhone(customerPhone),
    From: from,
    Body: body,
    MediaUrl: photoUrl,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Twilio MMS failed (${response.status}): ${responseText.slice(0, 300)}`);
  }

  const result = JSON.parse(responseText) as { sid?: string };
  return { sent: true, messageSid: result.sid };
}

app.post("/delivery-photo", async (c) => {
  const env = c.env as Record<string, string>;
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart upload" }, 400);
  }

  const file = form.get("file");
  const requestedPath = form.get("path");
  if (!(file instanceof File) || typeof requestedPath !== "string") {
    return c.json({ error: "A photo file and storage path are required" }, 400);
  }
  if (!requestedPath.startsWith("delivery-photos/")) {
    return c.json({ error: "Invalid delivery photo path" }, 400);
  }

  const uploadForm = new FormData();
  uploadForm.append("file", file, file.name || "delivery-photo.jpg");
  uploadForm.append("path", requestedPath);
  const projectId = env.BLINK_PROJECT_ID;
  const response = await fetch(`https://core.blink.new/api/storage/${projectId}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.BLINK_SECRET_KEY}`,
      Accept: "application/json",
    },
    body: uploadForm,
  });
  const responseText = await response.text();
  if (!response.ok) {
    console.error("[delivery-photo] upload failed:", response.status, responseText.slice(0, 300));
    return c.json({ error: `Photo upload failed (${response.status})` }, response.status as any);
  }

  try {
    return c.json(JSON.parse(responseText));
  } catch {
    return c.json({ error: "Photo upload returned invalid data" }, 502);
  }
});

function makeOrderId() {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

app.post("/orders", async (c) => {
  const env = c.env as Record<string, string>;
  const db = getBlink(env);
  const ordersTable = db.db.table<any>("orders");
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const payload = filterOrderWrite(body);
  const normalizedPayload = normalizeOrderPayload(payload);
  normalizedPayload.id = typeof normalizedPayload.id === "string" && normalizedPayload.id.length > 0 ? normalizedPayload.id : makeOrderId();

  try {
    const order = await ordersTable.create(normalizedPayload as any);
    return c.json(order, 201);
  } catch (err: any) {
    console.error("[orders] create error:", err?.message);
    return c.json({ error: err?.message || "Could not create order" }, 500);
  }
});

app.patch("/orders/:id", async (c) => {
  const env = c.env as Record<string, string>;
  const db = getBlink(env);
  const ordersTable = db.db.table<any>("orders");
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Order id is required" }, 400);

  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const payload = filterOrderWrite(body);
  const normalizedPayload = normalizeOrderPayload(payload);
  delete normalizedPayload.id;

  try {
    const currentOrder = await ordersTable.get(id) as Record<string, unknown> | null;
    const wasAlreadyDelivered = currentOrder?.status === 'delivered';
    const order = await ordersTable.update(id, normalizedPayload as any) as Record<string, unknown>;
    let deliveryNotification: DeliveryNotificationResult | undefined;

    if (normalizedPayload.status === 'delivered' && !wasAlreadyDelivered) {
      try {
        deliveryNotification = await sendDeliveryMms(env, order);
        console.log(`[orders] delivery MMS for ${id}:`, deliveryNotification);
      } catch (notificationError: any) {
        deliveryNotification = { sent: false, reason: notificationError?.message || 'Could not send delivery MMS' };
        console.error(`[orders] delivery MMS failed for ${id}:`, notificationError?.message);
      }
    }

    return c.json({ ...order, deliveryNotification });
  } catch (err: any) {
    console.error(`[orders] update ${id} error:`, err?.message);
    return c.json({ error: err?.message || "Could not update order" }, 500);
  }
});

// ── Lazy Stripe init (cache by key to support live + test mode) ───────────────
const _stripeCache: Record<string, Stripe> = {};
const getStripe = (secretKey: string): Stripe => {
  if (!_stripeCache[secretKey]) {
    _stripeCache[secretKey] = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  }
  return _stripeCache[secretKey];
};

/** Resolve the correct Stripe key based on test/live mode */
const resolveStripeKey = (env: Record<string, string>, testMode?: boolean, paymentMode?: string): string => {
  // Honor the caller's mode flag if set; otherwise prefer test key for safety.
  if (testMode === true) return env.STRIPE_TEST_SECRET_KEY || env.STRIPE_SECRET_KEY;
  if (testMode === false) return env.STRIPE_SECRET_KEY || env.STRIPE_TEST_SECRET_KEY;
  // No flag passed — fall back to test key (safer default).
  return env.STRIPE_TEST_SECRET_KEY || env.STRIPE_SECRET_KEY;
};

const getBlink = (env: Record<string, string>) =>
  createClient({
    projectId: env.BLINK_PROJECT_ID,
    secretKey: env.BLINK_SECRET_KEY,
  });

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ ok: true }));

// ── POST /create-checkout ─────────────────────────────────────────────────────
// Marketplace flow: charge customer, platform keeps $10 fee, rest goes to driver.
app.post("/create-checkout", async (c) => {
  const env = c.env as Record<string, string>;
  const blink = getBlink(env);

  let body: {
    orderId: string;
    amountCents: number;
    customerName: string;
    customerEmail?: string;
    description: string;
    storeName?: string;
    applicationFeeCents?: number;
    testMode?: boolean;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { orderId, amountCents, customerName, customerEmail, description, storeName, applicationFeeCents, testMode } = body;
  // Default to LIVE mode since the project uses live Stripe keys; client can override with testMode:true
  const stripeKey = resolveStripeKey(env, testMode ?? false);
  const stripe = getStripe(stripeKey);

  if (!orderId || !amountCents || amountCents < 50) {
    return c.json({ error: "orderId and amountCents (≥ 50) are required" }, 400);
  }

  const rawOrigin = c.req.header("origin") || "";
  const isProdOrigin = rawOrigin.includes("blinkpowered.com") || rawOrigin.includes("pickup-runner");
  const origin = isProdOrigin ? rawOrigin : "https://pickup-runner-app-vljh4v3j.blinkpowered.com";
  const successUrl = `${origin}?payment=success&order=${orderId}`;
  const cancelUrl  = `${origin}?payment=cancelled&order=${orderId}`;

  try {
    // ── Look up the assigned driver's Stripe Connect account ─────────────
    let driverStripeAccountId: string | null = null;
    let feeAmount = applicationFeeCents ?? 1000; // default $10

    const orders = await blink.db.orders.list({ where: { id: orderId } });
    const order = orders[0] as any;

    const driverUid = order?.driver_user_id ?? order?.driverUserId;
    if (driverUid) {
      driverStripeAccountId = await getDriverStripeId(blink, driverUid);
    }

    // Build the checkout session
    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: customerEmail || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: storeName ? `${storeName} — Delivery` : `Pickup Runner Delivery`,
            description: description || `Order for ${customerName}`,
          },
        },
      }],
      metadata: { orderId, customerName, paymentMode: testMode ? 'test' : 'live' },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    // If the driver has a connected Stripe account, record the split info
    // in metadata. The actual transfer happens in the webhook after payment.
    if (driverStripeAccountId) {
      if (feeAmount >= amountCents) {
        feeAmount = Math.max(100, amountCents - 100);
      }
      sessionParams.metadata.driverStripeAccountId = driverStripeAccountId;
      sessionParams.metadata.applicationFeeCents = String(feeAmount);
      sessionParams.metadata.driverPayoutCents = String(amountCents - feeAmount);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return c.json({
      url: session.url,
      sessionId: session.id,
      splitPayment: !!driverStripeAccountId,
      applicationFeeCents: driverStripeAccountId ? feeAmount : 0,
    });
  } catch (err: any) {
    console.error("[stripe] create-checkout error:", err?.message);
    return c.json({ error: err?.message || "Stripe error" }, 500);
  }
});

// ── POST /send-payment-link ───────────────────────────────────────────────────
app.post("/send-payment-link", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));
  const blink = getBlink(env);

  let body: {
    orderId: string;
    amountCents: number;
    customerName: string;
    customerEmail: string;
    description: string;
    applicationFeeCents?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { orderId, amountCents, customerName, customerEmail, description, applicationFeeCents } = body;

  if (!orderId || !amountCents || amountCents < 50 || !customerEmail) {
    return c.json({ error: "orderId, amountCents, and customerEmail are required" }, 400);
  }

  const origin = "https://pickup-runner-app-vljh4v3j.blinkpowered.com";
  const successUrl = `${origin}?payment=success&order=${orderId}`;
  const cancelUrl  = `${origin}?payment=cancelled&order=${orderId}`;

  try {
    // ── Look up the assigned driver's Stripe Connect account ─────────────
    let driverStripeAccountId: string | null = null;
    let feeAmount = applicationFeeCents ?? 1000; // default $10

    const orders = await blink.db.orders.list({ where: { id: orderId } });
    const order = orders[0] as any;

    const driverUid = order?.driver_user_id ?? order?.driverUserId;
    if (driverUid) {
      driverStripeAccountId = await getDriverStripeId(blink, driverUid);
    }

    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: customerEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: "Fry's Runner Delivery",
            description: description || `Order for ${customerName}`,
          },
        },
      }],
      metadata: { orderId, customerName },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    if (driverStripeAccountId) {
      if (feeAmount >= amountCents) {
        feeAmount = Math.max(100, amountCents - 100);
      }
      sessionParams.metadata.driverStripeAccountId = driverStripeAccountId;
      sessionParams.metadata.applicationFeeCents = String(feeAmount);
      sessionParams.metadata.driverPayoutCents = String(amountCents - feeAmount);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    const paymentUrl = session.url!;

    await blink.notifications.email({
      to: customerEmail,
      subject: "Your Pickup Runner order has been picked up — pay now",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#111">Your order is on the way! 🚚</h2>
          <p style="color:#444">Hi ${customerName}, your Pickup Runner delivery has been picked up and is heading your way.</p>
          <p style="color:#444"><strong>Order:</strong> ${description}</p>
          <p style="color:#444">Please complete your payment at your earliest convenience.</p>
          <a href="${paymentUrl}"
             style="display:inline-block;margin-top:16px;padding:14px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px">
            Pay Now
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px">
            This link expires in 24 hours. Reply to this email if you have any questions.
          </p>
        </div>
      `,
    });

    await blink.db.orders.update(orderId, { payment_status: "link_sent" });

    return c.json({ url: paymentUrl, sessionId: session.id });
  } catch (err: any) {
    console.error("[send-payment-link] error:", err?.message);
    return c.json({ error: err?.message || "Failed to send payment link" }, 500);
  }
});

// ── POST /webhook ─────────────────────────────────────────────────────────────
app.post("/webhook", async (c) => {
  const env = c.env as Record<string, string>;

  const signature = c.req.header("stripe-signature");
  const rawBody = await c.req.text();

  // Try both live and test webhook secrets
  let event: any;
  let isLiveEvent = false;
  const secretPairs = [
    { secret: env.STRIPE_WEBHOOK_SECRET, live: true },
    { secret: env.STRIPE_TEST_WEBHOOK_SECRET, live: false },
  ].filter(sp => sp.secret);

  for (const { secret, live } of secretPairs) {
    try {
      // Must use the matching Stripe instance for verification
      const key = live ? env.STRIPE_SECRET_KEY : (env.STRIPE_TEST_SECRET_KEY || env.STRIPE_SECRET_KEY);
      event = await getStripe(key).webhooks.constructEventAsync(rawBody, signature, secret);
      isLiveEvent = live;
      break;
    } catch {
      // try next secret
    }
  }
  if (!event) {
    console.error("[webhook] signature verification failed with all configured secrets");
    return c.json({ error: "Invalid signature" }, 400);
  }

  // Use the Stripe instance that matches the event's mode for all subsequent calls
  const eventStripeKey = isLiveEvent ? env.STRIPE_SECRET_KEY : (env.STRIPE_TEST_SECRET_KEY || env.STRIPE_SECRET_KEY);
  const eventStripe = getStripe(eventStripeKey);
  console.log(`[webhook] ${event.type} (${isLiveEvent ? 'LIVE' : 'TEST'} mode)`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId && session.payment_status === "paid") {
      const blink = getBlink(env);
      try {
        const driverStripeAccountId = session.metadata?.driverStripeAccountId;
        const applicationFeeCents = session.metadata?.applicationFeeCents;
        const driverPayoutCents = session.metadata?.driverPayoutCents;
        const paymentMode = session.metadata?.paymentMode || 'live';

        const updateData: any = { payment_status: paymentMode === 'test' ? 'test_paid' : 'paid' };

        // Transfer driver's net share to their connected account
        if (driverStripeAccountId && driverPayoutCents) {
          const payoutAmount = parseInt(driverPayoutCents, 10);
          const feeAmount = parseInt(applicationFeeCents || '0', 10);

          const transfer = await eventStripe.transfers.create({
            amount: payoutAmount,
            currency: "usd",
            destination: driverStripeAccountId,
            description: `Driver payout — Order #${orderId.slice(-6).toUpperCase()}`,
            metadata: { orderId, applicationFeeCents: String(feeAmount) },
          });

          updateData.platform_fee_cents = feeAmount;
          updateData.driver_stripe_account_id = driverStripeAccountId;
          updateData.driver_transfer_id = transfer.id;
          console.log(`[webhook] Order ${orderId}: transferred ${(payoutAmount/100).toFixed(2)} → ${driverStripeAccountId} (platform kept ${(feeAmount/100).toFixed(2)})`);
        }

        await blink.db.orders.update(orderId, updateData);
        console.log(`[webhook] Order ${orderId} marked as ${updateData.payment_status}`);
      } catch (err: any) {
        console.error(`[webhook] Failed to update order ${orderId}:`, err?.message);
      }
    }
  }

  return c.json({ received: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRIPE CONNECT — Driver payouts
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: get driver's stripeAccountId from users table metadata
async function getDriverStripeId(db: ReturnType<typeof getBlink>, driverUserId: string): Promise<string | null> {
  try {
    const users = await db.db.users.list({ where: { id: driverUserId } });
    const user = users[0] as any;
    if (!user?.metadata) return null;
    const meta = typeof user.metadata === "string" ? JSON.parse(user.metadata) : user.metadata;
    return meta?.stripeAccountId ?? null;
  } catch {
    return null;
  }
}

// ── POST /connect/auto-create ─────────────────────────────────────────────────
// Automatically creates a Stripe Express account for a driver (no onboarding URL).
// Called on driver registration. Returns the account ID.
// Body: { driverUserId, driverEmail?, driverName? }
app.post("/connect/auto-create", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));
  const db = getBlink(env);

  let body: { driverUserId: string; driverEmail?: string; driverName?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { driverUserId, driverEmail, driverName } = body;
  if (!driverUserId) {
    return c.json({ error: "driverUserId is required" }, 400);
  }

  try {
    // Check if account already exists
    const existingId = await getDriverStripeId(db, driverUserId);
    if (existingId) {
      try {
        const account = await stripe.accounts.retrieve(existingId);
        return c.json({
          stripeAccountId: existingId,
          alreadyExists: true,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });
      } catch {
        // Account might have been deleted — create a new one
      }
    }

    // Create a Custom account — fully controllable, no onboarding flow needed
    const account = await stripe.accounts.create({
      type: "custom",
      country: "US",
      email: driverEmail || undefined,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      individual: {
        first_name: (driverName || "Test").split(" ")[0],
        last_name: (driverName || "Driver").split(" ").slice(1).join(" ") || "Driver",
        email: driverEmail || "test@example.com",
        dob: { day: 1, month: 1, year: 1990 },
        address: {
          line1: "123 Main St",
          city: "Sahuarita",
          state: "AZ",
          postal_code: "85629",
        },
      },
      business_profile: {
        name: driverName || undefined,
        product_description: "Delivery driver — pickup and delivery services",
        mcc: "7299",
        url: "https://pickup-runner-app-vljh4v3j.blinkpowered.com",
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "127.0.0.1",
      },
      external_account: {
        object: "bank_account",
        country: "US",
        currency: "usd",
        routing_number: "110000000",
        account_number: "000123456789",
        account_holder_name: driverName || "Test Driver",
        account_holder_type: "individual",
      },
      settings: {
        payouts: { schedule: { interval: "daily" } },
      },
      metadata: {
        driverUserId,
        app: "pickup-runner",
      },
    });

    // Persist stripeAccountId to user metadata
    try {
      const users = await db.db.users.list({ where: { id: driverUserId } });
      const user = users[0] as any;

      if (user) {
        // Update existing user
        const existingMeta = user?.metadata
          ? (typeof user.metadata === "string" ? JSON.parse(user.metadata) : user.metadata)
          : {};
        await db.db.users.update(driverUserId, {
          metadata: JSON.stringify({ ...existingMeta, stripeAccountId: account.id }),
        });
      } else {
        // Create user row with stripe account
        await db.db.users.create({
          id: driverUserId,
          email: driverEmail || '',
          display_name: driverName || '',
          metadata: JSON.stringify({ stripeAccountId: account.id }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sign_in: new Date().toISOString(),
          email_verified: 0,
        });
      }
    } catch (persistErr: any) {
      console.warn(`[auto-create] Could not persist stripeAccountId: ${persistErr?.message}`);
    }

    console.log(`[auto-create] Created Stripe account ${account.id} for driver ${driverUserId}`);
    return c.json({
      stripeAccountId: account.id,
      alreadyExists: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  } catch (err: any) {
    console.error("[auto-create] error:", err?.message);
    return c.json({ error: err?.message || "Failed to create account" }, 500);
  }
});

// ── POST /connect/onboard ─────────────────────────────────────────────────────
// Creates a Stripe Custom account for a driver and returns the onboarding URL.
// Body: { driverUserId, driverEmail?, returnUrl, refreshUrl }
app.post("/connect/onboard", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));
  const db = getBlink(env);

  let body: { driverUserId: string; driverEmail?: string; returnUrl: string; refreshUrl: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { driverUserId, stripeAccountId: directAccountId, driverEmail, returnUrl, refreshUrl } = body;
  if ((!driverUserId && !directAccountId) || !returnUrl || !refreshUrl) {
    return c.json({ error: "(driverUserId or stripeAccountId), returnUrl, refreshUrl are required" }, 400);
  }

  try {
    let stripeAccountId = directAccountId || await getDriverStripeId(db, driverUserId!);

    if (!stripeAccountId) {
      return c.json({ error: "Driver has no Stripe account. Call /connect/auto-create first." }, 400);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return c.json({ url: accountLink.url, stripeAccountId });
  } catch (err: any) {
    console.error("[connect/onboard] error:", err?.message);
    return c.json({ error: err?.message || "Failed to start onboarding" }, 500);
  }
});

// ── GET /connect/status?driverUserId=xxx ──────────────────────────────────────
// Returns whether the driver's Stripe account is fully verified and payouts enabled.
app.get("/connect/status", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));
  const db = getBlink(env);

  const driverUserId = c.req.query("driverUserId");
  if (!driverUserId) return c.json({ error: "driverUserId required" }, 400);

  try {
    const stripeAccountId = await getDriverStripeId(db, driverUserId);

    if (!stripeAccountId) {
      return c.json({ connected: false, payoutsEnabled: false, stripeAccountId: null });
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    return c.json({
      connected: true,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      stripeAccountId,
    });
  } catch (err: any) {
    console.error("[connect/status] error:", err?.message);
    return c.json({ error: err?.message }, 500);
  }
});

// ── POST /connect/manual-payout ───────────────────────────────────────────────
// Triggers a payout from a connected account's balance → their bank.
// Accepts stripeAccountId directly (useful for admin/test flows).
// Body: { stripeAccountId, amountCents?, description? }
// If amountCents omitted, pays out the full available balance.
app.post("/connect/manual-payout", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));

  let body: { stripeAccountId: string; amountCents?: number; description?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { stripeAccountId, description } = body;
  if (!stripeAccountId) return c.json({ error: "stripeAccountId is required" }, 400);

  try {
    // 1. Get the connected account's balance
    const balance = await stripe.balance.retrieve({}, { stripeAccount: stripeAccountId });
    const availableUsd = (balance.available || []).find((b: any) => b.currency === 'usd');
    const availableCents = availableUsd?.amount ?? 0;
    const instantUsd = (balance.instant_available || []).find((b: any) => b.currency === 'usd');
    const instantCents = instantUsd?.amount ?? 0;
    const pendingUsd = (balance.pending || []).find((b: any) => b.currency === 'usd');
    const pendingCents = pendingUsd?.amount ?? 0;

    console.log(`[manual-payout] ${stripeAccountId} — available: ${(availableCents / 100).toFixed(2)}, instant: ${(instantCents / 100).toFixed(2)}, pending: ${(pendingCents / 100).toFixed(2)}`);

    // Try available first, then instant_available, then pending
    let payCents = availableCents;
    let payoutMethod: string | undefined;

    if (payCents <= 0 && instantCents > 0) {
      payCents = instantCents;
      payoutMethod = 'instant';
    }

    if (payCents <= 0 && pendingCents > 0) {
      // In test mode, pending funds can take time to settle.
      // Try creating a standard payout anyway — test mode may allow it.
      payCents = pendingCents;
      payoutMethod = undefined;
    }

    if (payCents <= 0) {
      return c.json({
        error: "No balance to payout",
        available: availableCents,
        instant: instantCents,
        pending: pendingCents,
      }, 400);
    }

    const payoutAmount = body.amountCents && body.amountCents < payCents
      ? body.amountCents
      : payCents;

    // 2. Create payout from the connected account to their linked bank
    const payoutParams: any = {
      amount: payoutAmount,
      currency: "usd",
      description: description || `Manual payout — ${new Date().toLocaleDateString()}`,
      metadata: { triggeredBy: "admin", stripeAccountId },
    };
    if (payoutMethod) payoutParams.method = payoutMethod;

    const payout = await stripe.payouts.create(
      payoutParams,
      { stripeAccount: stripeAccountId }
    );

    console.log(`[manual-payout] Created payout ${payout.id}: ${(payoutAmount / 100).toFixed(2)} → ${stripeAccountId}`);

    return c.json({
      success: true,
      payoutId: payout.id,
      amountCents: payoutAmount,
      amountFormatted: `${(payoutAmount / 100).toFixed(2)}`,
      status: payout.status,
      arrivalDate: payout.arrival_date,
      availableBeforeCents: availableCents,
    });
  } catch (err: any) {
    console.error("[manual-payout] error:", err?.message);
    return c.json({ error: err?.message || "Payout failed" }, 500);
  }
});

// ── GET /connect/balance ─────────────────────────────────────────────────────
// Returns the available + pending balance for a connected account.
// Query: ?stripeAccountId=acct_xxx
app.get("/connect/balance", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));

  const stripeAccountId = c.req.query("stripeAccountId");
  if (!stripeAccountId) return c.json({ error: "stripeAccountId required" }, 400);

  try {
    const balance = await stripe.balance.retrieve({}, { stripeAccount: stripeAccountId });
    return c.json({ balance });
  } catch (err: any) {
    console.error("[connect/balance] error:", err?.message);
    return c.json({ error: err?.message || "Failed to fetch balance" }, 500);
  }
});

// ── POST /connect/payout ──────────────────────────────────────────────────────
// Transfers driver earnings from platform account → driver's Express account.
// Body: { driverUserId, amountCents, description? }
app.post("/connect/payout", async (c) => {
  const env = c.env as Record<string, string>;
  const stripe = getStripe(resolveStripeKey(env, false));
  const db = getBlink(env);

  let body: { driverUserId: string; amountCents: number; description?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { driverUserId, amountCents, description } = body;
  if (!driverUserId || !amountCents || amountCents < 100) {
    return c.json({ error: "driverUserId and amountCents (≥ $1.00) are required" }, 400);
  }

  try {
    const stripeAccountId = await getDriverStripeId(db, driverUserId);
    if (!stripeAccountId) {
      return c.json({ error: "Driver has not connected a bank account yet" }, 400);
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.payouts_enabled) {
      return c.json({ error: "Driver's Stripe account is not fully verified yet" }, 400);
    }

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "usd",
      destination: stripeAccountId,
      description: description || `Driver payout — ${new Date().toLocaleDateString()}`,
    });

    return c.json({ success: true, transferId: transfer.id, amount: amountCents });
  } catch (err: any) {
    console.error("[connect/payout] error:", err?.message);
    return c.json({ error: err?.message || "Payout failed" }, 500);
  }
});

// ── POST /connect/transfer-earnings ──────────────────────────────────────────
// Transfers driver's portion (mileage + tip) from platform → driver's account.
// Called when a driver accepts an already-paid order.
// Idempotent: skips if order already has a transfer.
app.post("/connect/transfer-earnings", async (c) => {
  const env = c.env as Record<string, string>;
  const db = getBlink(env);

  let body: { orderId: string; driverUserId: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { orderId, driverUserId } = body;
  if (!orderId || !driverUserId) {
    return c.json({ error: "orderId and driverUserId are required" }, 400);
  }

  try {
    // 1. Fetch the order
    const orders = await db.db.orders.list({ where: { id: orderId } });
    const order = orders[0] as any;
    if (!order) return c.json({ error: "Order not found" }, 404);

    // 2. Only transfer if order was actually paid (including test_paid)
    const paymentStatus = order.payment_status ?? order.paymentStatus;
    const isTestPayment = paymentStatus === 'test_paid';
    if (paymentStatus !== "paid" && !isTestPayment) {
      return c.json({ skipped: true, reason: `Order payment_status is "${paymentStatus}" — no real payment to split` });
    }

    // 3. Idempotency — skip if already transferred
    const existingTransferId = order.driver_transfer_id ?? order.driverTransferId;
    if (existingTransferId) {
      return c.json({ skipped: true, reason: "Already transferred", transferId: existingTransferId });
    }

    // Use the same Stripe mode as the original payment (test or live)
    const stripe = getStripe(resolveStripeKey(env, isTestPayment, undefined));

    // 4. Get driver's Stripe Connect account
    const stripeAccountId = await getDriverStripeId(db, driverUserId);
    if (!stripeAccountId) {
      return c.json({ error: "Driver has not connected a bank account yet" }, 400);
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.payouts_enabled) {
      return c.json({ error: "Driver's Stripe account is not fully verified yet" }, 400);
    }

    // 5. Calculate driver earnings: mileage + tip (NOT the base fee)
    const MILEAGE_RATE = 200; // $2.00/mile
    const FREE_MILES = 0;
    const distanceMiles = parseFloat(order.distance_miles ?? order.distanceMiles ?? 0) || 0;
    const tipAmount = parseInt(order.tip_amount ?? order.tipAmount ?? 0) || 0;
    const billableMiles = Math.max(0, distanceMiles - FREE_MILES);
    const mileageCents = Math.round(billableMiles * MILEAGE_RATE);
    const driverEarningsCents = mileageCents + tipAmount;

    if (driverEarningsCents < 50) {
      return c.json({ skipped: true, reason: "Driver earnings below $0.50 minimum", earnings: driverEarningsCents });
    }

    // 6. Create the transfer
    const transfer = await stripe.transfers.create({
      amount: driverEarningsCents,
      currency: "usd",
      destination: stripeAccountId,
      description: `Driver earnings — Order #${orderId.slice(-6).toUpperCase()} (${billableMiles.toFixed(1)} mi + ${(tipAmount / 100).toFixed(2)} tip)`,
      metadata: {
        orderId,
        driverUserId,
        mileageCents: String(mileageCents),
        tipCents: String(tipAmount),
      },
    });

    // 7. Record on the order
    await db.db.orders.update(orderId, {
      driver_transfer_id: transfer.id,
      driver_stripe_account_id: stripeAccountId,
      platform_fee_cents: 1000,
    });

    console.log(`[transfer-earnings] Order ${orderId}: transferred ${(driverEarningsCents / 100).toFixed(2)} → ${stripeAccountId}`);

    return c.json({
      success: true,
      transferId: transfer.id,
      driverEarningsCents,
      mileageCents,
      tipCents: tipAmount,
      destination: stripeAccountId,
    });
  } catch (err: any) {
    console.error("[transfer-earnings] error:", err?.message);
    return c.json({ error: err?.message || "Transfer failed" }, 500);
  }
});

export default app;