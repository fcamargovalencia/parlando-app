import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  Users,
  DollarSign,
  Luggage,
  GraduationCap,
  Car,
  ChevronRight,
  Edit3,
  Map,
  Play,
  CheckCircle,
  XCircle,
  UserCheck,
  Ticket,
  Check,
  X,
  UserX,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, Spinner, Button, Avatar } from '@/components/ui';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { EditTripModal } from '@/components/trip/EditTripModal';
import { BookTripModal } from '@/components/trip/BookTripModal';
import { RouteMapModal } from '@/components/trip/RouteMapModal';
import { Colors, Shadows } from '@/constants/colors';
import { TRIP_STATUS_BADGE, BOOKING_STATUS_BADGE } from '@/constants/trips';
import { formatCurrency, getTripTypeLabel, formatDeparture } from '@/lib/utils';
import { useTripDetail } from '@/hooks/useTripDetail';
import type { BookingResponse, BookingStatus, TripStatus } from '@/types/api';

// ── Small helpers ──

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3 py-2.5 border-b border-neutral-100">
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text className="text-xs text-neutral-400 mb-0.5">{label}</Text>
        <Text className="text-sm font-medium text-neutral-900">{value}</Text>
      </View>
    </View>
  );
}

// ── Booking badge (detail-specific longer labels) ──

const BOOKING_DETAIL_BADGE: Record<
  BookingStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral'; }
> = {
  PENDING: { label: 'Pendiente de aprobación', variant: 'warning' },
  ACCEPTED: { label: 'Cupo aceptado', variant: 'success' },
  REJECTED: { label: 'Solicitud rechazada', variant: 'error' },
  BOARDED: { label: 'Abordo', variant: 'info' },
  COMPLETED: { label: 'Completado', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'neutral' },
  NO_SHOW: { label: 'No asististe', variant: 'error' },
};

// ── BookingRow ──

function BookingRow({
  booking,
  onAccept,
  onReject,
  onBoard,
  onNoShow,
  actionLoading,
  tripStatus,
}: {
  booking: BookingResponse;
  onAccept: () => void;
  onReject: () => void;
  onBoard: () => void;
  onNoShow: () => void;
  actionLoading: string | null;
  tripStatus: TripStatus;
}) {
  const passenger = booking.passenger;
  const badgeCfg = BOOKING_STATUS_BADGE[booking.status];
  const isLoading = (label: string) =>
    actionLoading === `${booking.id}-${label}`;

  return (
    <View className="py-3 border-b border-neutral-100">
      <View className="flex-row items-center gap-3 mb-2">
        <Avatar
          uri={passenger?.profilePhotoUrl ?? null}
          firstName={passenger?.firstName ?? '?'}
          lastName={passenger?.lastName ?? ''}
          size="sm"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-900">
            {passenger
              ? `${passenger.firstName} ${passenger.lastName}`
              : 'Pasajero'}
          </Text>
          <Text className="text-xs text-neutral-400">
            {booking.seatsBooked}{' '}
            {booking.seatsBooked === 1 ? 'asiento' : 'asientos'}
          </Text>
        </View>
        <Badge label={badgeCfg.label} variant={badgeCfg.variant} />
      </View>

      {booking.status === 'PENDING' && (
        <View className="flex-row gap-2 ml-12">
          <TouchableOpacity
            onPress={onAccept}
            disabled={!!actionLoading}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl"
            style={{ backgroundColor: Colors.primary[600] }}
          >
            {isLoading('accept') ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={14} color="#fff" />
                <Text className="text-white text-xs font-semibold">
                  Aceptar
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReject}
            disabled={!!actionLoading}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50"
            style={{ borderWidth: 1, borderColor: '#FCA5A5' }}
          >
            {isLoading('reject') ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <X size={14} color="#EF4444" />
                <Text className="text-red-500 text-xs font-semibold">
                  Rechazar
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'ACCEPTED' && tripStatus === 'IN_PROGRESS' && (
        <View className="flex-row gap-2 ml-12">
          <TouchableOpacity
            onPress={onBoard}
            disabled={!!actionLoading}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl"
            style={{ backgroundColor: Colors.primary[600] }}
          >
            {isLoading('board') ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <UserCheck size={14} color="#fff" />
                <Text className="text-white text-xs font-semibold">
                  Registrar abordaje
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNoShow}
            disabled={!!actionLoading}
            className="flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100"
          >
            {isLoading('noshow') ? (
              <ActivityIndicator size="small" color={Colors.neutral[500]} />
            ) : (
              <UserX size={14} color={Colors.neutral[500]} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ──

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string; }>();
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
  } = useTripDetail(id);

  const [editVisible, setEditVisible] = useState(false);
  const [bookVisible, setBookVisible] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  const handleOpenMap = async () => {
    setMapVisible(true);
    await openMap();
  };

  // ── Render ──

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 bg-white border-b border-neutral-100"
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          ...Shadows.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center"
        >
          <ArrowLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-neutral-900">
          Detalle del viaje
        </Text>
        <View className="w-9">
          {canEdit && (
            <TouchableOpacity
              onPress={() => setEditVisible(true)}
              className="w-9 h-9 items-center justify-center"
            >
              <Edit3 size={20} color={Colors.primary[600]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error || !trip ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">
            {error ?? 'No encontrado'}
          </Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status, Type & Full Route */}
          <Card>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <TripTypeIcon type={trip.tripType} size={18} />
                <Text className="text-sm font-medium text-neutral-600">
                  {getTripTypeLabel(trip.tripType)}
                </Text>
              </View>
              <Badge
                label={TRIP_STATUS_BADGE[trip.status].label}
                variant={TRIP_STATUS_BADGE[trip.status].variant}
              />
            </View>

            <View className="gap-3">
              {/* Origin */}
              <View className="flex-row items-start gap-3">
                <View className="items-center pt-1">
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: Colors.primary[500] }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">
                    {trip.originName}
                  </Text>
                  {!!trip.originSubtitle && (
                    <Text className="text-xs text-neutral-400 mt-0.5">
                      {trip.originSubtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Intermediate waypoints */}
              {trip.waypoints &&
                trip.waypoints
                  .filter((w) => w.isPickupPoint)
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((waypoint, idx) => (
                    <View key={waypoint.id || idx}>
                      <View className="ml-1.5 h-4 w-0.5 bg-neutral-200" />
                      <View className="flex-row items-start gap-3">
                        <View className="items-center pt-1">
                          <View className="w-3 h-3 rounded-full bg-primary-400" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-neutral-900">
                            {waypoint.name}
                          </Text>
                          {!!waypoint.subtitle && (
                            <Text className="text-xs text-neutral-400 mt-0.5">
                              {waypoint.subtitle}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}

              <View className="ml-1.5 h-4 w-0.5 bg-neutral-200" />

              {/* Destination */}
              <View className="flex-row items-start gap-3">
                <View className="items-center pt-1">
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: Colors.accent[500] }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900">
                    {trip.destinationName}
                  </Text>
                  {!!trip.destinationSubtitle && (
                    <Text className="text-xs text-neutral-400 mt-0.5">
                      {trip.destinationSubtitle}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleOpenMap}
              className="flex-row items-center justify-between mt-4 pt-3 border-t border-neutral-100"
            >
              <View className="flex-row items-center gap-2">
                <Map size={16} color={Colors.primary[600]} />
                <Text className="text-sm font-medium text-primary-600">
                  Ver ruta en el mapa
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.primary[400]} />
            </TouchableOpacity>
          </Card>

          {/* Passenger: My booking status */}
          {!isDriver && myBooking && (
            <Card>
              <View className="flex-row items-center gap-2 mb-3">
                <Ticket size={16} color={Colors.primary[600]} />
                <Text className="text-sm font-semibold text-neutral-700">
                  Mi reserva
                </Text>
              </View>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm text-neutral-600">Estado</Text>
                <Badge
                  label={BOOKING_DETAIL_BADGE[myBooking.status].label}
                  variant={BOOKING_DETAIL_BADGE[myBooking.status].variant}
                />
              </View>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-neutral-600">Asientos</Text>
                <Text className="text-sm font-semibold text-neutral-900">
                  {myBooking.seatsBooked}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-neutral-600">Total</Text>
                <Text className="text-sm font-bold text-primary-700">
                  {formatCurrency(
                    trip.pricePerSeat * myBooking.seatsBooked,
                    trip.currency,
                  )}
                </Text>
              </View>

              {(myBooking.status === 'PENDING' ||
                myBooking.status === 'ACCEPTED') && (
                  <TouchableOpacity
                    onPress={handleCancelBooking}
                    disabled={actionLoading === 'cancel-booking'}
                    className="mt-4 pt-3 border-t border-neutral-100"
                  >
                    <Text
                      className={`text-sm font-medium text-center ${actionLoading === 'cancel-booking'
                          ? 'text-neutral-400'
                          : 'text-red-500'
                        }`}
                    >
                      {actionLoading === 'cancel-booking'
                        ? 'Cancelando...'
                        : 'Cancelar reserva'}
                    </Text>
                  </TouchableOpacity>
                )}

              {myBooking.status === 'PENDING' && (
                <View className="mt-3 bg-amber-50 rounded-xl p-3">
                  <Text className="text-xs text-amber-700 text-center leading-4">
                    Tu solicitud está pendiente. El conductor la revisará
                    pronto.
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Passenger: Book button */}
          {!isDriver && canBook && (
            <Button
              onPress={() => setBookVisible(true)}
              size="lg"
              icon={<Ticket size={18} color="white" />}
            >
              Reservar cupo —{' '}
              {formatCurrency(trip.pricePerSeat, trip.currency)} / asiento
            </Button>
          )}

          {/* No seats left */}
          {!isDriver &&
            trip.status === 'PUBLISHED' &&
            trip.availableSeats === 0 &&
            !myBooking && (
              <View className="bg-neutral-100 rounded-2xl p-4 items-center">
                <Text className="text-sm font-medium text-neutral-500">
                  Sin cupos disponibles
                </Text>
              </View>
            )}

          {/* Trip details */}
          <Card>
            <Text className="text-sm font-semibold text-neutral-700 mb-3">
              Detalles del viaje
            </Text>
            <DetailRow
              icon={<Clock size={16} color={Colors.neutral[400]} />}
              label="Salida"
              value={formatDeparture(trip.departureAt)}
            />
            {trip.estimatedArrivalTime && (
              <DetailRow
                icon={<Clock size={16} color={Colors.accent[500]} />}
                label="Llegada estimada"
                value={formatDeparture(trip.estimatedArrivalTime)}
              />
            )}
            <DetailRow
              icon={<Users size={16} color={Colors.neutral[400]} />}
              label="Asientos"
              value={`${trip.availableSeats} disponibles`}
            />
            <View className="flex-row items-start gap-3 py-2.5 border-b border-neutral-100">
              <View className="mt-0.5">
                <DollarSign size={16} color={Colors.neutral[400]} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-neutral-400 mb-0.5">
                  Precio y equipaje
                </Text>
                <Text className="text-sm font-medium text-neutral-900">
                  {formatCurrency(trip.pricePerSeat, trip.currency)}
                  {trip.allowsLuggage
                    ? ' • Equipaje permitido'
                    : ' • Sin equipaje'}
                </Text>
              </View>
            </View>
            {trip.tripType === 'ROUTINE' && (
              <DetailRow
                icon={
                  <GraduationCap size={16} color={Colors.neutral[400]} />
                }
                label="Solo estudiantes"
                value={trip.studentsOnly ? 'Sí' : 'No'}
              />
            )}
          </Card>

          {/* Vehicle */}
          {vehicle && (
            <Card>
              <View className="flex-row items-center gap-2 mb-1">
                <Car size={16} color={Colors.neutral[400]} />
                <Text className="text-sm font-semibold text-neutral-700">
                  Vehículo
                </Text>
              </View>
              <Text className="text-base font-semibold text-neutral-900 mt-2">
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </Text>
              <Text className="text-sm text-neutral-500 mt-0.5">
                {vehicle.color}
              </Text>
            </Card>
          )}

          {/* Driver: Passenger bookings list */}
          {isDriver && (
            <Card>
              <View className="flex-row items-center gap-2 mb-3">
                <UserCheck size={18} color={Colors.primary[600]} />
                <Text className="text-sm font-semibold text-neutral-700">
                  Solicitudes de pasajeros
                </Text>
                {bookings.length > 0 && (
                  <View className="ml-auto bg-primary-100 rounded-full px-2 py-0.5">
                    <Text className="text-xs font-bold text-primary-700">
                      {bookings.length}
                    </Text>
                  </View>
                )}
              </View>

              {bookings.length === 0 ? (
                <View className="items-center py-6">
                  <View className="w-14 h-14 rounded-full bg-neutral-100 items-center justify-center mb-3">
                    <UserCheck size={28} color={Colors.neutral[300]} />
                  </View>
                  <Text className="text-sm font-medium text-neutral-600 mb-1">
                    Sin solicitudes aún
                  </Text>
                  <Text className="text-xs text-neutral-400 text-center px-4">
                    Cuando un pasajero solicite un cupo, aparecerá aquí.
                  </Text>
                </View>
              ) : (
                bookings.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    tripStatus={trip.status}
                    actionLoading={actionLoading}
                    onAccept={() => handleBookingAction(b.id, 'accept')}
                    onReject={() => handleBookingAction(b.id, 'reject')}
                    onBoard={() => handleBookingAction(b.id, 'board')}
                    onNoShow={() => handleBookingAction(b.id, 'noshow')}
                  />
                ))
              )}
            </Card>
          )}

          {/* Driver: Action buttons */}
          {isDriver && (
            <View className="gap-2">
              {trip.status === 'DRAFT' && (
                <Button
                  onPress={handlePublish}
                  loading={actionLoading === 'Publicar'}
                  icon={<ChevronRight size={18} color="white" />}
                >
                  Publicar viaje
                </Button>
              )}
              {trip.status === 'PUBLISHED' && (
                <Button
                  onPress={handleStart}
                  loading={actionLoading === 'Iniciar viaje'}
                  icon={<Play size={16} color="white" />}
                >
                  Iniciar viaje
                </Button>
              )}
              {trip.status === 'IN_PROGRESS' && (
                <Button
                  onPress={handleComplete}
                  loading={actionLoading === 'Completar'}
                  icon={<CheckCircle size={16} color="white" />}
                >
                  Completar viaje
                </Button>
              )}
              {(trip.status === 'DRAFT' ||
                trip.status === 'PUBLISHED') && (
                  <Button
                    variant="danger"
                    onPress={handleCancel}
                    loading={actionLoading === 'Cancelar viaje'}
                    icon={<XCircle size={16} color="white" />}
                  >
                    Cancelar viaje
                  </Button>
                )}
            </View>
          )}

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      )}

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
    </View>
  );
}
