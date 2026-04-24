import { haversineMeters } from '@/lib/geo';

export function pointToSegmentDistanceMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const abLat = bLat - aLat;
  const abLng = bLng - aLng;
  const ab2 = abLat * abLat + abLng * abLng;
  if (ab2 === 0) return haversineMeters(pLat, pLng, aLat, aLng);
  const apLat = pLat - aLat;
  const apLng = pLng - aLng;
  const t = Math.max(0, Math.min(1, (apLat * abLat + apLng * abLng) / ab2));
  return haversineMeters(pLat, pLng, aLat + t * abLat, aLng + t * abLng);
}

// coords format: [lat, lng] — backend format (not GeoJSON)
export function minDistanceToPolyline(
  lat: number,
  lng: number,
  coords: [number, number][],
): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1)
    return haversineMeters(lat, lng, coords[0][1], coords[0][0]);
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const [aLat, aLng] = coords[i];
    const [bLat, bLng] = coords[i + 1];
    const d = pointToSegmentDistanceMeters(lat, lng, aLat, aLng, bLat, bLng);
    if (d < min) min = d;
  }
  return min;
}
