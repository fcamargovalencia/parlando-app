import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  Map,
  Users,
  Route,
  XCircle,
} from 'lucide-react-native';
import { Button, EmptyState, Spinner } from '@/components/ui';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import { WaypointListItem } from '@/components/routine/WaypointListItem';
import { OccurrenceMapView } from '@/components/routine/OccurrenceMapView';
import { OccurrencePassengerCard } from '@/components/routine/OccurrencePassengerCard';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useOccurrenceDetail } from '@/hooks/useOccurrenceDetail';
import { Colors } from '@/constants/colors';
import type { TripStatus } from '@/types/api';

// ── Helpers ──

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; bgClass: string; textClass: string; }> = {
  DRAFT: { label: 'Borrador', bgClass: 'bg-neutral-100', textClass: 'text-neutral-600' },
  PUBLISHED: { label: 'Publicado', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  IN_PROGRESS: { label: 'En progreso', bgClass: 'bg-green-100', textClass: 'text-green-700' },
  COMPLETED: { label: 'Completado', bgClass: 'bg-neutral-100', textClass: 'text-neutral-500' },
  CANCELLED: { label: 'Cancelado', bgClass: 'bg-red-100', textClass: 'text-red-700' },
};

// ── Screen ──

export default function OccurrenceDetailScreen() {
  const { id: routineTripId, tripId } = useLocalSearchParams<{ id: string; tripId: string; }>();
  const router = useRouter();

  const {
    occurrence,
    routineTrip,
    waypoints,
    bookings,
    subscriptions,
    orderedStops,
    isLoading,
    error,
    isFutureOccurrence,
    uiState,
    dispatch,
    actions,
  } = useOccurrenceDetail(routineTripId, tripId);

  const { activeModal, selectedBookingId, isSubmitting, pendingOverrideLat, pendingOverrideLng, pendingOverrideName } = uiState;

  const passengerStops = orderedStops
    .map((stop, i) => ({ stop, index: i }))
    .filter(({ stop }) => stop.kind === 'passenger');

  const waypointStops = orderedStops.filter((s) => s.kind === 'waypoint');

  const isCancellable =
    isFutureOccurrence &&
    occurrence?.status !== 'CANCELLED' &&
    occurrence?.status !== 'COMPLETED';

  // ── Confirm no-show handler ──
  const handleConfirmNoShow = async () => {
    if (!selectedBookingId) return;
    await actions.markNoShow(selectedBookingId);
  };

  // ── Confirm override pickup handler ──
  const handleConfirmOverride = async () => {
    if (!selectedBookingId || pendingOverrideLat == null || pendingOverrideLng == null) return;
    await actions.overridePickup(
      selectedBookingId,
      pendingOverrideLat,
      pendingOverrideLng,
      pendingOverrideName ?? 'Punto personalizado',
    );
  };

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !occurrence || !routineTrip) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <EmptyState
            title="No se pudo cargar"
            description={error ?? 'Ocurrencia no encontrada'}
            actionLabel="Reintentar"
            onAction={actions.refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[occurrence.status];

  return (
    <SafeAreaView style={styles.flex}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={Colors.dark.DEFAULT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerDate}>{formatDate(occurrence.departureAt)}</Text>
          <View style={styles.headerMeta}>
            <View className={`px-2 py-0.5 rounded-full ${statusConfig.bgClass}`}>
              <Text className={`text-xs font-medium ${statusConfig.textClass}`}>{statusConfig.label}</Text>
            </View>
            <Text style={styles.headerTime}>Salida {formatTime(occurrence.departureAt)}</Text>
          </View>
        </View>
        {isCancellable && (
          <TouchableOpacity
            onPress={() => dispatch({ type: 'OPEN_CANCEL_CONFIRM' })}
            style={styles.cancelDayBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <XCircle size={18} color={Colors.semantic.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Map (40% of screen) ── */}
      <View style={styles.mapContainer}>
        <OccurrenceMapView
          routeLine={routineTrip.routeLine ?? []}
          origin={{ latitude: routineTrip.originLatitude, longitude: routineTrip.originLongitude, name: routineTrip.originName }}
          destination={{ latitude: routineTrip.destinationLatitude, longitude: routineTrip.destinationLongitude, name: routineTrip.destinationName }}
          orderedStops={orderedStops}
          fitOnMount
        />
        {/* Fullscreen map button */}
        <TouchableOpacity
          onPress={() => dispatch({ type: 'OPEN_MAP' })}
          style={styles.fullscreenBtn}
        >
          <Map size={16} color={Colors.white} />
          <Text style={styles.fullscreenBtnText}>Mapa completo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scroll content (60%) ── */}
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Waypoints section */}
        {waypointStops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Route size={16} color={Colors.primary[500]} />
              <Text style={styles.sectionTitle}>Paradas de la ruta</Text>
            </View>
            {waypointStops.map((stop) => {
              if (stop.kind !== 'waypoint') return null;
              return (
                <WaypointListItem
                  key={stop.data.id}
                  waypoint={stop.data}
                  showDragHandle={false}
                  showDelete={false}
                />
              );
            })}
          </View>
        )}

        {/* Passengers section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={16} color={Colors.primary[500]} />
            <Text style={styles.sectionTitle}>
              Pasajeros hoy ({bookings.filter((b) => b.status === 'ACCEPTED' || b.status === 'BOARDED').length})
            </Text>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyPassengers}>
              <Text style={styles.emptyText}>Sin pasajeros para este día</Text>
            </View>
          ) : (
            passengerStops.map(({ stop, index }, i) => {
              if (stop.kind !== 'passenger') return null;
              const sub = subscriptions.find((s) => s.id === stop.booking.subscriptionId);
              if (!sub) return null;
              return (
                <OccurrencePassengerCard
                  key={stop.booking.id}
                  booking={stop.booking}
                  subscription={sub}
                  stopIndex={i + 1}
                  pickupLat={stop.pickupLat}
                  pickupLng={stop.pickupLng}
                  pickupName={sub.customPickupName}
                  occurrenceIsFuture={isFutureOccurrence}
                  onMarkNoShow={(id) => dispatch({ type: 'OPEN_NO_SHOW', payload: { bookingId: id } })}
                  onOverridePickup={(id) => dispatch({ type: 'OPEN_OVERRIDE_PICKUP', payload: { bookingId: id } })}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Fullscreen map modal ── */}
      <Modal
        visible={activeModal === 'map'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      >
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => dispatch({ type: 'CLOSE_MODAL' })}>
              <ArrowLeft size={22} color={Colors.dark.DEFAULT} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ruta del día</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.flex}>
            <OccurrenceMapView
              routeLine={routineTrip.routeLine ?? []}
              origin={{ latitude: routineTrip.originLatitude, longitude: routineTrip.originLongitude, name: routineTrip.originName }}
              destination={{ latitude: routineTrip.destinationLatitude, longitude: routineTrip.destinationLongitude, name: routineTrip.destinationName }}
              orderedStops={orderedStops}
              fitOnMount
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── No-show confirm modal ── */}
      <Modal
        visible={activeModal === 'noShowConfirm'}
        animationType="fade"
        transparent
        onRequestClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      >
        <View style={styles.overlayCenter}>
          <View style={styles.confirmCard}>
            <AlertTriangle size={32} color={Colors.semantic.warning} style={{ marginBottom: 12 }} />
            <Text style={styles.confirmTitle}>¿Marcar como no presentado?</Text>
            <Text style={styles.confirmBody}>
              Esta acción afecta solo esta ocurrencia. La suscripción del pasajero sigue activa.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                variant="outline"
                onPress={() => dispatch({ type: 'CLOSE_MODAL' })}
                style={styles.confirmBtn}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirmNoShow}
                disabled={isSubmitting}
                style={styles.confirmBtn}
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Override pickup modal ── */}
      {activeModal === 'overridePickup' && (
        <LocationPickerModal
          visible
          onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
          onConfirm={(loc: SelectedLocation) => {
            dispatch({ type: 'SET_OVERRIDE_LOCATION', payload: { lat: loc.latitude, lng: loc.longitude, name: loc.name } });
            handleConfirmOverride();
          }}
          routeLine={routineTrip.routeLine}
          title="Cambiar punto de recogida"
        />
      )}

      {/* ── Cancel occurrence confirm modal ── */}
      <Modal
        visible={activeModal === 'cancelConfirm'}
        animationType="fade"
        transparent
        onRequestClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      >
        <View style={styles.overlayCenter}>
          <View style={styles.confirmCard}>
            <XCircle size={32} color={Colors.semantic.error} style={{ marginBottom: 12 }} />
            <Text style={styles.confirmTitle}>¿Cancelar este día?</Text>
            <Text style={styles.confirmBody}>
              Se cancelará solo esta ocurrencia. Los pasajeros serán notificados.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                variant="outline"
                onPress={() => dispatch({ type: 'CLOSE_MODAL' })}
                style={styles.confirmBtn}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                onPress={actions.cancelOccurrence}
                disabled={isSubmitting}
                style={styles.confirmBtn}
              >
                {isSubmitting ? 'Cancelando...' : 'Cancelar día'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    backgroundColor: Colors.white,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerDate: { fontSize: 16, fontWeight: '600', color: Colors.dark.DEFAULT },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  headerTime: { fontSize: 12, color: Colors.neutral[500] },
  cancelDayBtn: { padding: 4 },
  mapContainer: { height: '40%', position: 'relative' },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fullscreenBtnText: { color: Colors.white, fontSize: 12, fontWeight: '500' },
  scrollContent: { padding: 16 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.neutral[800] },
  emptyPassengers: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  emptyText: { fontSize: 14, color: Colors.neutral[400] },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.dark.DEFAULT },
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark.DEFAULT, textAlign: 'center', marginBottom: 8 },
  confirmBody: { fontSize: 14, color: Colors.neutral[600], textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1 },
});
