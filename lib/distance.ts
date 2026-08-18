/**
 * Distance calculation between two addresses.
 * Uses free Nominatim (OpenStreetMap) geocoding + Haversine formula.
 * No API key required.  Returns driving-estimate miles (Haversine × 1.3 road factor).
 */

const CACHE = new Map<string, { lat: number; lon: number }>();
const GEOCODE_QUEUE: string[] = [];
let processing = false;

/** Geocode an address string → { lat, lon } via Nominatim. Cached. */
export async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = address.trim().toLowerCase();
  if (CACHE.has(key)) return CACHE.get(key)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PickupRunner/1.0 (contact@pickurunner.app)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;

    const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    CACHE.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}

/** Haversine distance in miles between two lat/lon points. */
export function haversineMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate driving-estimate miles between two addresses.
 * Uses Haversine × 1.3 as a reasonable road-distance multiplier.
 * Returns null if either address can't be geocoded.
 */
export async function calcDistanceMiles(
  pickupAddress: string,
  deliveryAddress: string,
): Promise<number | null> {
  if (!pickupAddress?.trim() || !deliveryAddress?.trim()) return null;

  const [pickup, delivery] = await Promise.all([
    geocode(pickupAddress),
    geocode(deliveryAddress),
  ]);

  if (!pickup || !delivery) return null;

  const straightLine = haversineMiles(pickup.lat, pickup.lon, delivery.lat, delivery.lon);
  // Apply road-factor multiplier (roads are ~1.3x longer than straight line)
  const roadMiles = straightLine * 1.3;
  // Round to 1 decimal
  return Math.round(roadMiles * 10) / 10;
}
