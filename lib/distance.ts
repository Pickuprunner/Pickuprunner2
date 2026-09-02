import * as Location from 'expo-location';
import { useLocationStore, AddressSuggestion, LocationCoords } from '@/store/useLocationStore';

export type { AddressSuggestion, LocationCoords };

export const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCGboNsbOQDX-ocETLgbZ6impbXaSSkVvY';

export function setCachedCoords(address: string, coords: LocationCoords) {
  useLocationStore.getState().setCachedCoords(address, coords);
}

const PLUS_CODE_REGEX = /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}[,\s]*/gi;
const UNNAMED_ROAD_REGEX = /^unnamed road,\s*/i;
const UNIT_PREFIX_REGEX = /^((?:flat|apt|apartment|unit|suite|room|house|plot|block|bldg|building|#|no\.?)\s*[\w\d\-\/]+[\s,]+)/i;

export function extractUnitOrFlatPrefix(addr: string): { prefix: string; baseAddress: string } {
  const match = addr.match(UNIT_PREFIX_REGEX);
  if (match && match[1]) {
    const prefix = match[1].trim();
    const baseAddress = addr.slice(match[0].length).trim();
    if (baseAddress.length >= 3) {
      return { prefix, baseAddress };
    }
  }
  return { prefix: '', baseAddress: addr };
}

export function cleanFormattedAddress(addr: string): string {
  if (!addr) return '';
  return addr
    .replace(PLUS_CODE_REGEX, '')
    .replace(UNNAMED_ROAD_REGEX, '')
    .trim() || addr;
}

export async function geocode(address: string): Promise<LocationCoords | null> {
  const cleanAddr = address.trim();
  if (!cleanAddr) return null;

  const cached = useLocationStore.getState().getCachedCoords(cleanAddr);
  if (cached) return cached;

  const userLoc = useLocationStore.getState().currentLocation;
  const biasParam = userLoc && typeof userLoc.lat === 'number' && typeof userLoc.lon === 'number'
    ? `&locationbias=circle:50000@${userLoc.lat},${userLoc.lon}`
    : '';

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddr)}${biasParam}&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        const coords: LocationCoords = { lat: loc.lat, lon: loc.lng };
        useLocationStore.getState().setCachedCoords(cleanAddr, coords);
        return coords;
      }
    }
  } catch { }

  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(cleanAddr)}&inputtype=textquery&fields=geometry,formatted_address${biasParam}&key=${GOOGLE_MAPS_KEY}`;
    const fRes = await fetch(findUrl);
    if (fRes.ok) {
      const fData = await fRes.json();
      if (fData.candidates && fData.candidates.length > 0) {
        const loc = fData.candidates[0].geometry?.location;
        if (loc) {
          const coords: LocationCoords = { lat: loc.lat, lon: loc.lng };
          useLocationStore.getState().setCachedCoords(cleanAddr, coords);
          return coords;
        }
      }
    }
  } catch { }

  const { prefix, baseAddress } = extractUnitOrFlatPrefix(cleanAddr);
  if (prefix && baseAddress && baseAddress !== cleanAddr) {
    try {
      const baseCoords = await geocode(baseAddress);
      if (baseCoords) {
        useLocationStore.getState().setCachedCoords(cleanAddr, baseCoords);
        return baseCoords;
      }
    } catch { }
  }

  try {
    const autoUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(cleanAddr)}${userLoc ? `&location=${userLoc.lat},${userLoc.lon}&radius=50000` : ''}&key=${GOOGLE_MAPS_KEY}`;
    const aRes = await fetch(autoUrl);
    if (aRes.ok) {
      const aData = await aRes.json();
      if (aData.predictions && aData.predictions.length > 0) {
        const firstPred = aData.predictions[0];
        if (firstPred.place_id) {
          const pCoords = await getPlaceCoordinates(firstPred.place_id, cleanAddr);
          if (pCoords) return pCoords;
        }
      }
    }
  } catch { }

  try {
    const results = await Location.geocodeAsync(cleanAddr);
    if (results && results.length > 0) {
      const coords: LocationCoords = { lat: results[0].latitude, lon: results[0].longitude };
      useLocationStore.getState().setCachedCoords(cleanAddr, coords);
      return coords;
    }
  } catch { }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cleanAddr)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PickupRunner/1.0 (contact@pickuprunner.app)' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]) {
        const coords: LocationCoords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        useLocationStore.getState().setCachedCoords(cleanAddr, coords);
        return coords;
      }
    }
  } catch { }

  return null;
}

export function haversineMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kmToMiles(km: number): number {
  if (isNaN(km) || km <= 0) return 0;
  return km * 0.621371;
}

export function metersToMiles(meters: number): number {
  if (isNaN(meters) || meters <= 0) return 0;
  return (meters / 1000) * 0.621371;
}

export function formatMiles(miles: number | string | null | undefined): string {
  if (miles === null || miles === undefined || miles === '') return '0 mi';
  const num = typeof miles === 'string' ? parseFloat(miles) : miles;
  if (isNaN(num) || num <= 0) return '0 mi';
  if (num < 0.1) return '< 0.1 mi';
  if (num < 10) return `${(Math.round(num * 10) / 10).toFixed(1)} mi`;
  return `${Math.round(num)} mi`;
}

export async function calcDistanceMiles(
  pickupAddress: string,
  deliveryAddress: string,
  pickupCoords?: LocationCoords | null,
  deliveryCoords?: LocationCoords | null,
): Promise<number | null> {
  const p = pickupAddress?.trim();
  const d = deliveryAddress?.trim();
  if (!p || !d) return null;

  const cachedDist = useLocationStore.getState().getCachedDistance(p, d);
  if (typeof cachedDist === 'number') return cachedDist;

  const pickup = pickupCoords || (await geocode(p));
  const delivery = deliveryCoords || (await geocode(d));

  if (!pickup || !delivery) return null;

  let calculatedMiles: number | null = null;

  try {
    const gUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickup.lat},${pickup.lon}&destinations=${delivery.lat},${delivery.lon}&mode=driving&key=${GOOGLE_MAPS_KEY}`;
    const gRes = await fetch(gUrl);
    if (gRes.ok) {
      const gData = await gRes.json();
      const element = gData?.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK' && typeof element.distance?.value === 'number') {
        const meters = element.distance.value;
        const miles = metersToMiles(meters);
        calculatedMiles = Math.max(0.1, Math.round(miles * 10) / 10);
      }
    }
  } catch { }

  if (calculatedMiles === null) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lon},${pickup.lat};${delivery.lon},${delivery.lat}?overview=false`;
      const oRes = await fetch(osrmUrl);
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.routes?.[0]?.distance) {
          const meters = oData.routes[0].distance;
          const miles = metersToMiles(meters);
          calculatedMiles = Math.max(0.1, Math.round(miles * 10) / 10);
        }
      }
    } catch { }
  }

  if (calculatedMiles === null) {
    const straightLine = haversineMiles(pickup.lat, pickup.lon, delivery.lat, delivery.lon);
    calculatedMiles = Math.max(0.1, Math.round(straightLine * 1.35 * 10) / 10);
  }

  useLocationStore.getState().setCachedDistance(p, d, calculatedMiles);
  return calculatedMiles;
}

export async function getPlaceCoordinates(placeId: string, addressName?: string): Promise<LocationCoords | null> {
  if (addressName) {
    const cached = useLocationStore.getState().getCachedCoords(addressName);
    if (cached) return cached;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,name,address_components&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      if (loc) {
        const coords: LocationCoords = { lat: loc.lat, lon: loc.lng };
        if (addressName) useLocationStore.getState().setCachedCoords(addressName, coords);
        if (data.result?.formatted_address) useLocationStore.getState().setCachedCoords(data.result.formatted_address, coords);
        if (data.result?.name) useLocationStore.getState().setCachedCoords(data.result.name, coords);
        return coords;
      }
    }
  } catch { }
  return null;
}

function getParts(name: string, start: number, end?: number): string {
  const arr = (name || '').split(', ');
  return end ? arr.slice(start, end).join(', ') : arr.slice(start).join(', ');
}

export async function searchAddressSuggestions(
  query: string,
  limit = 4,
  nearbyCoords?: LocationCoords | null,
): Promise<AddressSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const biasCoords = nearbyCoords || useLocationStore.getState().currentLocation;
  const cacheKey = `${q}_${biasCoords ? `${biasCoords.lat.toFixed(2)},${biasCoords.lon.toFixed(2)}` : 'global'}`;
  const cached = useLocationStore.getState().getCachedSearch(cacheKey);
  if (cached) return cached;

  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query.trim())}&key=${GOOGLE_MAPS_KEY}`;
    if (biasCoords && typeof biasCoords.lat === 'number' && typeof biasCoords.lon === 'number') {
      url += `&location=${biasCoords.lat},${biasCoords.lon}&radius=50000`;
    }

    let res = await fetch(url);
    let data = res.ok ? await res.json() : null;

    if (!data?.predictions || data.predictions.length === 0) {
      const globalUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query.trim())}&key=${GOOGLE_MAPS_KEY}`;
      res = await fetch(globalUrl);
      data = res.ok ? await res.json() : null;
    }

    if (data?.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
      const results: AddressSuggestion[] = data.predictions.slice(0, limit).map((item: any) => {
        const main = item.structured_formatting?.main_text || item.description || '';
        const secondary = item.structured_formatting?.secondary_text || '';
        return {
          displayName: item.description || main,
          lat: 0,
          lon: 0,
          primaryText: main,
          secondaryText: secondary,
          placeId: item.place_id,
        };
      });
      useLocationStore.getState().setCachedSearch(cacheKey, results);
      return results;
    }
  } catch { }

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&addressdetails=1&q=${encodeURIComponent(query.trim())}`;
    if (biasCoords && typeof biasCoords.lat === 'number' && typeof biasCoords.lon === 'number') {
      const delta = 1.4;
      url += `&viewbox=${biasCoords.lon - delta},${biasCoords.lat + delta},${biasCoords.lon + delta},${biasCoords.lat - delta}`;
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'PickupRunner/1.0 (contact@pickuprunner.app)' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const results: AddressSuggestion[] = data.slice(0, limit).map((item: any) => {
          const addr = item.address || {};
          const houseNumber = addr.house_number || '';
          const road = addr.road || addr.pedestrian || addr.street || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.sublocality || '';
          const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
          const state = addr.state || '';
          const postcode = addr.postcode || '';

          const primary = houseNumber && road ? `${houseNumber} ${road}` : (road || suburb || getParts(item.display_name, 0, 2));
          const secondary = [suburb !== primary ? suburb : '', city, state, postcode].filter(Boolean).join(', ') || getParts(item.display_name, 2);
          const coords: LocationCoords = { lat: parseFloat(item.lat) || 0, lon: parseFloat(item.lon) || 0 };

          if (item.display_name) {
            useLocationStore.getState().setCachedCoords(item.display_name, coords);
          }

          return {
            displayName: item.display_name || '',
            lat: coords.lat,
            lon: coords.lon,
            primaryText: primary || item.display_name || '',
            secondaryText: secondary,
          };
        });
        useLocationStore.getState().setCachedSearch(cacheKey, results);
        return results;
      }
    }
  } catch { }

  return [];
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const cached = useLocationStore.getState().getCachedReverseGeocode(lat, lon);
  if (cached) return cached;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&result_type=street_address|subpremise|premise|point_of_interest|establishment|route&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const best =
          data.results.find((r: any) =>
            r.types?.some((t: string) => ['street_address', 'subpremise', 'premise', 'point_of_interest', 'establishment'].includes(t))
          ) || data.results[0];

        const rawAddr = best?.formatted_address || data.results[0]?.formatted_address;
        const addr = cleanFormattedAddress(rawAddr);
        if (addr) {
          useLocationStore.getState().setCachedReverseGeocode(lat, lon, addr);
          useLocationStore.getState().setCachedCoords(addr, { lat, lon });
          return addr;
        }
      }
    }
  } catch { }

  try {
    const fallbackUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const best =
          data.results.find((r: any) => !r.types?.includes('plus_code')) || data.results[0];
        const rawAddr = best?.formatted_address;
        const addr = cleanFormattedAddress(rawAddr);
        if (addr) {
          useLocationStore.getState().setCachedReverseGeocode(lat, lon, addr);
          useLocationStore.getState().setCachedCoords(addr, { lat, lon });
          return addr;
        }
      }
    }
  } catch { }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (results && results.length > 0) {
      const r = results[0];
      const parts = [
        r.name !== r.street ? r.name : '',
        r.streetNumber && r.street ? `${r.streetNumber} ${r.street}` : r.street,
        r.district || r.subregion,
        r.city,
        r.region,
        r.postalCode,
        r.country,
      ].filter(Boolean);

      const addr = parts.join(', ');
      if (addr.length > 3) {
        useLocationStore.getState().setCachedReverseGeocode(lat, lon, addr);
        useLocationStore.getState().setCachedCoords(addr, { lat, lon });
        return addr;
      }
    }
  } catch { }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PickupRunner/1.0 (contact@pickuprunner.app)' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        useLocationStore.getState().setCachedReverseGeocode(lat, lon, data.display_name);
        useLocationStore.getState().setCachedCoords(data.display_name, { lat, lon });
        return data.display_name;
      }
    }
  } catch { }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
