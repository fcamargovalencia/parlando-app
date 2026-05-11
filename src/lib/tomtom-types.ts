// ── TomTom Types ──

export interface TomTomPoiResult {
  id: string;
  type: string;
  poi?: {
    name?: string;
    categories?: string[];
  };
  address?: {
    freeformAddress?: string;
    municipality?: string;
    countrySubdivision?: string;
    country?: string;
  };
  position: { lat: number; lon: number };
}

export interface TomTomPoiSearchResponse {
  results: TomTomPoiResult[];
}

export interface TomTomSearchResult {
  id: string;
  type: string;
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
  position: { lat: number; lon: number };
  viewport?: { topLeftPoint: { lat: number; lon: number }; btmRightPoint: { lat: number; lon: number } };
  entryPoints?: Array<{ type: string; position: { lat: number; lon: number } }>;
  dataSources?: { geometry: { id: string } };
  boundingBox?: { topLeftPoint: { lat: number; lon: number }; btmRightPoint: { lat: number; lon: number } };
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
    geoBias?: { lat: number; lon: number };
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
    boundingBox?: { topLeftPoint: { lat: number; lon: number }; btmRightPoint: { lat: number; lon: number } };
  };
  position: { lat: number; lon: number };
  addressRanges?: any[];
  dataSources?: { geometry: { id: string }; pointOfInterest: { id: string } };
}

export interface TomTomReverseGeocodeResponse {
  summary: { queryTime: number; copyright: string };
  addresses: TomTomReverseGeocodeResult[];
}

// ── Nominatim Types (Fallback) ──

export interface NominatimResult {
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
    road?: string;
    house_number?: string;
  };
}

// ── Shared Export Types ──

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'tomtom' | 'nominatim' | 'google';
  /**
   * 'municipality' → broad area; user should pick exact point on map.
   * 'specific'     → street address or POI; can be confirmed directly.
   */
  locationType: 'municipality' | 'specific';
  /**
   * Google Places place_id. Present only for 'google' source results.
   * When set, coordinates are resolved via Place Details on selection.
   */
  placeId?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface TomTomRoutePoint {
  latitude: number;
  longitude: number;
}

export interface TomTomRouteResult {
  points: TomTomRoutePoint[];
  travelTimeInSeconds: number;
  distanceKm: number;
  hasTolls: boolean;
}

export interface TomTomRouteAlternative {
  id: string;
  title: string;
  points: TomTomRoutePoint[];
  travelTimeInSeconds: number;
  distanceKm: number;
  durationMin: number;
  hasTolls: boolean;
}
