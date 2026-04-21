import { Config } from '@/constants/config';
import type { TomTomRoutePoint, TomTomRouteResult, TomTomRouteAlternative } from './tomtom-types';

const TOMTOM_ROUTING_BASE = 'https://api.tomtom.com/routing/1';

const ROUTE_ALT_TITLES = ['Ruta recomendada', 'Alternativa A', 'Alternativa B'];
const ROUTE_ALT_IDS = ['DIRECT', 'ALT_A', 'ALT_B'];

type Stop = { latitude: number; longitude: number; };

function buildRouteParams(extra: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({
    key: Config.TOMTOM_API_KEY,
    routeRepresentation: 'polyline',
    routeType: 'fastest',
    traffic: 'false',
    ...extra,
  });
}

function hasTollSections(sections: Array<{ sectionType: string; }> = []): boolean {
  return sections.some((s) => s.sectionType === 'TOLL_ROAD' || s.sectionType === 'tollRoad');
}

export async function tomtomCalculateRoute(stops: Stop[]): Promise<TomTomRouteResult> {
  const locations = stops.map((p) => `${p.latitude},${p.longitude}`).join(':');
  const params = buildRouteParams();

  const response = await fetch(
    `${TOMTOM_ROUTING_BASE}/calculateRoute/${locations}/json?${params}`,
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`TomTom Routing API error: ${response.status} — ${body}`);
  }

  const data: {
    routes: Array<{
      summary: { travelTimeInSeconds: number; lengthInMeters: number; };
      sections?: Array<{ sectionType: string; }>;
      legs: Array<{ points: TomTomRoutePoint[]; }>;
    }>;
  } = await response.json();

  if (!data.routes?.length) return { points: [], travelTimeInSeconds: 0, distanceKm: 0, hasTolls: false };

  const route = data.routes[0];
  const all: TomTomRoutePoint[] = route.legs.flatMap((leg) => leg.points);
  const { travelTimeInSeconds, lengthInMeters } = route.summary;

  return {
    points: all,
    travelTimeInSeconds,
    distanceKm: lengthInMeters / 1000,
    hasTolls: hasTollSections(route.sections),
  };
}

export async function tomtomCalculateRouteAlternatives(
  stops: Stop[],
  maxAlternatives: number,
): Promise<TomTomRouteAlternative[]> {
  const locations = stops.map((p) => `${p.latitude},${p.longitude}`).join(':');
  const params = buildRouteParams({
    maxAlternatives: String(maxAlternatives),
    alternativeType: 'anyRoute',
  });

  const response = await fetch(
    `${TOMTOM_ROUTING_BASE}/calculateRoute/${locations}/json?${params}`,
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`TomTom Routing API error: ${response.status} — ${body}`);
  }

  const data: {
    routes: Array<{
      summary: { travelTimeInSeconds: number; lengthInMeters: number; };
      sections?: Array<{ sectionType: string; }>;
      legs: Array<{ points: TomTomRoutePoint[]; }>;
    }>;
  } = await response.json();

  if (!data.routes?.length) return [];

  return data.routes.map((route, idx) => {
    const { travelTimeInSeconds, lengthInMeters } = route.summary;
    return {
      id: ROUTE_ALT_IDS[idx] ?? `ALT_${idx}`,
      title: ROUTE_ALT_TITLES[idx] ?? `Alternativa ${idx}`,
      points: route.legs.flatMap((leg) => leg.points),
      travelTimeInSeconds,
      distanceKm: lengthInMeters / 1000,
      durationMin: Math.round(travelTimeInSeconds / 60),
      hasTolls: hasTollSections(route.sections),
    };
  });
}
