import * as Location from 'expo-location';
import { useLocationStore } from '@/store/useLocationStore';
import {
  AddressSuggestion,
  LocationCoords,
  rankNominatimItem,
  extractUnitOrFlatPrefix,
  normalizeAddressKey,
  getParts,
  haversineMiles,
  metersToMiles,
  getCachedCoords,
  setCachedCoords,
  getCachedDistance,
  setCachedDistance,
  getCachedReverseGeocode,
  setCachedReverseGeocode,
  getCachedSearch,
  setCachedSearch,
  generateQueryPermutations,
} from './locationCalculations';

export * from './locationCalculations';

export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function fetchOsmAutocomplete(
  query: string,
  nearbyCoords?: LocationCoords | null,
  limit: number = 4,
): Promise<AddressSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const biasCoords = nearbyCoords || useLocationStore.getState().currentLocation;
  const cacheKey = `v3_${q}_${biasCoords ? `${biasCoords.lat},${biasCoords.lon}` : 'global'}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) return cached;

  const { prefix, baseAddress } = extractUnitOrFlatPrefix(query.trim());
  const searchQuery = (prefix && baseAddress.length >= 3 ? baseAddress : query).trim();

  try {
    const attempts = generateQueryPermutations(searchQuery);

    for (const attempt of attempts) {
      let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&namedetails=1&extratags=1&dedupe=1&accept-language=en-US,en&q=${encodeURIComponent(attempt)}`;
      if (biasCoords && typeof biasCoords.lat === 'number' && typeof biasCoords.lon === 'number') {
        const delta = 0.35;
        url += `&viewbox=${biasCoords.lon - delta},${biasCoords.lat + delta},${biasCoords.lon + delta},${biasCoords.lat - delta}`;
      }

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PickupRunner/1.0 (contact@pickuprunner.app)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a, b) => rankNominatimItem(a, attempt) - rankNominatimItem(b, attempt));
          const results: AddressSuggestion[] = sorted.slice(0, limit).map((item: any) => {
            const addr = item.address || {};
            const houseNumber = addr.house_number || '';
            const road = addr.road || addr.pedestrian || addr.street || '';
            const suburb = addr.suburb || addr.neighbourhood || addr.sublocality || '';
            const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
            const state = addr.state || '';
            const postcode = addr.postcode || '';

            const primary = houseNumber && road ? `${houseNumber} ${road}` : (item.namedetails?.name || item.name || road || suburb || city || getParts(item.display_name, 0, 2));
            const secondaryParts = [suburb !== primary ? suburb : '', city !== primary ? city : '', state, postcode].filter(Boolean);
            const secondary = Array.from(new Set(secondaryParts)).join(', ') || getParts(item.display_name, 2);
            const bbox: [number, number, number, number] | undefined =
              Array.isArray(item.boundingbox) && item.boundingbox.length >= 4
                ? [
                    parseFloat(item.boundingbox[0]),
                    parseFloat(item.boundingbox[1]),
                    parseFloat(item.boundingbox[2]),
                    parseFloat(item.boundingbox[3]),
                  ]
                : undefined;

            const coords: LocationCoords = { lat: parseFloat(item.lat) || 0, lon: parseFloat(item.lon) || 0, bbox };

            if (item.display_name) {
              setCachedCoords(item.display_name, coords);
              if (prefix) {
                setCachedCoords(`${prefix} ${item.display_name}`, coords);
              }
            }

            return {
              displayName: prefix ? `${prefix} ${item.display_name || ''}` : (item.display_name || ''),
              lat: coords.lat,
              lon: coords.lon,
              primaryText: prefix ? `${prefix} ${primary || ''}` : (primary || item.display_name || ''),
              secondaryText: secondary,
              bbox,
            };
          });
          setCachedSearch(cacheKey, results);
          return results;
        }
      }
    }

    try {
      let pUrl = `https://photon.komoot.io/api/?limit=${limit}&lang=en&osm_tag=!boundary:administrative&layer=house,street,poi,city&q=${encodeURIComponent(searchQuery)}`;
      if (biasCoords && typeof biasCoords.lat === 'number' && typeof biasCoords.lon === 'number') {
        pUrl += `&lat=${biasCoords.lat}&lon=${biasCoords.lon}&location_bias_scale=0.6`;
      }
      const pRes = await fetch(pUrl);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData.features) && pData.features.length > 0) {
          const results: AddressSuggestion[] = pData.features.slice(0, limit).map((f: any) => {
            const p = f.properties || {};
            const coordsGeo = f.geometry?.coordinates || [0, 0];
            const lon = coordsGeo[0] || 0;
            const lat = coordsGeo[1] || 0;
            const name = p.name || p.street || '';
            const secParts = [p.district, p.city, p.state, p.postcode, p.country].filter(Boolean);
            const secondary = Array.from(new Set(secParts)).join(', ');
            const displayName = [name, secondary].filter(Boolean).join(', ');
            const extent = p.extent;
            const bbox: [number, number, number, number] | undefined =
              Array.isArray(extent) && extent.length === 4
                ? [extent[3], extent[1], extent[0], extent[2]]
                : undefined;
            const coords: LocationCoords = { lat, lon, bbox };
            if (displayName) setCachedCoords(displayName, coords);
            return {
              displayName: prefix ? `${prefix} ${displayName}` : displayName,
              lat,
              lon,
              primaryText: prefix ? `${prefix} ${name}` : name,
              secondaryText: secondary,
              bbox,
            };
          });
          setCachedSearch(cacheKey, results);
          return results;
        }
      }
    } catch { }
  } catch { }

  return [];
}

export async function nativeOrOsmGeocode(address: string): Promise<LocationCoords | null> {
  const cleanAddr = address.trim();
  if (!cleanAddr) return null;

  const cached = getCachedCoords(cleanAddr);
  if (cached) return cached;

  try {
    const results = await Location.geocodeAsync(cleanAddr);
    if (results && results.length > 0) {
      const coords: LocationCoords = { lat: results[0].latitude, lon: results[0].longitude };
      setCachedCoords(cleanAddr, coords);
      return coords;
    }
  } catch { }

  const { prefix, baseAddress } = extractUnitOrFlatPrefix(cleanAddr);
  if (prefix && baseAddress && baseAddress !== cleanAddr) {
    try {
      const baseCoords = await nativeOrOsmGeocode(baseAddress);
      if (baseCoords) {
        setCachedCoords(cleanAddr, baseCoords);
        return baseCoords;
      }
    } catch { }
  }

  try {
    const attempts = generateQueryPermutations(cleanAddr);

    for (const attempt of attempts) {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&namedetails=1&extratags=1&dedupe=1&accept-language=en-US,en&q=${encodeURIComponent(attempt)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PickupRunner/1.0 (contact@pickuprunner.app)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a, b) => rankNominatimItem(a, attempt) - rankNominatimItem(b, attempt));
          const best = sorted[0];
          const bbox: [number, number, number, number] | undefined =
            Array.isArray(best.boundingbox) && best.boundingbox.length >= 4
              ? [
                  parseFloat(best.boundingbox[0]),
                  parseFloat(best.boundingbox[1]),
                  parseFloat(best.boundingbox[2]),
                  parseFloat(best.boundingbox[3]),
                ]
              : undefined;
          const coords: LocationCoords = { lat: parseFloat(best.lat), lon: parseFloat(best.lon), bbox };
          setCachedCoords(cleanAddr, coords);
          return coords;
        }
      }
    }

    try {
      const pUrl = `https://photon.komoot.io/api/?limit=1&lang=en&osm_tag=!boundary:administrative&layer=house,street,poi,city&q=${encodeURIComponent(cleanAddr)}`;
      const pRes = await fetch(pUrl);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData.features) && pData.features.length > 0) {
          const f = pData.features[0];
          const coordsGeo = f.geometry?.coordinates || [0, 0];
          const lon = coordsGeo[0] || 0;
          const lat = coordsGeo[1] || 0;
          const extent = f.properties?.extent;
          const bbox: [number, number, number, number] | undefined =
            Array.isArray(extent) && extent.length === 4
              ? [extent[3], extent[1], extent[0], extent[2]]
              : undefined;
          const coords: LocationCoords = { lat, lon, bbox };
          setCachedCoords(cleanAddr, coords);
          return coords;
        }
      }
    } catch { }
  } catch { }

  return null;
}

export async function nativeOrOsmReverseGeocode(lat: number, lon: number): Promise<string | null> {
  const cached = getCachedReverseGeocode(lat, lon);
  if (cached) return cached;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (results && results.length > 0) {
      const r = results[0];
      const street = r.streetNumber && r.street ? `${r.streetNumber} ${r.street}` : (r.street || '');
      const rawName = (r.name || '').trim();
      const norm = (s: string) => normalizeAddressKey(s);
      const name = rawName && norm(rawName) !== norm(street) && norm(rawName) !== norm(r.street || '') ? rawName : '';

      const rawParts = [
        name || street,
        name && street && norm(name) !== norm(street) ? street : '',
        r.district || r.subregion,
        r.city,
        r.region,
        r.postalCode,
        r.country,
      ].filter(Boolean) as string[];

      const deduplicated: string[] = [];
      for (const p of rawParts) {
        const pNorm = norm(p);
        if (!pNorm) continue;
        if (!deduplicated.some((existing) => norm(existing) === pNorm || (pNorm.length > 4 && norm(existing).includes(pNorm)))) {
          deduplicated.push(p.trim());
        }
      }

      const addr = deduplicated.join(', ');
      if (addr.length > 3) {
        setCachedReverseGeocode(lat, lon, addr);
        setCachedCoords(addr, { lat, lon });
        return addr;
      }
    }
  } catch { }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en-US,en`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PickupRunner/1.0 (contact@pickuprunner.app)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const name = a.amenity || a.shop || a.building || a.office || a.leisure || '';
        const street = a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road || '';
        const neighborhood = a.neighbourhood || a.suburb || a.subdivision || '';
        const city = a.city || a.town || a.village || a.county || '';
        const state = a.state || '';
        const postcode = a.postcode || '';

        const parts = Array.from(new Set([name, street, neighborhood, city, state, postcode].filter(Boolean)));
        const resolved = parts.length >= 2 ? parts.join(', ') : (data.display_name || '');
        if (resolved) {
          setCachedReverseGeocode(lat, lon, resolved);
          setCachedCoords(resolved, { lat, lon });
          return resolved;
        }
      } else if (data?.display_name) {
        setCachedReverseGeocode(lat, lon, data.display_name);
        setCachedCoords(data.display_name, { lat, lon });
        return data.display_name;
      }
    }
  } catch { }

  const fallback = `${lat}, ${lon}`;
  return fallback;
}

export async function calcRouteMiles(
  pickupCoords: LocationCoords,
  deliveryCoords: LocationCoords,
): Promise<number> {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lon},${pickupCoords.lat};${deliveryCoords.lon},${deliveryCoords.lat}?overview=false`;
    const oRes = await fetch(osrmUrl);
    if (oRes.ok) {
      const oData = await oRes.json();
      if (oData.routes?.[0]?.distance) {
        const meters = oData.routes[0].distance;
        const miles = metersToMiles(meters);
        return Math.max(0.1, Math.round(miles * 10) / 10);
      }
    }
  } catch { }

  const straightLine = haversineMiles(pickupCoords.lat, pickupCoords.lon, deliveryCoords.lat, deliveryCoords.lon);
  return Math.max(0.1, Math.round(straightLine * 1.25 * 10) / 10);
}

export const searchAddressSuggestions = (
  query: string,
  limit: number = 4,
  nearbyCoords?: LocationCoords | null,
) => fetchOsmAutocomplete(query, nearbyCoords, limit);

export const geocode = (address: string) => nativeOrOsmGeocode(address);

export const reverseGeocode = (lat: number, lon: number) => nativeOrOsmReverseGeocode(lat, lon);

export async function calcDistanceMiles(
  pickupAddress: string,
  deliveryAddress: string,
  pickupCoords?: LocationCoords | null,
  deliveryCoords?: LocationCoords | null,
): Promise<number | null> {
  const p = pickupAddress?.trim();
  const d = deliveryAddress?.trim();
  if (!p || !d) return null;

  const cachedDist = getCachedDistance(p, d);
  if (typeof cachedDist === 'number') return cachedDist;

  const pickup = pickupCoords || (await geocode(p));
  const delivery = deliveryCoords || (await geocode(d));

  if (!pickup || !delivery) return null;

  const miles = await calcRouteMiles(pickup, delivery);
  setCachedDistance(p, d, miles);
  return miles;
}

export async function getPlaceCoordinates(placeId: string, addressName?: string): Promise<LocationCoords | null> {
  if (addressName) {
    const cached = getCachedCoords(addressName);
    if (cached) return cached;
    return geocode(addressName);
  }
  return null;
}
