import { Config } from '@/constants/config';

// ── TomTom Types ──

export interface TomTomSearchResult {
  id: string;
  type: string;
  /** Geographic entity subtype — present when type === 'Geography' */
  entityType?: string;
  score: number;
  dist?: number;
  address: {
    buildingNumber?: string;
    street?: string;
    crossStreet?: string;
    municipality?: string;
    municipalitySubdivision?: string;
    countrySubdivision?: string;
    countryCode: string;
    country: string;
    countryCodeISO3?: string;
    freeformAddress: string;
    localName?: string;
  };
  position: {
    lat: number;
    lon: number;
  };
  viewport?: {
    topLeftPoint: { lat: number; lon: number; };
    btmRightPoint: { lat: number; lon: number; };
  };
  entryPoints?: Array<{
    type: string;
    position: { lat: number; lon: number; };
  }>;
  dataSources?: {
    geometry: { id: string; };
  };
  boundingBox?: {
    topLeftPoint: { lat: number; lon: number; };
    btmRightPoint: { lat: number; lon: number; };
  };
}

export interface TomTomSearchResponse {
  summary: {
    query: string;
    queryType: string;
    queryTime: number;
    numResults: number;
    offset: number;
    totalResults: number;
    fuzzyLevel: number;
    geoBias?: {
      lat: number;
      lon: number;
    };
  };
  results: TomTomSearchResult[];
}

export interface TomTomReverseGeocodeResult {
  address: {
    buildingNumber?: string;
    street?: string;
    routeNumbers?: string[];
    countryCode: string;
    country: string;
    countryCodeISO3?: string;
    countrySecondarySubdivision?: string;
    countrySubdivision?: string;
    countrySubdivisionName?: string;
    countryTertiarySubdivision?: string;
    municipality?: string;
    municipalitySubdivision?: string;
    localName?: string;
    neighbourhood?: string;
    postalCode?: string;
    postCode?: string;
    freeformAddress: string;
    boundingBox?: {
      topLeftPoint: { lat: number; lon: number; };
      btmRightPoint: { lat: number; lon: number; };
    };
  };
  position: {
    lat: number;
    lon: number;
  };
  addressRanges?: any[];
  dataSources?: {
    geometry: { id: string; };
    pointOfInterest: { id: string; };
  };
}

export interface TomTomReverseGeocodeResponse {
  summary: {
    queryTime: number;
    copyright: string;
  };
  addresses: TomTomReverseGeocodeResult[];
}

// ── Nominatim Types (Fallback) ──

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
    state?: string;
  };
}

// ── Export Types ──

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'tomtom' | 'nominatim';
  /**
   * 'municipality' → broad area (city/town/region); user should pick exact point on map.
   * 'specific'     → street address or POI; can be confirmed directly.
   */
  locationType: 'municipality' | 'specific';
}

// ── Public API ──

const TOMTOM_BASE = 'https://api.tomtom.com/search/2';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export const tomtomService = {
  /**
   * Search for locations by query string
   * Priority: TomTom (if key available) → Nominatim fallback
   */
  async searchLocations(query: string, options?: { latitude?: number; longitude?: number; }): Promise<LocationSearchResult[]> {
    // Try TomTom if key is available
    if (Config.TOMTOM_API_KEY) {
      try {
        return await tomtomSearch(query, options);
      } catch (err) {
        console.warn('[TomTom] Search failed, falling back to Nominatim:', err);
        // Fall through to Nominatim
      }
    }

    // Fallback to Nominatim
    return nominatimSearch(query, options);
  },

  /**
   * Get human-readable address from coordinates
   * Priority: TomTom (if key available) → Nominatim fallback
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    if (Config.TOMTOM_API_KEY) {
      try {
        return await tomtomReverseGeocode(latitude, longitude);
      } catch (err) {
        console.warn('[TomTom] Reverse geocode failed, falling back to Nominatim:', err);
      }
    }

    return nominatimReverseGeocode(latitude, longitude);
  },

  /**
   * Check if TomTom is configured
   */
  isConfigured(): boolean {
    return !!Config.TOMTOM_API_KEY;
  },
};

// ── TomTom Implementation ──

function formatTomTomResult(result: TomTomSearchResult, type: 'address' | 'poi'): LocationSearchResult {
  const addr = result.address;

  // Use freeformAddress as the primary source - it contains all details
  // Remove the country suffix (last part) to avoid repetition
  const parts = addr.freeformAddress.split(',').map(p => p.trim());
  const countryIndex = parts.findIndex(p => p === addr.country);
  const primaryParts = countryIndex > 0 ? parts.slice(0, countryIndex) : parts;

  // Primary: Full freeform address minus country (most specific to least)
  const primary = primaryParts.join(', ') || addr.freeformAddress.split(',')[0].trim();

  // Secondary: Municipality, state and country
  const secondary = [addr.municipality, addr.countrySubdivision, addr.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
    .join(', ');

  // Classify as municipality ONLY when the result represents a broad geographic area.
  // Everything else (street-level address, POI-like address result, intersections, etc.)
  // should be selectable directly without forcing map pinning.
  const broadGeographyEntityTypes = new Set([
    'Country',
    'CountrySubdivision',
    'CountrySecondarySubdivision',
    'CountryTertiarySubdivision',
    'Municipality',
    'MunicipalitySubdivision',
    'Neighbourhood',
    'PostalCodeArea',
  ]);

  const isBroadGeography =
    result.type === 'Geography' &&
    !!result.entityType &&
    broadGeographyEntityTypes.has(result.entityType);

  const isSpecific =
    !isBroadGeography ||
    result.type === 'Point Address' ||
    result.type === 'Street' ||
    result.type === 'Cross Street' ||
    !!addr.street ||
    !!addr.buildingNumber;

  return {
    id: `addr_${result.id}`, // Prefix to ensure uniqueness with POI results
    name: primary,
    address: secondary || addr.country,
    latitude: result.position.lat,
    longitude: result.position.lon,
    source: 'tomtom' as const,
    locationType: isSpecific ? 'specific' : 'municipality',
  };
}

function formatTomTomPoiResult(result: any): LocationSearchResult {
  // POI results have a slightly different structure
  const poi = result as {
    id: string;
    dist?: number;
    type: string;
    poi?: {
      name: string;
      categories?: string[];
      classifications?: Array<{ code: string; names?: Array<{ nameLocale: string; }>; }>;
    };
    address: {
      freeformAddress?: string;
      municipality?: string;
      countrySubdivision?: string;
      country?: string;
    };
    position: {
      lat: number;
      lon: number;
    };
  };

  const poiName = poi.poi?.name || poi.address?.freeformAddress?.split(',')[0]?.trim() || '';
  const poiType = poi.poi?.categories?.[0] || '';

  // For POI, show type in address if available
  const addressSecondary = [
    poiType ? `📍 ${poiType}` : '',
    poi.address?.municipality,
    poi.address?.countrySubdivision,
  ]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return {
    id: `poi_${poi.id}`, // Prefix to ensure uniqueness with address results
    name: poiName,
    address: addressSecondary || poi.address?.country || 'Colombia',
    latitude: poi.position.lat,
    longitude: poi.position.lon,
    source: 'tomtom' as const,
    locationType: 'specific', // POIs are always a precise point
  };
}

async function tomtomSearch(query: string, options?: { latitude?: number; longitude?: number; }): Promise<LocationSearchResult[]> {
  // Make two parallel requests: general search + POI search for better results
  const generalParams = new URLSearchParams({
    key: Config.TOMTOM_API_KEY,
    query: query.trim(),
    limit: '4', // Limit general results to make room for POI
    countrySet: 'CO', // Colombia only
    language: 'es-ES',
    typeahead: 'true', // Enable fuzzy/typeahead matching
  });

  const poiParams = new URLSearchParams({
    key: Config.TOMTOM_API_KEY,
    query: query.trim(),
    limit: '3', // POI results
    countrySet: 'CO',
    language: 'es-ES',
  });

  // Add bias to current location if available
  if (options?.latitude && options?.longitude) {
    generalParams.append('lat', options.latitude.toString());
    generalParams.append('lon', options.longitude.toString());
    poiParams.append('lat', options.latitude.toString());
    poiParams.append('lon', options.longitude.toString());
  }

  try {
    const [generalRes, poiRes] = await Promise.all([
      fetch(`${TOMTOM_BASE}/search/${encodeURIComponent(query)}.json?${generalParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(`${TOMTOM_BASE}/poiSearch/${encodeURIComponent(query)}.json?${poiParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    const results: LocationSearchResult[] = [];

    // Process general results
    if (generalRes.ok) {
      const data: TomTomSearchResponse = await generalRes.json();
      results.push(
        ...data.results.map((result) => formatTomTomResult(result, 'address'))
      );
    }

    // Process POI results
    if (poiRes.ok) {
      const data: any = await poiRes.json();
      if (data.results) {
        results.push(
          ...data.results.map((result: any) => formatTomTomPoiResult(result))
        );
      }
    }

    // Return up to 6 best combined results
    return results.slice(0, 6);
  } catch (error) {
    console.error('[TomTom] Search error:', error);
    throw error;
  }
}

async function tomtomReverseGeocode(latitude: number, longitude: number): Promise<string> {
  const params = new URLSearchParams({
    key: Config.TOMTOM_API_KEY,
    language: 'es-ES',
  });

  try {
    const response = await fetch(
      `${TOMTOM_BASE}/reverseGeocode/${latitude},${longitude}.json?${params}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );

    if (!response.ok) {
      throw new Error(`TomTom API error: ${response.status}`);
    }

    const data: TomTomReverseGeocodeResponse = await response.json();

    if (data.addresses && data.addresses.length > 0) {
      const addr = data.addresses[0].address;

      // Priority: Full address details > freeformAddress > municipality
      // Build address from components if available
      const street = addr.street ? `${addr.buildingNumber ? addr.buildingNumber + ' ' : ''}${addr.street}` : '';
      const neighbourhood = addr.neighbourhood ? addr.neighbourhood : '';
      const municipality = addr.municipality ? addr.municipality : '';

      // Return most detailed address available
      return (
        street ||
        neighbourhood ||
        addr.freeformAddress.split(',')[0].trim() ||
        municipality ||
        addr.localName ||
        'Ubicación'
      );
    }

    return 'Ubicación';
  } catch (error: any) {
    // 429 is expected under rapid movement — log as warn, not error
    if (error?.message?.includes('429')) {
      console.warn('[TomTom] Reverse geocode rate-limited (429), falling back to Nominatim');
    } else {
      console.warn('[TomTom] Reverse geocode error:', error);
    }
    throw error;
  }
}

// ── Nominatim Fallback ──

async function nominatimSearch(query: string, options?: { latitude?: number; longitude?: number; }): Promise<LocationSearchResult[]> {
  let url =
    `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}` +
    `&countrycodes=co&format=json&limit=6&addressdetails=1&language=es`;

  if (options?.latitude && options?.longitude) {
    url += `&lat=${options.latitude}&lon=${options.longitude}`;
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ParlAndo/1.0' },
    });

    const data: NominatimResult[] = await response.json();

    return data.map((result) => {
      const addr = result.address ?? {};
      const primary =
        addr.city || addr.town || addr.village || addr.municipality ||
        result.display_name.split(',')[0].trim();
      const secondary = [addr.state || addr.county, 'Colombia'].filter(Boolean).join(', ');

      // Nominatim: if the address has a road/street it's a specific location;
      // otherwise it's a broad area (city/town/village).
      const hasStreet = !!(addr as any).road || !!(addr as any).street;

      return {
        id: `nom_${result.place_id}`, // Prefix for consistency across all sources
        name: primary,
        address: secondary,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        source: 'nominatim' as const,
        locationType: hasStreet ? 'specific' : 'municipality',
      };
    });
  } catch (error) {
    console.error('[Nominatim] Search error:', error);
    return [];
  }
}

async function nominatimReverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&language=es`,
      { headers: { 'User-Agent': 'ParlAndo/1.0' } },
    );

    const data: any = await response.json();
    const addr = data.address ?? {};

    // Priority: street > neighbourhood > city > display name
    return (
      (addr.road ? `${addr.house_number ? addr.house_number + ' ' : ''}${addr.road}` : '') ||
      addr.neighbourhood ||
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      data.display_name?.split(',')[0]?.trim() ||
      'Ubicación'
    );
  } catch (error) {
    console.error('[Nominatim] Reverse geocode error:', error);
    return 'Ubicación';
  }
}
