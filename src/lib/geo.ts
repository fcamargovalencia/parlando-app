// ── Geo helpers ──

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/** Computes total route distance in km by summing haversine between consecutive points. */
export function routeTotalKm(points: { latitude: number; longitude: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceKm(points[i - 1], points[i]);
  return total;
}

export function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(',')[0]
    .trim();
}

// ── Polyline simplification (Douglas-Peucker) ──

type Point = { latitude: number; longitude: number };

export function simplifyPolyline(points: Point[], tolerance = 0.0005): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPolyline(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPolyline(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Simplifies a polyline to fit within a max point count by
 * progressively increasing tolerance, then rounds coordinates
 * to reduce JSON payload size (~5 decimals ≈ 1.1m precision).
 */
export function compactPolyline(points: Point[], maxPoints = 300): Point[] {
  if (points.length <= 2) return points.map(roundPoint);

  let tolerance = 0.0003;
  let result = simplifyPolyline(points, tolerance);

  while (result.length > maxPoints && tolerance < 0.01) {
    tolerance *= 1.5;
    result = simplifyPolyline(points, tolerance);
  }

  return result.slice(0, maxPoints).map(roundPoint);
}

function roundPoint(p: Point): Point {
  return {
    latitude: Math.round(p.latitude * 1e5) / 1e5,
    longitude: Math.round(p.longitude * 1e5) / 1e5,
  };
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.longitude - a.longitude;
  const dy = b.latitude - a.latitude;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.sqrt(
      (p.longitude - a.longitude) ** 2 + (p.latitude - a.latitude) ** 2,
    );
  }
  return (
    Math.abs(
      dy * p.longitude -
      dx * p.latitude +
      b.longitude * a.latitude -
      b.latitude * a.longitude,
    ) / Math.sqrt(lenSq)
  );
}
