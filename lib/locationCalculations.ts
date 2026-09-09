import { useLocationStore, AddressSuggestion, LocationCoords } from '@/store/useLocationStore';

export type { AddressSuggestion, LocationCoords };

export const PLUS_CODE_REGEX = /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}[,\s]*/gi;
export const UNNAMED_ROAD_REGEX = /^unnamed road,\s*/i;
export const UNIT_PREFIX_REGEX = /^((?:flat|apt|apartment|unit|suite|room|house|plot|block|bldg|building|#|no\.?)\s*[\w\d\-\/]+[\s,]+)/i;

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);

  for (let i = 0; i <= b.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}

export function normalizePhoneticToken(word: string): string {
  if (!word || word.length < 2) return word;
  return word
    .toLowerCase()
    .replace(/(.)\1+/g, '$1')
    .replace(/ph/g, 'f')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u');
}

export function generateQueryPermutations(query: string): string[] {
  const clean = (query || '').trim();
  const candidates = new Set<string>();

  if (clean) candidates.add(clean);

  const withoutHouseNo = clean.replace(/^\d+[-\w\/]*\s+/, '');
  if (withoutHouseNo !== clean && withoutHouseNo.length > 3) {
    candidates.add(withoutHouseNo);
  }

  const commaParts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  if (commaParts.length > 2) {
    candidates.add(commaParts.slice(1).join(', '));
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    for (let i = 0; i < words.length; i++) {
      const subset = words.filter((_, idx) => idx !== i).join(' ');
      if (subset.length >= 3) candidates.add(subset);
    }

    if (words.length >= 4) {
      candidates.add(`${words[0]} ${words[words.length - 1]}`);
      candidates.add(words.slice(-2).join(' '));
      candidates.add(words.slice(0, 2).join(' '));
    }
  }

  return Array.from(candidates).filter((c) => c.length >= 3);
}

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

export const US_STATE_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC', 'puerto rico': 'PR',
};

export function cleanFormattedAddress(addr: string): string {
  if (!addr) return '';
  let clean = addr.trim();

  if (/^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(clean)) return clean;

  clean = clean
    .replace(PLUS_CODE_REGEX, '')
    .replace(UNNAMED_ROAD_REGEX, '')
    .trim();

  const { prefix, baseAddress } = extractUnitOrFlatPrefix(clean);
  const target = prefix && baseAddress.length >= 3 ? baseAddress : clean;

  const rawParts = target.split(',').map((p) => p.trim()).filter(Boolean);
  if (rawParts.length === 0) return clean;

  while (
    rawParts.length > 1 &&
    /^(united states( of america)?|usa|us|india)$/i.test(rawParts[rawParts.length - 1])
  ) {
    rawParts.pop();
  }

  const mergedParts: string[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    const curr = rawParts[i];
    const next = rawParts[i + 1];

    const isHouseNum = /^\d+[\w\-\/]*$/.test(curr);

    if (isHouseNum && next) {
      const nextNorm = next.toLowerCase();
      const currNorm = curr.toLowerCase();

      if (nextNorm.startsWith(currNorm + ' ') || nextNorm === currNorm) {
        continue;
      }

      if (!/^\d/.test(next)) {
        mergedParts.push(`${curr} ${next}`);
        i++;
        continue;
      }
    }

    if (next && next.toLowerCase().startsWith(curr.toLowerCase() + ' ')) {
      continue;
    }

    mergedParts.push(curr);
  }

  const filtered: string[] = [];
  for (let i = 0; i < mergedParts.length; i++) {
    const part = mergedParts[i];

    if (/\b(county|parish)\b/i.test(part) && mergedParts.length > 2) {
      continue;
    }

    const partNorm = part.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!partNorm) continue;

    const alreadyExists = filtered.some((existing) => {
      const existNorm = existing.toLowerCase().replace(/[^a-z0-9]/g, '');
      return existNorm === partNorm;
    });

    if (!alreadyExists) {
      filtered.push(part);
    }
  }

  if (filtered.length >= 2) {
    const last = filtered[filtered.length - 1];
    const prev = filtered[filtered.length - 2];

    const isPostal =
      /^\d{5}(-\d{4})?$/.test(last) ||
      /^\d{6}$/.test(last) ||
      /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(last);

    const prevLower = prev.toLowerCase();
    const stateAbbr =
      US_STATE_ABBR[prevLower] ||
      (/^[a-z]{2}$/i.test(prev) && Object.values(US_STATE_ABBR).includes(prev.toUpperCase())
        ? prev.toUpperCase()
        : null);

    if (isPostal && stateAbbr) {
      filtered.splice(filtered.length - 2, 2, `${stateAbbr} ${last}`);
    } else if (stateAbbr) {
      filtered[filtered.length - 1] = stateAbbr;
    }
  } else if (filtered.length === 1 && US_STATE_ABBR[filtered[0].toLowerCase()]) {
    filtered[0] = US_STATE_ABBR[filtered[0].toLowerCase()];
  }

  if (filtered.length >= 1) {
    const lastIdx = filtered.length - 1;
    const lastPart = filtered[lastIdx];
    const stateZipMatch = lastPart.match(/^([a-zA-Z\s]+)\s+(\d{5}(?:-\d{4})?|\d{6})$/);
    if (stateZipMatch) {
      const st = stateZipMatch[1].trim().toLowerCase();
      const zip = stateZipMatch[2].trim();
      const abbr = US_STATE_ABBR[st];
      if (abbr) {
        filtered[lastIdx] = `${abbr} ${zip}`;
      }
    }
  }

  const result = filtered.join(', ');
  return prefix ? `${prefix}, ${result}` : result;
}

export function normalizeAddressKey(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getParts(name: string, start: number, end?: number): string {
  const arr = (name || '').split(', ');
  return end ? arr.slice(start, end).join(', ') : arr.slice(start).join(', ');
}

export function rankNominatimItem(item: any, query: string): number {
  const osmType = (item.osm_type || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  const cat = (item.category || item.class || '').toLowerCase();
  const name = (item.namedetails?.name || item.name || item.display_name || '').toLowerCase();
  const q = query.toLowerCase().trim();
  const qFirst = q.split(',')[0].trim();
  const placeRank = typeof item.place_rank === 'number' ? item.place_rank : 0;
  const importance = typeof item.importance === 'number' ? item.importance : 0;

  const isPostalCode = /^\d{5,6}$/.test(qFirst);
  const hasDoorstepNumber = /^\d+/.test(qFirst);
  const isCitySearch = !hasDoorstepNumber && !isPostalCode && q.split(',').length <= 2;

  if (isPostalCode) {
    if (type === 'postcode' || item.address?.postcode === qFirst) return 1 - importance;
    if (placeRank >= 17 && placeRank <= 25) return 2 - importance;
  }

  if (hasDoorstepNumber || cat === 'shop' || cat === 'amenity' || cat === 'building') {
    if (placeRank >= 28 || cat === 'amenity' || cat === 'shop' || cat === 'building' || item.address?.house_number) {
      return 1 - importance;
    }
    if (placeRank >= 26) return 2 - importance;
  }

  if (isCitySearch && (type === 'city' || type === 'town')) {
    if (osmType === 'node' && name.includes(qFirst)) return 1 - importance;
    if (placeRank >= 13 && placeRank <= 16 && osmType !== 'relation') return 2 - importance;
  }

  if (placeRank >= 17 && placeRank <= 25 && name.includes(qFirst)) {
    return 3 - importance;
  }

  if (placeRank >= 26 && placeRank <= 27) {
    return 4 - importance;
  }

  if (name.includes(qFirst)) {
    return 5 - importance;
  }

  if (osmType === 'relation' || cat === 'boundary' || type === 'administrative') {
    return 20 - importance;
  }

  return 10 - importance;
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
  return meters * 0.000621371;
}

export function formatMiles(miles: number | string | null | undefined): string {
  if (miles === null || miles === undefined || miles === '') return '0 mi';
  const num = typeof miles === 'string' ? parseFloat(miles) : miles;
  if (isNaN(num) || num <= 0) return '0 mi';
  if (num < 0.1) return '< 0.1 mi';
  if (num < 10) return `${(Math.round(num * 10) / 10).toFixed(1)} mi`;
  return `${Math.round(num)} mi`;
}

export function calcMileageCents(
  milesVal: number | string,
  freeMiles: number = 3,
  rateCentsPerMile: number = 150,
): number {
  const miles = typeof milesVal === 'string' ? parseFloat(milesVal) : milesVal;
  if (!isFinite(miles) || miles <= freeMiles) return 0;
  return Math.round((miles - freeMiles) * rateCentsPerMile);
}

export function getCachedCoords(address: string): LocationCoords | null {
  return useLocationStore.getState().getCachedCoords(address);
}

export function setCachedCoords(address: string, coords: LocationCoords): void {
  useLocationStore.getState().setCachedCoords(address, coords);
}

export function getCachedDistance(pickup: string, delivery: string): number | null {
  return useLocationStore.getState().getCachedDistance(pickup, delivery);
}

export function setCachedDistance(pickup: string, delivery: string, miles: number): void {
  useLocationStore.getState().setCachedDistance(pickup, delivery, miles);
}

export function getCachedReverseGeocode(lat: number, lon: number): string | null {
  return useLocationStore.getState().getCachedReverseGeocode(lat, lon);
}

export function setCachedReverseGeocode(lat: number, lon: number, address: string): void {
  useLocationStore.getState().setCachedReverseGeocode(lat, lon, address);
}

export function getCachedSearch(key: string): AddressSuggestion[] | null {
  return useLocationStore.getState().getCachedSearch(key);
}

export function setCachedSearch(key: string, results: AddressSuggestion[]): void {
  useLocationStore.getState().setCachedSearch(key, results);
}

export function getRegionFromBbox(
  bbox?: [number, number, number, number] | null,
  fallbackCoords?: { lat: number; lon: number } | null,
) {
  if (bbox && bbox.length === 4) {
    const [minLat, maxLat, minLon, maxLon] = bbox;
    const dLat = Math.abs(maxLat - minLat);
    const dLon = Math.abs(maxLon - minLon);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.004, dLat * 1.05),
      longitudeDelta: Math.max(0.004, dLon * 1.05),
    };
  }

  const lat = fallbackCoords?.lat || 0;
  const lon = fallbackCoords?.lon || 0;
  return {
    latitude: lat,
    longitude: lon,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };
}
