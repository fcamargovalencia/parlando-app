import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { toLocalISOString } from '@/lib/utils';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { TripType, UniversityResponse } from '@/types/api';

// ── Types ──

export type ActivePicker = 'origin' | 'destination' | 'date' | 'tripType' | null;
export type DestinationMode = 'place' | 'university';

// ── Hook ──

export function useHomeSearch() {
  const router = useRouter();

  // ── Search form ──
  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(() => new Date());
  const [tripType, setTripTypeState] = useState<TripType>('INTERCITY');

  // ── Passenger count (INTERCITY/URBAN only) ──
  const [passengers, setPassengers] = useState(1);

  // ── Routine destination mode ──
  const [destinationMode, setDestinationModeState] = useState<DestinationMode>('place');
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityResponse | null>(null);

  // ── Single modal state — enforces at most one picker open at a time ──
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // ── Derived ──
  const canSearch =
    !!origin &&
    (tripType === 'ROUTINE' && destinationMode === 'university'
      ? !!selectedUniversity
      : !!destination);
  const isIntercity = tripType === 'INTERCITY';

  // ── Actions ──

  const openOriginPicker = useCallback(() => setActivePicker('origin'), []);
  const openDestPicker = useCallback(() => setActivePicker('destination'), []);

  const setTripType = useCallback((type: TripType) => {
    setTripTypeState(type);
    if (type !== 'ROUTINE') {
      setDestinationModeState('place');
      setSelectedUniversity(null);
    }
  }, []);

  const handleDestinationModeChange = useCallback((mode: DestinationMode) => {
    setDestinationModeState(mode);
    if (mode === 'university') {
      setDestination(null);
    } else {
      setSelectedUniversity(null);
    }
  }, []);

  const handleUniversitySelect = useCallback(
    (_id: string, university: UniversityResponse | null) => {
      setSelectedUniversity(university);
    },
    [],
  );

  const selectTripTypeAndSearch = useCallback(
    (type: TripType) => {
      setTripType(type);
      setActivePicker('origin');
    },
    [setTripType],
  );

  const handleSearch = useCallback(() => {
    if (!origin) return;

    if (tripType === 'ROUTINE') {
      const params: Record<string, string> = {
        originLat: String(origin.latitude),
        originLng: String(origin.longitude),
        originName: origin.name,
      };
      if (destinationMode === 'university' && selectedUniversity) {
        params.universityId = selectedUniversity.id;
        params.destName = selectedUniversity.name;
      } else if (destination) {
        params.destLat = String(destination.latitude);
        params.destLng = String(destination.longitude);
        params.destName = destination.name;
      }
      router.push({ pathname: '/search/routine', params });
      return;
    }

    if (!destination) return;

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
        passengers: String(passengers),
      },
    });
  }, [origin, destination, departureDate, tripType, destinationMode, selectedUniversity, passengers, router]);

  return {
    // Form values
    origin,
    destination,
    departureDate,
    tripType,
    isIntercity,
    canSearch,
    passengers,
    destinationMode,
    selectedUniversity,

    // Setters
    setOrigin,
    setDestination,
    setDepartureDate,
    setTripType,
    setPassengers,

    // Picker state — single source of truth for which picker is visible
    activePicker,
    setActivePicker,

    // Shorthand openers
    openOriginPicker,
    openDestPicker,

    // Handlers
    selectTripTypeAndSearch,
    handleSearch,
    handleDestinationModeChange,
    handleUniversitySelect,
  };
}
