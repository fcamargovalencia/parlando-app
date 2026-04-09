import { useState } from 'react';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { TripType } from '@/types/api';

// ── Helpers ──

/**
 * Returns an ISO-8601 string preserving the local UTC offset so the backend
 * can interpret the time in the user's timezone (e.g. "2025-04-02T10:00:00-05:00").
 */
function toLocalISOString(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return local.toISOString().slice(0, 19) + `${sign}${hh}:${mm}`;
}

// ── Hook ──

export function useHomeSearch() {
  const router = useRouter();

  // ── Search form ──
  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [tripType, setTripType] = useState<TripType>('INTERCITY');

  // ── Modal visibility ──
  const [originPickerVisible, setOriginPickerVisible] = useState(false);
  const [destPickerVisible, setDestPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tripTypeSheetVisible, setTripTypeSheetVisible] = useState(false);

  // ── Derived ──
  const canSearch = !!origin && !!destination;
  const isIntercity = tripType === 'INTERCITY';

  // ── Actions ──

  const openOriginPicker = () => setOriginPickerVisible(true);
  const openDestPicker = () => setDestPickerVisible(true);

  const selectTripTypeAndSearch = (type: TripType) => {
    setTripType(type);
    setOriginPickerVisible(true);
  };

  const handleSearch = () => {
    if (!origin || !destination) return;

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
  };

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

    // Modal flags
    originPickerVisible,
    destPickerVisible,
    datePickerVisible,
    tripTypeSheetVisible,

    // Modal openers/closers
    openOriginPicker,
    openDestPicker,
    setOriginPickerVisible,
    setDestPickerVisible,
    setDatePickerVisible,
    setTripTypeSheetVisible,

    // Handlers
    selectTripTypeAndSearch,
    handleSearch,
  };
}
