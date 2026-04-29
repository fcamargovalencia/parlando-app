import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { bookingsApi } from '@/api/bookings';
import { ratingsApi } from '@/api/ratings';
import { tripsApi } from '@/api/trips';
import { extractApiError } from '@/lib/utils';
import {
  mapBookingToItem,
  mapTripToItem,
  sortItems,
} from '@/lib/my-trips';
import type {
  BookingResponse,
  TripResponse,
} from '@/types/api';
import type { MyTripFilter, MyTripItem } from '@/types/my-trips';

// ── Reducer state ──

interface State {
  trips: TripResponse[];
  tripBookings: Record<string, BookingResponse[]>;
  bookings: BookingResponse[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  cancellingId: string | null;
}

type Action =
  | { type: 'FETCH_START'; refreshing?: boolean; }
  | { type: 'FETCH_SUCCESS'; trips: TripResponse[]; bookings: BookingResponse[]; }
  | { type: 'FETCH_ERROR'; payload: string; }
  | { type: 'SET_TRIP_BOOKINGS'; tripId: string; bookings: BookingResponse[]; }
  | { type: 'CANCEL_START'; id: string; }
  | { type: 'CANCEL_TRIP_SUCCESS'; id: string; }
  | { type: 'CANCEL_BOOKING_SUCCESS'; id: string; }
  | { type: 'CANCEL_ERROR'; };

const initialState: State = {
  trips: [],
  tripBookings: {},
  bookings: [],
  loading: true,
  refreshing: false,
  error: null,
  cancellingId: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        // Only block the UI with a spinner on the very first load (no data yet).
        // Focus refetches and manual refreshes update silently in the background.
        loading: !action.refreshing && state.trips.length === 0 && state.bookings.length === 0,
        refreshing: action.refreshing ?? false,
        error: null,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        refreshing: false,
        trips: action.trips,
        bookings: action.bookings,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.payload };
    case 'SET_TRIP_BOOKINGS':
      return {
        ...state,
        tripBookings: { ...state.tripBookings, [action.tripId]: action.bookings },
      };
    case 'CANCEL_START':
      return { ...state, cancellingId: action.id };
    case 'CANCEL_TRIP_SUCCESS':
      return {
        ...state,
        cancellingId: null,
        trips: state.trips.map((t) =>
          t.id === action.id ? { ...t, status: 'CANCELLED' } : t,
        ),
      };
    case 'CANCEL_BOOKING_SUCCESS':
      return {
        ...state,
        cancellingId: null,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, status: 'CANCELLED' } : b,
        ),
      };
    case 'CANCEL_ERROR':
      return { ...state, cancellingId: null };
  }
}

// ── Response unwrapping ──

function unwrapList<T>(res: unknown): T[] {
  const rawData = (res as any)?.data;
  if (Array.isArray(rawData)) return rawData;
  if (Array.isArray(rawData?.data)) return rawData.data;
  if (Array.isArray(rawData?.content)) return rawData.content;
  return [];
}

// ── Data fetching (pure helpers) ──

async function fetchTrips(): Promise<TripResponse[]> {
  const { data: res } = await tripsApi.getMine();
  return unwrapList<TripResponse>(res);
}

async function fetchBookings(): Promise<BookingResponse[]> {
  const { data: res } = await bookingsApi.getMine();
  return unwrapList<BookingResponse>(res);
}

async function fetchBookingsForTrip(tripId: string): Promise<BookingResponse[]> {
  const { data: res } = await bookingsApi.getByTrip(tripId);
  return unwrapList<BookingResponse>(res);
}

// ── Rate modal state ──

interface RateModalState {
  bookingId: string;
  revieweeId: string;
  tripId: string;
}

// ── Hook ──

export function useMyTrips() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [filter, setFilter] = useState<MyTripFilter>('active');
  const [rateModal, setRateModal] = useState<RateModalState | null>(null);
  const [ratedBookings, setRatedBookings] = useState<Set<string>>(new Set());

  // ── Load ──

  const load = useCallback(async (refreshing = false) => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START', refreshing });
    try {
      const [trips, bookings] = await Promise.all([fetchTrips(), fetchBookings()]);
      if (cancelled) return;
      dispatch({ type: 'FETCH_SUCCESS', trips, bookings });

      // Hydrate bookings for completed trips so we can know if passengers were rated.
      // Fire-and-forget in parallel — failures are silent, screen already rendered.
      void Promise.allSettled(
        trips
          .filter((t) => t.status === 'COMPLETED')
          .map(async (t) => {
            const tripBookings = await fetchBookingsForTrip(t.id);
            if (!cancelled) {
              dispatch({ type: 'SET_TRIP_BOOKINGS', tripId: t.id, bookings: tripBookings });
            }
          }),
      );
    } catch (err) {
      if (!cancelled) {
        dispatch({
          type: 'FETCH_ERROR',
          payload: extractApiError(err, 'Error al cargar tus viajes'),
        });
      }
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  // ── Cancel ──

  const cancelTrip = useCallback((trip: TripResponse) => {
    Alert.alert(
      'Cancelar viaje',
      `¿Seguro que quieres cancelar el viaje de ${trip.originName} a ${trip.destinationName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            dispatch({ type: 'CANCEL_START', id: trip.id });
            try {
              await tripsApi.cancel(trip.id);
              dispatch({ type: 'CANCEL_TRIP_SUCCESS', id: trip.id });
              Toast.show({ type: 'success', text1: 'Viaje cancelado' });
            } catch (err) {
              dispatch({ type: 'CANCEL_ERROR' });
              Alert.alert('Error', extractApiError(err, 'No se pudo cancelar el viaje'));
            }
          },
        },
      ],
    );
  }, []);

  const cancelBooking = useCallback((booking: BookingResponse) => {
    const origin = booking.trip?.originName ?? '–';
    const dest = booking.trip?.destinationName ?? '–';
    Alert.alert(
      'Cancelar reserva',
      `¿Seguro que quieres cancelar tu reserva de ${origin} a ${dest}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            dispatch({ type: 'CANCEL_START', id: booking.id });
            try {
              await bookingsApi.cancel(booking.id);
              dispatch({ type: 'CANCEL_BOOKING_SUCCESS', id: booking.id });
              Toast.show({ type: 'success', text1: 'Reserva cancelada' });
            } catch (err) {
              dispatch({ type: 'CANCEL_ERROR' });
              Alert.alert('Error', extractApiError(err, 'No se pudo cancelar la reserva'));
            }
          },
        },
      ],
    );
  }, []);

  /** Unified cancel — delegates by item role */
  const cancelItem = useCallback(
    (item: MyTripItem) => {
      if (item.role === 'driver' && item.trip) return cancelTrip(item.trip);
      if (item.role === 'passenger' && item.booking) return cancelBooking(item.booking);
    },
    [cancelTrip, cancelBooking],
  );

  // ── Rating ──

  const openRateModal = useCallback((item: MyTripItem) => {
    if (item.role !== 'passenger') return;
    const booking = item.booking;
    const driverId = booking?.trip?.driverId;
    if (!booking || !driverId) return;
    setRateModal({
      bookingId: booking.id,
      revieweeId: driverId,
      tripId: booking.tripId,
    });
  }, []);

  const closeRateModal = useCallback(() => setRateModal(null), []);

  const submitRating = useCallback(
    async (score: number, comment: string) => {
      if (!rateModal) return;
      await ratingsApi.create({
        revieweeId: rateModal.revieweeId,
        tripId: rateModal.tripId,
        score,
        comment: comment || undefined,
      });
      setRatedBookings((prev) => new Set([...prev, rateModal.bookingId]));
      Toast.show({
        type: 'success',
        text1: '¡Calificación enviada!',
        text2: 'Gracias por tu opinión',
      });
      setRateModal(null);
    },
    [rateModal],
  );

  // ── Derived data ──

  /** All items (both sources), normalized. Unsorted / unfiltered. */
  const allItems = useMemo<MyTripItem[]>(() => {
    const driverItems = state.trips.map((t) => mapTripToItem(t, state.tripBookings[t.id]));
    const passengerItems = state.bookings.map((b) =>
      mapBookingToItem(b, ratedBookings.has(b.id)),
    );
    return [...driverItems, ...passengerItems];
  }, [state.trips, state.bookings, state.tripBookings, ratedBookings]);

  /** Counts per filter — used by the filter tabs */
  const counts = useMemo(() => {
    return allItems.reduce(
      (acc, item) => {
        acc[item.category] += 1;
        return acc;
      },
      { active: 0, past: 0, cancelled: 0 } as Record<MyTripFilter, number>,
    );
  }, [allItems]);

  /** Current filtered + sorted list */
  const items = useMemo(
    () => sortItems(allItems.filter((i) => i.category === filter), filter),
    [allItems, filter],
  );

  return {
    // Data
    items,
    counts,
    filter,
    setFilter,

    // State flags
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    cancellingId: state.cancellingId,

    // Actions
    refresh,
    reload: load,
    cancelItem,

    // Rating
    rateModal,
    openRateModal,
    closeRateModal,
    submitRating,
  };
}
