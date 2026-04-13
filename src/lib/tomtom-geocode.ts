import { Config } from '@/constants/config';
import type { TomTomReverseGeocodeResponse } from './tomtom-types';

const TOMTOM_BASE = 'https://api.tomtom.com/search/2';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

type GeoResult = { name: string; city?: string; state?: string; country?: string };

export async function tomtomReverseGeocode(latitude: number, longitude: number): Promise<GeoResult> {
  const params = new URLSearchParams({ key: Config.TOMTOM_API_KEY, language: 'es-ES' });

  const response = await fetch(
    `${TOMTOM_BASE}/reverseGeocode/${latitude},${longitude}.json?${params}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
  );

  if (!response.ok) throw new Error(`TomTom API error: ${response.status}`);

  const data: TomTomReverseGeocodeResponse = await response.json();

  if (!data.addresses?.length) return { name: 'Ubicación' };

  const addr = data.addresses[0].address;
  const street = addr.street
    ? `${addr.buildingNumber ? addr.buildingNumber + ' ' : ''}${addr.street}`
    : '';
  const municipality = addr.municipality ?? '';

  const name =
    street ||
    addr.neighbourhood ||
    addr.freeformAddress.split(',')[0].trim() ||
    municipality ||
    addr.localName ||
    'Ubicación';

  return {
    name,
    city: municipality || addr.localName || undefined,
    state: addr.countrySubdivisionName || addr.countrySubdivision || undefined,
    country: addr.country || undefined,
  };
}

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
