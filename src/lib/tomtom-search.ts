import { Config } from '@/constants/config';
import type { NominatimResult, LocationSearchResult } from './tomtom-types';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// ── Google Place type → locationType mapping ──

const MUNICIPALITY_TYPES = new Set([
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'locality',
  'postal_code',
  'colloquial_area',
  'natural_feature',
  'political',
]);

const SPECIFIC_TYPES = new Set([
  'street_address',
  'premise',
  'subpremise',
  'establishment',
  'point_of_interest',
  'route',
  'intersection',
  'parking',
  'airport',
  'train_station',
  'transit_station',
  'bus_station',
  'university',
  'school',
  'hospital',
  'shopping_mall',
]);

function classifyLocationType(types: string[]): 'specific' | 'municipality' {
  if (types.some((t) => SPECIFIC_TYPES.has(t))) return 'specific';
  if (types.some((t) => MUNICIPALITY_TYPES.has(t))) return 'municipality';
  return 'specific';
}

// ── Google Autocomplete response types ──

interface GoogleAutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types: string[];
}

interface GoogleAutocompleteResponse {
  predictions: GoogleAutocompletePrediction[];
  status: string;
}

// ── Google Place Details response types ──

interface GooglePlaceDetailsResponse {
  result: {
    geometry: { location: { lat: number; lng: number; }; };
    address_components: Array<{ long_name: string; types: string[]; }>;
  };
  status: string;
}

function getComponent(
  components: Array<{ long_name: string; types: string[]; }>,
  ...types: string[]
): string | undefined {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return undefined;
}

// ── Google Autocomplete search ──

export async function googleSearch(
  query: string,
  options?: { latitude?: number; longitude?: number; sessionToken?: string; },
): Promise<LocationSearchResult[]> {
  const params = new URLSearchParams({
    key: Config.GOOGLE_MAPS_API_KEY,
    input: query.trim(),
    components: 'country:co',
    language: 'es',
  });

  if (options?.sessionToken) params.append('sessiontoken', options.sessionToken);
  if (options?.latitude && options?.longitude) {
    params.append('location', `${options.latitude},${options.longitude}`);
    params.append('radius', '50000');
  }

  const response = await fetch(`${PLACES_BASE}/autocomplete/json?${params}`);
  if (!response.ok) throw new Error(`Google Places API error: ${response.status}`);

  const data: GoogleAutocompleteResponse = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API status: ${data.status}`);
  }

  return (data.predictions ?? []).map((p) => ({
    id: `gpl_${p.place_id}`,
    placeId: p.place_id,
    name: p.structured_formatting.main_text,
    address: p.structured_formatting.secondary_text ?? 'Colombia',
    // Coordinates are resolved via Place Details when the user selects this result
    latitude: 0,
    longitude: 0,
    source: 'google' as const,
    locationType: classifyLocationType(p.types),
  }));
}

// ── Google Place Details (resolves coords on selection) ──

export async function googleFetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<{ latitude: number; longitude: number; city?: string; state?: string; country?: string; }> {
  const params = new URLSearchParams({
    key: Config.GOOGLE_MAPS_API_KEY,
    place_id: placeId,
    fields: 'geometry,address_components',
    language: 'es',
  });

  if (sessionToken) params.append('sessiontoken', sessionToken);

  const response = await fetch(`${PLACES_BASE}/details/json?${params}`);
  if (!response.ok) throw new Error(`Google Place Details API error: ${response.status}`);

  const data: GooglePlaceDetailsResponse = await response.json();
  if (data.status !== 'OK') throw new Error(`Google Place Details status: ${data.status}`);

  const { lat, lng } = data.result.geometry.location;
  const components = data.result.address_components;

  return {
    latitude: lat,
    longitude: lng,
    city: getComponent(components, 'locality', 'administrative_area_level_2'),
    state: getComponent(components, 'administrative_area_level_1'),
    country: getComponent(components, 'country'),
  };
}

// ── Nominatim search (fallback) ──

export async function nominatimSearch(
  query: string,
  options?: { latitude?: number; longitude?: number; },
): Promise<LocationSearchResult[]> {
  let url =
    `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}` +
    `&countrycodes=co&format=json&limit=6&addressdetails=1&language=es`;

  if (options?.latitude && options?.longitude) {
    url += `&lat=${options.latitude}&lon=${options.longitude}`;
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'ParlAndo/1.0' } });
    const data: NominatimResult[] = await response.json();

    return data.map((result) => {
      const addr = result.address ?? {};
      const primary =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        result.display_name.split(',')[0].trim();
      const secondary = [addr.state || addr.county, 'Colombia'].filter(Boolean).join(', ');
      const hasStreet = !!(addr as any).road || !!(addr as any).street;

      return {
        id: `nom_${result.place_id}`,
        name: primary,
        address: secondary,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        source: 'nominatim' as const,
        locationType: hasStreet ? 'specific' : 'municipality',
        city: addr.city || addr.town || addr.village || addr.municipality || undefined,
        state: addr.state || addr.county || undefined,
        country: 'Colombia',
      };
    });
  } catch {
    return [];
  }
}

const TOMTOM_BASE = 'https://api.tomtom.com/search/2';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// ── TomTom formatters ──

const BROAD_GEOGRAPHY_ENTITY_TYPES = new Set([
  'Country',
  'CountrySubdivision',
  'CountrySecondarySubdivision',
  'CountryTertiarySubdivision',
  'Municipality',
  'MunicipalitySubdivision',
  'Neighbourhood',
  'PostalCodeArea',
]);

function formatTomTomResult(result: TomTomSearchResult): LocationSearchResult {
  const addr = result.address;
  const parts = addr.freeformAddress.split(',').map((p) => p.trim());
  const countryIndex = parts.findIndex((p) => p === addr.country);
  const primaryParts = countryIndex > 0 ? parts.slice(0, countryIndex) : parts;
  const primary = primaryParts.join(', ') || addr.freeformAddress.split(',')[0].trim();
  const secondary = [addr.municipality, addr.countrySubdivision, addr.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  const isBroadGeography =
    result.type === 'Geography' &&
    !!result.entityType &&
    BROAD_GEOGRAPHY_ENTITY_TYPES.has(result.entityType);

  const isSpecific =
    !isBroadGeography ||
    result.type === 'Point Address' ||
    result.type === 'Street' ||
    result.type === 'Cross Street' ||
    !!addr.street ||
    !!addr.buildingNumber;

  return {
    id: `addr_${result.id}`,
    name: primary,
    address: secondary || addr.country,
    latitude: result.position.lat,
    longitude: result.position.lon,
    source: 'tomtom',
    locationType: isSpecific ? 'specific' : 'municipality',
    city: addr.municipality || undefined,
    state: addr.countrySubdivision || undefined,
    country: addr.country || undefined,
  };
}

function formatTomTomPoiResult(result: TomTomPoiResult): LocationSearchResult {
  const poiName =
    result.poi?.name || result.address?.freeformAddress?.split(',')[0]?.trim() || '';
  const poiType = result.poi?.categories?.[0] || '';
  const addressSecondary = [
    poiType ? `📍 ${poiType}` : '',
    result.address?.municipality,
    result.address?.countrySubdivision,
  ]
    .filter((v): v is string => !!v)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return {
    id: `poi_${result.id}`,
    name: poiName,
    address: addressSecondary || result.address?.country || 'Colombia',
    latitude: result.position.lat,
    longitude: result.position.lon,
    source: 'tomtom',
    locationType: 'specific',
    city: result.address?.municipality || undefined,
    state: result.address?.countrySubdivision || undefined,
    country: result.address?.country || undefined,
  };
}

// ── TomTom search ──

export async function tomtomSearch(
  query: string,
  options?: { latitude?: number; longitude?: number; },
): Promise<LocationSearchResult[]> {
  const generalParams = new URLSearchParams({
    key: Config.TOMTOM_API_KEY,
    query: query.trim(),
    limit: '4',
    countrySet: 'CO',
    language: 'es-ES',
    typeahead: 'true',
  });

  const poiParams = new URLSearchParams({
    key: Config.TOMTOM_API_KEY,
    query: query.trim(),
    limit: '3',
    countrySet: 'CO',
    language: 'es-ES',
  });

  if (options?.latitude && options?.longitude) {
    [generalParams, poiParams].forEach((p) => {
      p.append('lat', String(options.latitude));
      p.append('lon', String(options.longitude));
    });
  }

  const [generalRes, poiRes] = await Promise.all([
    fetch(`${TOMTOM_BASE}/search/${encodeURIComponent(query)}.json?${generalParams}`, {
      headers: { 'Content-Type': 'application/json' },
    }),
    fetch(`${TOMTOM_BASE}/poiSearch/${encodeURIComponent(query)}.json?${poiParams}`, {
      headers: { 'Content-Type': 'application/json' },
    }),
  ]);

  const results: LocationSearchResult[] = [];

  if (generalRes.ok) {
    const data: TomTomSearchResponse = await generalRes.json();
    results.push(...data.results.map(formatTomTomResult));
  }

  if (poiRes.ok) {
    const data: TomTomPoiSearchResponse = await poiRes.json();
    if (data.results) {
      results.push(...data.results.map(formatTomTomPoiResult));
    }
  }

  return results.slice(0, 6);
}

// ── Nominatim search ──

export async function nominatimSearch(
  query: string,
  options?: { latitude?: number; longitude?: number; },
): Promise<LocationSearchResult[]> {
  let url =
    `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}` +
    `&countrycodes=co&format=json&limit=6&addressdetails=1&language=es`;

  if (options?.latitude && options?.longitude) {
    url += `&lat=${options.latitude}&lon=${options.longitude}`;
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'ParlAndo/1.0' } });
    const data: NominatimResult[] = await response.json();

    return data.map((result) => {
      const addr = result.address ?? {};
      const primary =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        result.display_name.split(',')[0].trim();
      const secondary = [addr.state || addr.county, 'Colombia'].filter(Boolean).join(', ');
      const hasStreet = !!(addr as any).road || !!(addr as any).street;

      return {
        id: `nom_${result.place_id}`,
        name: primary,
        address: secondary,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        source: 'nominatim' as const,
        locationType: hasStreet ? 'specific' : 'municipality',
        city: addr.city || addr.town || addr.village || addr.municipality || undefined,
        state: addr.state || addr.county || undefined,
        country: 'Colombia',
      };
    });
  } catch {
    return [];
  }
}
