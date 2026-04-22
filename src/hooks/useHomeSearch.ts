import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { toLocalISOString } from '@/lib/utils';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { TripType } from '@/types/api';

// ── Types ──

export type ActivePicker = 'origin' | 'destination' | 'date' | 'tripType' | null;

// ── Hook ──

export function useHomeSearch() {
  const router = useRouter();

  // ── Search form ──
  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(() => new Date());
  const [tripType, setTripType] = useState<TripType>('INTERCITY');

  // ── Single modal state — enforces at most one picker open at a time ──
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // ── Derived ──
  const canSearch = !!origin && !!destination;
  const isIntercity = tripType === 'INTERCITY';

  // ── Actions ──

  const openOriginPicker = useCallback(() => setActivePicker('origin'), []);
  const openDestPicker = useCallback(() => setActivePicker('destination'), []);

  const selectTripTypeAndSearch = useCallback((type: TripType) => {
    setTripType(type);
    setActivePicker('origin');
  }, []);

  const handleSearch = useCallback(() => {
    if (!origin || !destination) return;

    if (tripType === 'ROUTINE') {
      router.push({
        pathname: '/search/routine',
        params: {
          originLat: String(origin.latitude),
          originLng: String(origin.longitude),
          originName: origin.name,
          destLat: String(destination.latitude),
          destLng: String(destination.longitude),
          destName: destination.name,
        },
      });
      return;
    }

    const isToday = dayjs(departureDate).isSame(dayjs(), 'day');
    const from = isToday
      ? toLocalISOString(dayjs().add(1, 'hour').toDate())
      : toLocalISOString(dayjs(departureDate).startOf('day').toDate());
    const to = toLocalISOString(dayjs(departureDate).endOf('day').toDate());

    router.push({
      pathname: '/search/results',
      params: {
        originLat: String(origin.latitude),
        originLng: String(origin.longitude),
        originName: origin.name,
        destLat: String(destination.latitude),
        destLng: String(destination.longitude),
        destName: destination.name,
        departureFrom: from,
        departureTo: to,
        tripType,
      },
    });
  }, [origin, destination, departureDate, tripType, router]);

  return {
    // Form values
    origin,
    destination,
    departureDate,
    tripType,
    isIntercity,
    canSearch,

    // Setters
    setOrigin,
    setDestination,
    setDepartureDate,
    setTripType,

    // Picker state — single source of truth for which picker is visible
    activePicker,
    setActivePicker,

    // Shorthand openers
    openOriginPicker,
    openDestPicker,

    // Handlers
    selectTripTypeAndSearch,
    handleSearch,
  };
}
