import { useReducer, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripDetail } from '@/hooks/useTripDetail';
import {
  tripDetailUIReducer,
  initialTripDetailUIState,
} from '@/reducers/trip-detail-ui.reducer';
import type { BookingResponse } from '@/types/api';

// ── Rate modal target ──

export interface RateTarget {
  bookingId: string;
  revieweeId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export function useTripDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tripDetail = useTripDetail(id, { fromSearch: from === 'search' });

  // ── Modal state ──

  const [uiState, dispatch] = useReducer(tripDetailUIReducer, initialTripDetailUIState);

  const editVisible = uiState.activeModal === 'edit';
  const bookVisible = uiState.activeModal === 'book';
  const mapVisible = uiState.activeModal === 'map';
  const rateModal = uiState.rateTarget;

  const setEditVisible = useCallback(
    (v: boolean) => dispatch(v ? { type: 'OPEN_MODAL', modal: 'edit' } : { type: 'CLOSE_MODAL' }),
    [],
  );
  const setBookVisible = useCallback(
    (v: boolean) => dispatch(v ? { type: 'OPEN_MODAL', modal: 'book' } : { type: 'CLOSE_MODAL' }),
    [],
  );
  const setMapVisible = useCallback(
    (v: boolean) => dispatch(v ? { type: 'OPEN_MODAL', modal: 'map' } : { type: 'CLOSE_MODAL' }),
    [],
  );
  const setRateModal = useCallback(
    (target: RateTarget | null) =>
      dispatch(target ? { type: 'OPEN_RATE', target } : { type: 'CLOSE_RATE' }),
    [],
  );

  // ── Map ──

  const handleOpenMap = useCallback(async () => {
    setMapVisible(true);
    await tripDetail.openMap();
  }, [tripDetail.openMap]);

  // ── Chat navigation ──

  const navigateToChat = useCallback(
    (otherUserId: string, otherUserName: string, otherUserPhoto: string | null) => {
      if (!tripDetail.trip) return;
      router.push({
        pathname: '/chat/[tripId]' as const,
        params: {
          tripId: tripDetail.trip.id,
          otherUserId,
          otherUserName,
          otherUserPhoto: otherUserPhoto ?? '',
        },
      } as any);
    },
    [tripDetail.trip, router],
  );

  const handleNavigateToDriver = useCallback(() => {
    const driver = tripDetail.trip?.driver;
    if (!driver) return;
    router.push({
      pathname: '/user/[id]',
      params: { id: driver.id, tripId: tripDetail.trip!.id },
    } as any);
  }, [tripDetail.trip, router]);

  const handleContactDriver = useCallback(() => {
    const driver = tripDetail.trip?.driver;
    if (!driver) return;
    navigateToChat(
      driver.id,
      `${driver.firstName} ${driver.lastName}`,
      driver.profilePhotoUrl,
    );
  }, [tripDetail.trip, navigateToChat]);

  const handleMessagePassenger = useCallback(
    (booking: BookingResponse) => {
      if (!booking.passenger) return;
      navigateToChat(
        booking.passenger.id,
        `${booking.passenger.firstName} ${booking.passenger.lastName}`,
        booking.passenger.profilePhotoUrl,
      );
    },
    [navigateToChat],
  );

  // ── Rating ──

  const handleOpenRateDriver = useCallback(() => {
    const { trip, myBooking } = tripDetail;
    if (!trip?.driver || !myBooking) return;
    setRateModal({
      bookingId: myBooking.id,
      revieweeId: trip.driverId,
      firstName: trip.driver.firstName,
      lastName: trip.driver.lastName,
      photoUrl: trip.driver.profilePhotoUrl,
    });
  }, [tripDetail.trip, tripDetail.myBooking]);

  const handleOpenRatePassenger = useCallback((booking: BookingResponse) => {
    if (!booking.passenger) return;
    setRateModal({
      bookingId: booking.id,
      revieweeId: booking.passenger.id,
      firstName: booking.passenger.firstName,
      lastName: booking.passenger.lastName,
      photoUrl: booking.passenger.profilePhotoUrl,
    });
  }, []);

  const handleSubmitRating = useCallback(
    async (score: number, comment: string) => {
      if (!rateModal) return;
      await tripDetail.handleRate(rateModal.revieweeId, score, comment);
      setRateModal(null);
    },
    [rateModal, tripDetail.handleRate],
  );

  const goBack = useCallback(() => router.back(), [router]);

  return {
    ...tripDetail,
    insets,
    goBack,
    editVisible,
    setEditVisible,
    bookVisible,
    setBookVisible,
    mapVisible,
    setMapVisible,
    rateModal,
    setRateModal,
    handleOpenMap,
    handleNavigateToDriver,
    handleContactDriver,
    handleMessagePassenger,
    handleOpenRateDriver,
    handleOpenRatePassenger,
    handleSubmitRating,
  };
}
