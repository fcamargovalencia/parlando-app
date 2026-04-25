import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Button, Spinner, EmptyState, FilterTabs } from '@/components/ui';
import { SubscriptionRequestCard } from '@/components/routine/SubscriptionRequestCard';
import { RoutineRouteMapModal } from '@/components/routine/RoutineRouteMapModal';
import { useSubscriptionRequests } from '@/hooks/useSubscriptionRequests';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import { Colors } from '@/constants/colors';
import type { RoutineSubscriptionResponse, SubscriptionStatus } from '@/types/api';

type TabKey = 'pending' | 'active' | 'paused' | 'history';

const TAB_STATUSES: Record<TabKey, SubscriptionStatus[]> = {
  pending: ['PENDING'],
  active: ['ACCEPTED'],
  paused: ['PAUSED'],
  history: ['COMPLETED', 'CANCELLED'],
};

export default function SubscriptionsScreen() {
  const { id: routineTripId } = useLocalSearchParams<{ id: string; }>();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [refreshing, setRefreshing] = useState(false);

  // Accept modal
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptNotes, setAcceptNotes] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Map modal
  const [mapSub, setMapSub] = useState<RoutineSubscriptionResponse | null>(null);

  const { subscriptions, pendingCount, isLoading, refetch, accept, reject } =
    useSubscriptionRequests(routineTripId ?? '');

  const fetchForTrip = useRoutineSubscriptionsStore((s) => s.fetchForTrip);
  const clearTripSubscriptions = useRoutineSubscriptionsStore((s) => s.clearTripSubscriptions);
  const routineTrip = useRoutineTripsStore((s) => s.selectedRoutineTrip);

  useEffect(() => {
    if (routineTripId) fetchForTrip(routineTripId);
    return () => {
      if (routineTripId) clearTripSubscriptions(routineTripId);
    };
  }, [routineTripId, fetchForTrip, clearTripSubscriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (routineTripId) await fetchForTrip(routineTripId);
    setRefreshing(false);
  };

  // ── Filtered list ──

  const filtered = subscriptions.filter((s: RoutineSubscriptionResponse) =>
    TAB_STATUSES[activeTab].includes(s.status),
  );

  const tabs = [
    { key: 'pending' as TabKey, label: 'Pendientes', count: pendingCount },
    {
      key: 'active' as TabKey,
      label: 'Activas',
      count: subscriptions.filter((s) => s.status === 'ACCEPTED').length,
    },
    {
      key: 'paused' as TabKey,
      label: 'Pausadas',
      count: subscriptions.filter((s) => s.status === 'PAUSED').length,
    },
    { key: 'history' as TabKey, label: 'Historial' },
  ];

  // ── Accept flow ──

  const handlePressAccept = (id: string) => {
    setAcceptingId(id);
    setAcceptNotes('');
    setAcceptModalVisible(true);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingId || !routineTripId) return;
    setIsAccepting(true);
    try {
      await accept(acceptingId, routineTripId, acceptNotes.trim() || undefined);
      setAcceptModalVisible(false);
      Alert.alert(
        'Solicitud aceptada',
        'Suscripción aceptada. Los bookings se están generando...',
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo aceptar');
    } finally {
      setIsAccepting(false);
    }
  };

  // ── Map flow ──

  const handleViewMap = (id: string) => {
    const sub = subscriptions.find((s: RoutineSubscriptionResponse) => s.id === id);
    if (sub) setMapSub(sub);
  };

  // ── Reject flow ──

  const handlePressReject = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingId || !routineTripId) return;
    if (!rejectReason.trim()) {
      Alert.alert('Motivo requerido', 'Por favor ingresa un motivo para el rechazo.');
      return;
    }
    setIsRejecting(true);
    try {
      await reject(rejectingId, routineTripId, rejectReason.trim());
      setRejectModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo rechazar');
    } finally {
      setIsRejecting(false);
    }
  };

  // ── Render ──

  return (
    <Screen safe={false}>
      <FilterTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />

      {isLoading && !refreshing && subscriptions.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {filtered.length === 0 ? (
            <EmptyState
              title={
                activeTab === 'pending'
                  ? 'Sin solicitudes pendientes'
                  : activeTab === 'active'
                    ? 'Sin suscripciones activas'
                    : activeTab === 'paused'
                      ? 'Sin suscripciones pausadas'
                      : 'Sin historial'
              }
              description={
                activeTab === 'pending'
                  ? 'Cuando un pasajero solicite suscribirse, aparecerá aquí.'
                  : undefined
              }
            />
          ) : (
            filtered.map((sub: RoutineSubscriptionResponse) => (
              <SubscriptionRequestCard
                key={sub.id}
                subscription={sub}
                showActions={activeTab === 'pending'}
                onAccept={handlePressAccept}
                onReject={handlePressReject}
                onViewMap={routineTrip ? handleViewMap : undefined}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Accept modal */}
      <Modal
        visible={acceptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAcceptModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-8">
            <Text className="text-lg font-bold text-neutral-900 mb-1">Aceptar suscripción</Text>
            <Text className="text-sm text-neutral-500 mb-4">
              Al aceptar, se generarán bookings para todas las ocurrencias futuras.
            </Text>
            <Text className="text-sm font-medium text-neutral-700 mb-1.5">
              Notas para el pasajero{' '}
              <Text className="text-neutral-400 font-normal">(opcional)</Text>
            </Text>
            <TextInput
              value={acceptNotes}
              onChangeText={setAcceptNotes}
              placeholder="Ej: Te esperaré en la parada norte…"
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={3}
              className="border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-900 bg-neutral-50 mb-5"
              style={{ textAlignVertical: 'top' }}
            />
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                size="md"
                onPress={() => setAcceptModalVisible(false)}
                style={{ flex: 1 }}
                disabled={isAccepting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onPress={handleConfirmAccept}
                loading={isAccepting}
                disabled={isAccepting}
                style={{ flex: 1 }}
              >
                Aceptar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map modal */}
      {mapSub && routineTrip && (
        <RoutineRouteMapModal
          visible={!!mapSub}
          onClose={() => setMapSub(null)}
          originName={routineTrip.originName}
          originLatitude={routineTrip.originLatitude}
          originLongitude={routineTrip.originLongitude}
          destinationName={routineTrip.destinationName}
          destinationLatitude={routineTrip.destinationLatitude}
          destinationLongitude={routineTrip.destinationLongitude}
          routeLine={routineTrip.routeLine}
          suggestedStop={
            mapSub.pickupType === 'SUGGESTED' &&
              mapSub.customPickupLatitude != null &&
              mapSub.customPickupLongitude != null
              ? {
                id: mapSub.id,
                latitude: mapSub.customPickupLatitude,
                longitude: mapSub.customPickupLongitude,
                name: mapSub.customPickupName ?? 'Punto sugerido',
              }
              : undefined
          }
        />
      )}

      {/* Reject modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-8">
            <Text className="text-lg font-bold text-neutral-900 mb-1">Rechazar solicitud</Text>
            <Text className="text-sm text-neutral-500 mb-4">
              El pasajero recibirá una notificación con el motivo.
            </Text>
            <Text className="text-sm font-medium text-neutral-700 mb-1.5">
              Motivo del rechazo <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ej: No tengo cupos disponibles para los días solicitados"
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={3}
              className="border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-900 bg-neutral-50 mb-5"
              style={{ textAlignVertical: 'top' }}
            />
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                size="md"
                onPress={() => setRejectModalVisible(false)}
                style={{ flex: 1 }}
                disabled={isRejecting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="md"
                onPress={handleConfirmReject}
                loading={isRejecting}
                disabled={isRejecting}
                style={{ flex: 1 }}
              >
                Rechazar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
