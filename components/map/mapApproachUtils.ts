export const ZOOM_STREET_LEVEL_DELTA = 0.025;

export function isStreetZoomLevel(latitudeDelta?: number | null): boolean {
  if (latitudeDelta == null || latitudeDelta <= 0) return false;
  return latitudeDelta <= ZOOM_STREET_LEVEL_DELTA;
}


export function getStreetOnly(address?: string): string {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (/^(suite|ste|apt|unit|bldg|building|#)\b/i.test(parts[0]) && parts.length > 1) {
    return `${parts[1]} (${parts[0]})`;
  }
  return parts[0];
}


export function getApproachArcCoordinates(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  numPoints: number = 8
): { latitude: number; longitude: number }[] {
  const dLat = end.latitude - start.latitude;
  const dLng = end.longitude - start.longitude;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  if (dist < 0.00003) {
    return [start, end];
  }

  const arcFactor = 0.25;
  const midLat = (start.latitude + end.latitude) / 2 - dLng * arcFactor;
  const midLng = (start.longitude + end.longitude) / 2 + dLat * arcFactor;

  const points: { latitude: number; longitude: number }[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * start.latitude + 2 * (1 - t) * t * midLat + t * t * end.latitude;
    const lng = (1 - t) * (1 - t) * start.longitude + 2 * (1 - t) * t * midLng + t * t * end.longitude;
    points.push({ latitude: lat, longitude: lng });
  }
  return points;
}
