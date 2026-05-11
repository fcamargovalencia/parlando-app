import { Config } from '@/constants/config';
import type { RoutePoint, RouteResult, RouteAlternative } from './maps-types';

const DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';

const ROUTE_ALT_TITLES = ['Ruta recomendada', 'Alternativa A', 'Alternativa B'];
const ROUTE_ALT_IDS = ['DIRECT', 'ALT_A', 'ALT_B'];

type Stop = { latitude: number; longitude: number; };

// ── Google encoded polyline decoder ──

function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

// ── Internal response types ──

interface GoogleDirectionsRoute {
  overview_polyline: { points: string; };
  warnings: string[];
  legs: Array<{
    duration: { value: number; };
    distance: { value: number; };
    steps: Array<{ html_instructions: string; }>;
  }>;
}

interface GoogleDirectionsResponse {
  routes: GoogleDirectionsRoute[];
}

// ── Helpers ──

function buildParams(origin: Stop, destination: Stop, waypoints: Stop[]): URLSearchParams {
  const params = new URLSearchParams({
    key: Config.GOOGLE_MAPS_API_KEY,
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    language: 'es',
    region: 'co',
  });
  if (waypoints.length) {
    params.append('waypoints', waypoints.map((p) => `${p.latitude},${p.longitude}`).join('|'));
  }
  return params;
}

// ── Public functions ──

export async function googleCalculateRoute(stops: Stop[]): Promise<RouteResult> {
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const params = buildParams(origin, destination, stops.slice(1, -1));

  const response = await fetch(`${DIRECTIONS_BASE}?${params}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Directions API error: ${response.status} — ${body}`);
  }

  const data: GoogleDirectionsResponse = await response.json();
  if (!data.routes?.length) return { points: [], travelTimeInSeconds: 0, distanceKm: 0, hasTolls: false };

  const route = data.routes[0];
  const points = decodePolyline(route.overview_polyline.points);
  const travelTimeInSeconds = route.legs.reduce((acc, leg) => acc + leg.duration.value, 0);
  const distanceKm = route.legs.reduce((acc, leg) => acc + leg.distance.value, 0) / 1000;

  return { points, travelTimeInSeconds, distanceKm, hasTolls: detectTolls(route) };
}

async function fetchDirectionsRoutes(
  origin: Stop,
  destination: Stop,
  waypoints: Stop[],
  extraParams?: Record<string, string>,
): Promise<GoogleDirectionsRoute[]> {
  const params = buildParams(origin, destination, waypoints);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) params.append(k, v);
  }
  const response = await fetch(`${DIRECTIONS_BASE}?${params}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Directions API error: ${response.status} — ${body}`);
  }
  const data: GoogleDirectionsResponse = await response.json();
  return data.routes ?? [];
}

function routeDistanceM(route: GoogleDirectionsRoute): number {
  return route.legs.reduce((acc, leg) => acc + leg.distance.value, 0);
}

function detectTolls(route: GoogleDirectionsRoute): boolean {
  // Google sometimes surfaces toll warnings in the route-level warnings array
  const warningMatch = route.warnings?.some((w) => /toll/i.test(w));
  if (warningMatch) return true;
  // Fallback: scan step instructions for toll plaza mentions
  return route.legs.some((leg) =>
    leg.steps?.some((step) => /peaje|toll/i.test(step.html_instructions)),
  );
}

function isDuplicateRoute(candidate: GoogleDirectionsRoute, existing: GoogleDirectionsRoute[]): boolean {
  const candidateDist = routeDistanceM(candidate);
  return existing.some((r) => {
    const d = routeDistanceM(r);
    return Math.abs(d - candidateDist) / Math.max(d, candidateDist) < 0.05;
  });
}

export async function googleCalculateRouteAlternatives(
  stops: Stop[],
  maxAlternatives: number,
): Promise<RouteAlternative[]> {
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);

  // Primary call: ask Google for alternatives in a single request
  const primaryRoutes = await fetchDirectionsRoutes(origin, destination, waypoints, {
    alternatives: 'true',
  });

  if (!primaryRoutes.length) return [];

  const collected: GoogleDirectionsRoute[] = primaryRoutes.slice(0, maxAlternatives + 1);

  // Fallback: if Google returned only one route and there are no intermediate waypoints,
  // request an extra route avoiding tolls to offer a meaningful second option.
  let avoidTollsIndexStart = collected.length; // tracks which indices came from the avoid=tolls call
  if (collected.length < 2 && waypoints.length === 0) {
    try {
      const avoidTollsRoutes = await fetchDirectionsRoutes(origin, destination, [], {
        avoid: 'tolls',
      });
      for (const r of avoidTollsRoutes) {
        if (collected.length >= maxAlternatives + 1) break;
        if (!isDuplicateRoute(r, collected)) collected.push(r);
      }
    } catch {
      // Keep whatever we already have
    }
  }

  return collected.map((route, idx) => {
    const travelTimeInSeconds = route.legs.reduce((acc, leg) => acc + leg.duration.value, 0);
    const distanceKm = route.legs.reduce((acc, leg) => acc + leg.distance.value, 0) / 1000;
    // Routes fetched with avoid=tolls are guaranteed toll-free;
    // for others, detect tolls from the warnings array or step instructions.
    const hasTolls =
      idx < avoidTollsIndexStart
        ? detectTolls(route)
        : false;
    return {
      id: ROUTE_ALT_IDS[idx] ?? `ALT_${idx}`,
      title: ROUTE_ALT_TITLES[idx] ?? `Alternativa ${idx}`,
      points: decodePolyline(route.overview_polyline.points),
      travelTimeInSeconds,
      distanceKm,
      durationMin: Math.round(travelTimeInSeconds / 60),
      hasTolls,
    };
  });
}
