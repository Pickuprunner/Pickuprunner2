/**
 * Direct Blink DB REST API helper — bypasses SDK internals.
 *
 * The Blink DB REST endpoint requires either:
 *   1. A user-authenticated JWT (signed in as a customer), OR
 *   2. The project SECRET key for server-to-server writes.
 * The publishable key alone is NOT allowed for writes (it works for reads only).
 *
 * Used as a fallback path when the SDK call fails (e.g. transient 401/timeout).
 * The SDK path is always tried first in `lib/orders.ts`; this file's helpers
 * are only called when the SDK throws.
 *
 * On the browser, requests to `core.blink.new` cross origins and trigger CORS
 * preflight. For native (iOS/Android), there is no CORS enforcement. To keep
 * both web and native working, we set `mode: 'cors'` + omit the `apikey`
 * header (the postgREST endpoint accepts `Authorization: Bearer ...` alone).
 */

const PROJECT_ID = 'pickup-runner-app-vljh4v3j';
const PUBLISHABLE_KEY = 'blnk_pk_ih4_wg3zLC5i5OGm_VnjRdaZ7x5Lb7AM';
const API_BASE = 'https://core.blink.new/api/db';
const BACKEND_BASE = 'https://vljh4v3j.backend.blink.new';

const READ_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': PUBLISHABLE_KEY,
  'Authorization': `Bearer ${PUBLISHABLE_KEY}`,
};

// Writes go through the deployed backend so the project secret never ships
// in the browser or native bundle.
const WRITE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

function makeOrderId(): string {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Convert camelCase to snake_case */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
}

/** Convert snake_case object keys to camelCase */
function keysToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Create a record via direct REST. Returns the new row (with id, server-
 * generated fields, etc.). The SDK's `create()` does the same thing and is
 * tried first in `lib/orders.ts#useCreateOrder` — this fallback exists for
 * the case where the SDK throws or times out. Errors fall through normally
 * so the caller can decide whether to retry.
 */
export async function blinkDbCreate(table: string, data: Record<string, unknown>) {
  if (table !== 'orders') {
    throw new Error(`Unsupported write table: ${table}`);
  }

  const payload = { ...data, id: data.id || makeOrderId() };
  const url = `${BACKEND_BASE}/orders`;
  console.log(`[blinkApi] POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: WRITE_HEADERS,
    body: JSON.stringify(payload),
  });

  console.log(`[blinkApi] POST orders → ${res.status}`);

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[blinkApi] Error: ${errBody}`);
    throw new Error(`DB create failed (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  return keysToCamelCase(json);
}

/** Update an order by ID through the deployed backend. */
export async function blinkDbUpdate(table: string, id: string, data: Record<string, unknown>) {
  if (table !== 'orders') {
    throw new Error(`Unsupported write table: ${table}`);
  }

  const url = `${BACKEND_BASE}/orders/${encodeURIComponent(id)}`;
  console.log(`[blinkApi] PATCH ${url}`);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: WRITE_HEADERS,
    body: JSON.stringify(data),
  });

  console.log(`[blinkApi] PATCH orders/${id} → ${res.status}`);

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[blinkApi] Error: ${errBody}`);
    throw new Error(`DB update failed (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  return keysToCamelCase(json);
}

/** List records with optional where/order/limit */
export async function blinkDbList(table: string, opts?: {
  where?: Record<string, unknown>;
  orderBy?: Record<string, string>;
  limit?: number;
}) {
  let url = `${API_BASE}/${PROJECT_ID}/rest/v1/${table}?`;

  // Add PostgREST filters
  if (opts?.where) {
    for (const [key, value] of Object.entries(opts.where)) {
      const snakeKey = toSnakeCase(key);
      url += `${snakeKey}=eq.${encodeURIComponent(String(value))}&`;
    }
  }

  // Add ordering
  if (opts?.orderBy) {
    for (const [key, dir] of Object.entries(opts.orderBy)) {
      const snakeKey = toSnakeCase(key);
      url += `order=${snakeKey}.${dir}&`;
    }
  }

  // Add limit
  if (opts?.limit) {
    url += `limit=${opts.limit}&`;
  }

  console.log(`[blinkApi] GET ${url}`);

  const res = await fetch(url, {
    method: 'GET',
    headers: READ_HEADERS,
  });

  console.log(`[blinkApi] GET ${table} → ${res.status}`);

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[blinkApi] Error: ${errBody}`);
    throw new Error(`DB list failed (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  const rows = Array.isArray(json) ? json : [json];
  return rows.map(row => keysToCamelCase(row));
}

/** Get a single record by ID */
export async function blinkDbGet(table: string, id: string) {
  const url = `${API_BASE}/${PROJECT_ID}/rest/v1/${table}?id=eq.${id}&limit=1`;
  console.log(`[blinkApi] GET ${url}`);

  const res = await fetch(url, {
    method: 'GET',
    headers: READ_HEADERS,
  });

  console.log(`[blinkApi] GET ${table}/${id} → ${res.status}`);

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[blinkApi] Error: ${errBody}`);
    throw new Error(`DB get failed (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  const row = Array.isArray(json) ? json[0] : json;
  return row ? keysToCamelCase(row) : null;
}
