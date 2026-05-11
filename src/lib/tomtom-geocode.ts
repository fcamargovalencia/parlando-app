import { Config } from '@/constants/config';

const GEOCODING_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

type GeoResult = { name: string; city?: string; state?: string; country?: string; };

// ── Internal response types ──

interface GoogleGeocodeComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResponse {
  results: Array<{ address_components: GoogleGeocodeComponent[]; }>;
  status: string;
}

function getComponent(components: GoogleGeocodeComponent[], ...types: string[]): string | undefined {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return undefined;
}

// ── Google Geocoding ──

export async function tomtomReverseGeocode(latitude: number, longitude: number): Promise<GeoResult> {
  const params = new URLSearchParams({
    key: Config.GOOGLE_MAPS_API_KEY,
    latlng: `${latitude},${longitude}`,
    language: 'es',
  });

  const response = await fetch(`${GEOCODING_BASE}?${params}`);
  if (!response.ok) throw new Error(`Google Geocoding API error: ${response.status}`);

  const data: GoogleGeocodeResponse = await response.json();
  if (data.status !== 'OK' || !data.results?.length) return { name: 'Ubicación' };

  const components = data.results[0].address_components;

  const streetNumber = getComponent(components, 'street_number');
  const route = getComponent(components, 'route');
  const street = route ? `${streetNumber ? streetNumber + ' ' : ''}${route}` : '';

  const neighbourhood = getComponent(components, 'sublocality_level_1', 'sublocality', 'neighborhood');
  const city = getComponent(components, 'locality', 'administrative_area_level_2');
  const state = getComponent(components, 'administrative_area_level_1');
  const country = getComponent(components, 'country');

  const name = street || neighbourhood || city || 'Ubicación';

  return { name, city, state, country };
}

// ── Nominatim fallback ──

export async function nominatimReverseGeocode(latitude: number, longitude: number): Promise<GeoResult> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&language=es`,
      { headers: { 'User-Agent': 'ParlAndo/1.0' } },
    );

    const data: any = await response.json();
    const addr = data.address ?? {};
    const city: string | undefined =
      addr.city || addr.town || addr.village || addr.municipality || undefined;
    const state: string | undefined = addr.state || addr.county || undefined;

    const name =
      (addr.road ? `${addr.house_number ? addr.house_number + ' ' : ''}${addr.road}` : '') ||
      addr.neighbourhood ||
      city ||
      data.display_name?.split(',')[0]?.trim() ||
      'Ubicación';

    return { name, city, state, country: 'Colombia' };
  } catch {
    return { name: 'Ubicación' };
  }
}
