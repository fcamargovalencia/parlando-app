import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ticket, Repeat2 } from 'lucide-react-native';
import { Spinner, Button } from '@/components/ui';
import { Colors } from '@/constants/colors';
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
import { useTripDetailScreen } from '@/hooks/useTripDetailScreen';

function RoutineOccurrenceBanner({ routineTripId, departureAt }: { routineTripId: string; departureAt: string; }) {
  const router = useRouter();
  const date = new Date(departureAt);
  const dateLabel = date.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/routine/${routineTripId}`)}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[200] }}
    >
      <Repeat2 size={18} color={Colors.primary[600]} />
      <View className="flex-1">
        <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
          Viaje rutinario
        </Text>
        <Text className="text-xs text-neutral-500 mt-0.5 capitalize">{dateLabel}</Text>
      </View>
      <Text className="text-xs font-medium" style={{ color: Colors.primary[600] }}>
        Ver plantilla
      </Text>
    </TouchableOpacity>
  );
}

export default function TripDetailScreen() {
  const {
    // data
    trip, updateTrip, vehicle, bookings, myBooking, updateMyBooking,
    // status
    loading, error, actionLoading, isDriver, canEdit, canBook,
    // ratings
    ratedUserIds, driverCommentCount, passengerCommentCounts,
    // route
    waypointsFull, loadingWaypoints, routePolyline, loadingRoutePolyline,
    // trip actions
    load, handlePublish, handleStart, handleComplete, handleCancel,
    handleCancelBooking, handleBookingAction, handleBoardPassenger,
    // screen state
    insets, goBack,
    editVisible, setEditVisible,
    bookVisible, setBookVisible,
    mapVisible, setMapVisible,
    rateModal, setRateModal,
    // screen handlers
    handleOpenMap,
    handleNavigateToDriver,
    handleContactDriver, handleMessagePassenger,
    handleOpenRateDriver, handleOpenRatePassenger, handleSubmitRating,
  } = useTripDetailScreen();

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50">
        <TripDetailHeader paddingTop={insets.top} canEdit={false} onBack={goBack} onEdit={() => { }} />
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View className="flex-1 bg-neutral-50">
        <TripDetailHeader paddingTop={insets.top} canEdit={false} onBack={goBack} onEdit={() => { }} />
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">{error ?? 'No encontrado'}</Text>
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
        onBack={goBack}
        onEdit={() => setEditVisible(true)}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <TripRouteCard trip={trip} onOpenMap={handleOpenMap} />

        {trip.tripType === 'ROUTINE' && trip.routineTripId && (
          <RoutineOccurrenceBanner
            routineTripId={trip.routineTripId}
            departureAt={trip.departureAt}
          />
        )}

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

        {!isDriver && canBook && (
          <Button
            onPress={() => setBookVisible(true)}
            size="lg"
            icon={<Ticket size={18} color="white" />}
          >
            Reservar cupo — {formatCurrency(trip.pricePerSeat, trip.currency)} / asiento
          </Button>
        )}

        {!isDriver && trip.status === 'PUBLISHED' && trip.availableSeats === 0 && !myBooking && (
          <View className="bg-neutral-100 rounded-2xl p-4 items-center">
            <Text className="text-sm font-medium text-neutral-500">Sin cupos disponibles</Text>
          </View>
        )}

        <TripInfoCard trip={trip} />

        {!isDriver && trip.driver && (
          <DriverVehicleCard
            trip={trip}
            vehicle={vehicle}
            myBooking={myBooking}
            driverCommentCount={driverCommentCount}
            isDriverRated={ratedUserIds.has(trip.driverId)}
            onNavigateToDriver={handleNavigateToDriver}
            onRateDriver={handleOpenRateDriver}
            onContactDriver={handleContactDriver}
          />
        )}

        {isDriver && (
          <PassengerBookingsList
            bookings={bookings}
            tripId={trip.id}
            tripStatus={trip.status}
            pricePerSeat={trip.pricePerSeat}
            currency={trip.currency}
            actionLoading={actionLoading}
            ratedUserIds={ratedUserIds}
            passengerCommentCounts={passengerCommentCounts}
            onBookingAction={handleBookingAction}
            onBoard={handleBoardPassenger}
            onRate={handleOpenRatePassenger}
            onMessage={handleMessagePassenger}
          />
        )}

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

      {canEdit && (
        <EditTripModal
          trip={trip}
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          onConfirm={(u) => updateTrip(u)}
        />
      )}
      <BookTripModal
        trip={trip}
        visible={bookVisible}
        onClose={() => setBookVisible(false)}
        onConfirm={(booking) => updateMyBooking(booking)}
      />
      <RouteMapModal
        trip={trip}
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        waypoints={waypointsFull}
        routePolyline={routePolyline}
        loading={loadingWaypoints || loadingRoutePolyline}
      />
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
