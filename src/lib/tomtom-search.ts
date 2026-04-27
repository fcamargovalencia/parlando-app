import { Config } from '@/constants/config';
import type {
  TomTomSearchResult,
  TomTomSearchResponse,
  TomTomPoiResult,
  TomTomPoiSearchResponse,
  NominatimResult,
  LocationSearchResult,
} from './tomtom-types';

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
  options?: { latitude?: number; longitude?: number },
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
  options?: { latitude?: number; longitude?: number },
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
