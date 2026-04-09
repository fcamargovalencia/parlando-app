import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Button } from '@/components/ui';
import { TripDetailHeader } from '@/components/trip/TripDetailHeader';
import { TripRouteCard } from '@/components/trip/TripRouteCard';
import { MyBookingCard } from '@/components/trip/MyBookingCard';
import { TripInfoCard } from '@/components/trip/TripInfoCard';
import { DriverVehicleCard } from '@/components/trip/DriverVehicleCard';
import { PassengerBookingsList } from '@/components/trip/PassengerBookingsList';
import { DriverActions } from '@/components/trip/DriverActions';
import { EditTripModal } from '@/components/trip/EditTripModal';
import { BookTripModal } from '@/components/trip/BookTripModal';
import { RouteMapModal } from '@/components/trip/RouteMapModal';
import { RateModal } from '@/components/trip/RateModal';
import { formatCurrency } from '@/lib/utils';
import { useTripDetail } from '@/hooks/useTripDetail';
import type { BookingResponse } from '@/types/api';

// ── Rate modal state ──

interface RateTarget {
  bookingId: string;
  revieweeId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

// ── Main Screen ──

export default function TripDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    trip,
    setTrip,
    vehicle,
    bookings,
    myBooking,
    setMyBooking,
    loading,
    error,
    actionLoading,
    isDriver,
    canEdit,
    canBook,
    ratedUserIds,
    driverCommentCount,
    passengerCommentCounts,
    waypointsFull,
    loadingWaypoints,
    routePolyline,
    loadingRoutePolyline,
    load,
    handlePublish,
    handleStart,
    handleComplete,
    handleCancel,
    handleCancelBooking,
    openMap,
    handleBookingAction,
    handleRateDriver,
    handleRatePassenger,
  } = useTripDetail(id, { fromSearch: from === 'search' });

  const [editVisible, setEditVisible] = useState(false);
  const [bookVisible, setBookVisible] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [rateModal, setRateModal] = useState<RateTarget | null>(null);

  const handleOpenMap = useCallback(async () => {
    setMapVisible(true);
    await openMap();
  }, [openMap]);

  // ── Chat navigation helpers ──

  const navigateToChat = useCallback(
    (otherUserId: string, otherUserName: string, otherUserPhoto: string | null) => {
      if (!trip) return;
      router.push({
        pathname: '/chat/[tripId]' as const,
        params: {
          tripId: trip.id,
          otherUserId,
          otherUserName,
          otherUserPhoto: otherUserPhoto ?? '',
        },
      } as any);
    },
    [trip, router],
  );

  const handleContactDriver = useCallback(() => {
    if (!trip?.driver) return;
    navigateToChat(
      trip.driver.id,
      `${trip.driver.firstName} ${trip.driver.lastName}`,
      trip.driver.profilePhotoUrl,
    );
  }, [trip, navigateToChat]);

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

  // ── Rate handlers ──

  const handleOpenRateDriver = useCallback(() => {
    if (!trip?.driver || !myBooking) return;
    setRateModal({
      bookingId: myBooking.id,
      revieweeId: trip.driverId,
      firstName: trip.driver.firstName,
      lastName: trip.driver.lastName,
      photoUrl: trip.driver.profilePhotoUrl,
    });
  }, [trip, myBooking]);

  const handleOpenRatePassenger = useCallback(
    (booking: BookingResponse) => {
      if (!booking.passenger) return;
      setRateModal({
        bookingId: booking.id,
        revieweeId: booking.passenger.id,
        firstName: booking.passenger.firstName,
        lastName: booking.passenger.lastName,
        photoUrl: booking.passenger.profilePhotoUrl,
      });
    },
    [],
  );

  const handleSubmitRating = useCallback(
    async (score: number, comment: string) => {
      if (!rateModal) return;
      if (isDriver) {
        await handleRatePassenger(rateModal.revieweeId, score, comment);
      } else {
        await handleRateDriver(score, comment);
      }
      setRateModal(null);
    },
    [rateModal, isDriver, handleRatePassenger, handleRateDriver],
  );

  // ── Render ──

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50">
        <TripDetailHeader
          paddingTop={insets.top}
          canEdit={false}
          onBack={() => router.back()}
          onEdit={() => {}}
        />
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View className="flex-1 bg-neutral-50">
        <TripDetailHeader
          paddingTop={insets.top}
          canEdit={false}
          onBack={() => router.back()}
          onEdit={() => {}}
        />
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">
            {error ?? 'No encontrado'}
          </Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <TripDetailHeader
        paddingTop={insets.top}
        canEdit={!!canEdit}
        onBack={() => router.back()}
        onEdit={() => setEditVisible(true)}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Route card */}
        <TripRouteCard trip={trip} onOpenMap={handleOpenMap} />

        {/* Passenger: My booking */}
        {!isDriver && myBooking && (
          <MyBookingCard
            booking={myBooking}
            pricePerSeat={trip.pricePerSeat}
            currency={trip.currency}
            tripStatus={trip.status}
            actionLoading={actionLoading}
            onCancelBooking={handleCancelBooking}
          />
        )}

        {/* Passenger: Book button */}
        {!isDriver && canBook && (
          <Button
            onPress={() => setBookVisible(true)}
            size="lg"
            icon={<Ticket size={18} color="white" />}
          >
            Reservar cupo — {formatCurrency(trip.pricePerSeat, trip.currency)} / asiento
          </Button>
        )}

        {/* No seats left */}
        {!isDriver && trip.status === 'PUBLISHED' && trip.availableSeats === 0 && !myBooking && (
          <View className="bg-neutral-100 rounded-2xl p-4 items-center">
            <Text className="text-sm font-medium text-neutral-500">
              Sin cupos disponibles
            </Text>
          </View>
        )}

        {/* Trip info */}
        <TripInfoCard trip={trip} />

        {/* Passenger: Driver + Vehicle */}
        {!isDriver && trip.driver && (
          <DriverVehicleCard
            trip={trip}
            vehicle={vehicle}
            myBooking={myBooking}
            driverCommentCount={driverCommentCount}
            isDriverRated={ratedUserIds.has(trip.driverId)}
            onNavigateToDriver={() =>
              trip.driver &&
              router.push({ pathname: '/user/[id]', params: { id: trip.driver.id, tripId: trip.id } })
            }
            onRateDriver={handleOpenRateDriver}
            onContactDriver={handleContactDriver}
          />
        )}

        {/* Driver: Passenger bookings */}
        {isDriver && (
          <PassengerBookingsList
            bookings={bookings}
            tripId={trip.id}
            tripStatus={trip.status}
            actionLoading={actionLoading}
            ratedUserIds={ratedUserIds}
            passengerCommentCounts={passengerCommentCounts}
            onBookingAction={handleBookingAction}
            onRate={handleOpenRatePassenger}
            onMessage={handleMessagePassenger}
          />
        )}

        {/* Driver: Action buttons */}
        {isDriver && (
          <DriverActions
            status={trip.status}
            actionLoading={actionLoading}
            onPublish={handlePublish}
            onStart={handleStart}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>

      {/* Modals */}
      {trip && canEdit && (
        <EditTripModal
          trip={trip}
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          onSaved={(u) => setTrip(u)}
        />
      )}
      {trip && (
        <BookTripModal
          trip={trip}
          visible={bookVisible}
          onClose={() => setBookVisible(false)}
          onBooked={(booking) => setMyBooking(booking)}
        />
      )}
      {trip && (
        <RouteMapModal
          trip={trip}
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          waypoints={waypointsFull}
          routePolyline={routePolyline}
          loading={loadingWaypoints || loadingRoutePolyline}
        />
      )}
      <RateModal
        visible={rateModal !== null}
        onClose={() => setRateModal(null)}
        onSubmit={handleSubmitRating}
        title={rateModal ? `${rateModal.firstName} ${rateModal.lastName}` : ''}
        subtitle={isDriver ? 'Califica a este pasajero' : 'Califica a este conductor'}
        avatarUri={rateModal?.photoUrl}
        avatarFirstName={rateModal?.firstName}
        avatarLastName={rateModal?.lastName}
      />
    </View>
  );
}
