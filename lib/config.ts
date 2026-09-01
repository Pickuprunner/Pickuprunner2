export const APP_CONFIG = {

  // ── Market / City ────────────────────────────────────────────
  /** Unique key for this market — NEVER change after launch */
  CITY_ID: 'sahuarita',

  /** Human-readable city name shown in the app */
  CITY_NAME: 'Sahuarita',

  // ── Store / Business ─────────────────────────────────────────
  // Leave STORE_ID empty for a general runner (any store, any pickup)
  STORE_ID: '',

  /** Business display name shown throughout the app */
  STORE_NAME: 'Pickup Runner',

  /** Short category/type shown under store name */
  STORE_TYPE: 'Local Pickup & Delivery',

  /** Physical address of the store (pre-filled as pickup address) */
  STORE_ADDRESS: "350 W Sahuarita Rd, Sahuarita, AZ 85629",

  /** Store phone number (shown to customers & drivers) */
  STORE_PHONE: '',

  /** Support email shown to customers */
  STORE_EMAIL: 'pickuprunner@gmail.com',

  /** Store hours shown on customer order screen */
  STORE_HOURS: 'Available Daily',

  /** Short tagline shown on welcome screen */
  STORE_TAGLINE: 'We pick up from any store and deliver to your door.',

  /**
   * Whether to pre-fill the pickup address on customer orders.
   * true  → customer can't change the pickup — it's always THIS store
   * false → customer enters their own pickup address (general runner)
   */
  LOCK_PICKUP_ADDRESS: false,

  // ── App Identity ─────────────────────────────────────────────
  /** Full app brand name (shown on role-select hero) */
  APP_NAME: 'Pickup Runner',

  /** Short tagline on hero screen */
  TAGLINE: 'Any store. Any item. Delivered fast.',

  // ── Branding Colors ─────────────────────────────────────────
  /** Primary accent — Electric Blue */
  PRIMARY_COLOR: '#0066FF',

  /** Secondary accent — Bright Yellow */
  SECONDARY_COLOR: '#F5C400',

  GRADIENT_START: '#000A1A',
  GRADIENT_MID: '#003380',
  GRADIENT_END: '#0066FF',

  // ── Business Rules ──────────────────────────────────────────
  /** Base delivery fee in cents */
  DELIVERY_FEE_CENTS: 1000,

  /** Miles included in base fee (0 = charge from mile 1) */
  FREE_MILES: 0,

  /** Extra charge per mile, in cents */
  MILEAGE_RATE_CENTS: 200,

} as const;

/**
 * Helper — true if this is a store-specific build
 */
export const IS_STORE_BUILD = APP_CONFIG.STORE_ID.length > 0;

/**
 * Calculate how much a driver earns for a delivery.
 * Mileage + tip only (base fee goes to the business, not the driver).
 */
export function calcDriverEarnings(distanceMiles: number, tipCents: number = 0): {
  baseCents: number;
  mileageCents: number;
  tipCents: number;
  totalCents: number;
  display: string;
  totalDisplay: string;
} {
  const billableMiles = Math.max(0, distanceMiles - APP_CONFIG.FREE_MILES);
  const mileageCents = Math.round(billableMiles * APP_CONFIG.MILEAGE_RATE_CENTS);
  const baseCents = 0; // base fee is not paid to the driver
  const totalCents = mileageCents + tipCents;

  const fmt = (c: number) => `${(c / 100).toFixed(2)}`;

  const parts: string[] = [];
  if (mileageCents > 0) parts.push(`${fmt(mileageCents)} mileage`);
  if (tipCents > 0) parts.push(`${fmt(tipCents)} tip`);
  const display = parts.join(' + ') || '$0.00';

  return { baseCents, mileageCents, tipCents, totalCents, display, totalDisplay: fmt(totalCents) };
}

/**
 * The compound scope key used to filter all DB queries.
 * City-wide build:   'sahuarita'
 * Store build:       'sahuarita::pickup-runner-sahuarita'
 */
export const ORDER_SCOPE =
  IS_STORE_BUILD
    ? `${APP_CONFIG.CITY_ID}::${APP_CONFIG.STORE_ID}`
    : APP_CONFIG.CITY_ID;

/**
 * ── EXAMPLE CONFIGS ────────────────────────────────────────────
 *
 * General Sahuarita runner (no specific store):
 *   CITY_ID: 'sahuarita', STORE_ID: '',
 *   APP_NAME: 'Pickup Runner Sahuarita', LOCK_PICKUP_ADDRESS: false
 *
 * Green Valley example:
 *   CITY_ID: 'green-valley', STORE_ID: 'green-valley',
 *   STORE_NAME: 'Pickup Runner', LOCK_PICKUP_ADDRESS: true
 *   STORE_ADDRESS: '101 S La Canada Dr, Green Valley, AZ 85614'
 *
 * Tucson (Ina Rd) example:
 *   CITY_ID: 'tucson', STORE_ID: 'tucson-ina',
 *   STORE_NAME: 'Pickup Runner', LOCK_PICKUP_ADDRESS: true
 *   STORE_ADDRESS: '4811 N Ina Rd, Tucson, AZ 85741'
 */
