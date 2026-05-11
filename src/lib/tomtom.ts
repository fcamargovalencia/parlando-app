import { Config } from '@/constants/config';
import { tomtomSearch, nominatimSearch } from './tomtom-search';
import { tomtomReverseGeocode, nominatimReverseGeocode } from './tomtom-geocode';
import { tomtomCalculateRoute, tomtomCalculateRouteAlternatives } from './tomtom-routing';

// Re-export all public types so existing imports from '@/lib/tomtom' keep working.
export type {
  LocationSearchResult,
  TomTomRoutePoint,
  TomTomRouteResult,
  TomTomRouteAlternative,
  TomTomSearchResult,
  TomTomSearchResponse,
  TomTomReverseGeocodeResult,
  TomTomReverseGeocodeResponse,
  NominatimResult,
} from './tomtom-types';

// ── Public API ──

export const tomtomService = {
  /**
   * Search for locations by query string.
   * Priority: TomTom (if key available) → Nominatim fallback.
   */
  async searchLocations(
    query: string,
    options?: { latitude?: number; longitude?: number; },
  ) {
    if (Config.TOMTOM_API_KEY) {
      try {
        return await tomtomSearch(query, options);
      } catch (err) {
        console.warn('[TomTom] Search failed, falling back to Nominatim:', err);
      }
    }
    return nominatimSearch(query, options);
  },

  /**
   * Get human-readable address from coordinates.
   * Priority: TomTom (if key available) → Nominatim fallback.
   */
  async reverseGeocode(latitude: number, longitude: number) {
    if (Config.GOOGLE_MAPS_API_KEY) {
      try {
        return await tomtomReverseGeocode(latitude, longitude);
      } catch (err) {
        console.warn('[Google] Reverse geocode failed, falling back to Nominatim:', err);
      }
    }
    return nominatimReverseGeocode(latitude, longitude);
  },

  /**
   * Calculate a route between ordered stops.
   * Throws if TomTom is not configured or the request fails.
   */
  async calculateRoute(stops: Array<{ latitude: number; longitude: number; }>) {
    if (!Config.GOOGLE_MAPS_API_KEY) throw new Error('Google Maps API key not configured');
    return tomtomCalculateRoute(stops);
  },

  /**
   * Calculate a route with up to `maxAlternatives` real road-based alternatives.
   */
  async calculateRouteAlternatives(
    stops: Array<{ latitude: number; longitude: number; }>,
    options?: { maxAlternatives?: number; },
  ) {
    if (!Config.GOOGLE_MAPS_API_KEY) throw new Error('Google Maps API key not configured');
    return tomtomCalculateRouteAlternatives(stops, options?.maxAlternatives ?? 2);
  },

  isConfigured(): boolean {
    return !!Config.GOOGLE_MAPS_API_KEY;
  },
};
