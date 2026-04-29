import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronRight, AlertTriangle, XCircle } from 'lucide-react-native';
import { Screen, Button, Spinner, EmptyState } from '@/components/ui';
import { useRoutineOccurrences } from '@/hooks/useRoutineOccurrences';
import { Colors } from '@/constants/colors';
import type { TripResponse, TripStatus } from '@/types/api';

// ── Helpers ──

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function formatOccurrenceDate(dateStr: string): { dayName: string; dayNum: string; monthName: string; } {
  const d = new Date(dateStr);
  return {
    dayName: DAY_NAMES[d.getDay()],
    dayNum: String(d.getDate()).padStart(2, '0'),
    monthName: MONTH_NAMES[d.getMonth()],
  };
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const STATUS_LABELS: Record<TripStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<TripStatus, { bg: string; text: string; }> = {
  DRAFT: { bg: 'bg-neutral-100', text: 'text-neutral-600' },
  PUBLISHED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-green-100', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

// ── Occurrence Row ──

function OccurrenceRow({
  occurrence,
  onView,
  onCancel,
}: {
  occurrence: TripResponse;
  onView: () => void;
  onCancel: () => void;
}) {
  const { dayName, dayNum, monthName } = formatOccurrenceDate(occurrence.departureAt);
  const time = formatTime(occurrence.departureAt);
  const today = isToday(occurrence.departureAt);
  const colors = STATUS_COLORS[occurrence.status];
  const isCancellable =
    occurrence.status !== 'CANCELLED' &&
    occurrence.status !== 'COMPLETED' &&
    new Date(occurrence.departureAt) > new Date();

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ borderWidth: 1, borderColor: today ? Colors.primary[200] : Colors.neutral[100] }}
    >
      <View className="flex-row items-center gap-3">
        {/* Date badge */}
        <View
          className="w-14 items-center rounded-xl py-2"
          style={{ backgroundColor: today ? Colors.primary[50] : Colors.neutral[50] }}
        >
          <Text
            className="text-xs font-medium"
            style={{ color: today ? Colors.primary[500] : Colors.neutral[500] }}
          >
            {dayName}
          </Text>
          <Text
            className="text-xl font-bold"
            style={{ color: today ? Colors.primary[700] : Colors.neutral[900] }}
          >
            {dayNum}
          </Text>
          <Text
            className="text-xs"
            style={{ color: today ? Colors.primary[500] : Colors.neutral[500] }}
          >
            {monthName}
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            {today && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: Colors.primary[500] }}
              >
                <Text className="text-white text-xs font-semibold">Hoy</Text>
              </View>
            )}
            <View className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
              <Text className={`text-xs font-medium ${colors.text}`}>
                {STATUS_LABELS[occurrence.status]}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-neutral-700">
            Salida: <Text className="font-semibold">{time}</Text>
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {occurrence.availableSeats} cupo{occurrence.availableSeats !== 1 ? 's' : ''} disponible{occurrence.availableSeats !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Actions */}
        <View className="gap-2">
          <TouchableOpacity
            onPress={onView}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: Colors.primary[50] }}
          >
            <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
              Ver
            </Text>
            <ChevronRight size={12} color={Colors.primary[600]} />
          </TouchableOpacity>

          {isCancellable && (
            <TouchableOpacity
              onPress={onCancel}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50"
            >
              <XCircle size={12} color="#dc2626" />
              <Text className="text-xs font-semibold text-red-700">Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Main screen ──

export default function OccurrencesScreen() {
  const { id: routineTripId } = useLocalSearchParams<{ id: string; }>();
  const router = useRouter();

  const { occurrences, isLoading, error, refetch, cancelOccurrence } =
    useRoutineOccurrences(routineTripId ?? '');

  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<TripResponse | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleView = (tripId: string) => {
    router.push({
      pathname: '/routine/[id]/occurrence/[tripId]',
      params: { id: routineTripId ?? '', tripId },
    } as any);
  };

  const handlePressCancel = (occurrence: TripResponse) => {
    setCancelTarget(occurrence);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    const hasActiveBookings = cancelTarget.availableSeats < (cancelTarget as any).totalSeats;
    if (hasActiveBookings && !cancelReason.trim()) {
      Alert.alert(
        'Motivo requerido',
        'Esta ocurrencia tiene pasajeros confirmados. Por favor ingresa un motivo.',
      );
      return;
    }

    setIsCancelling(true);
    try {
      await cancelOccurrence(cancelTarget.id);
      setCancelTarget(null);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'No se pudo cancelar la ocurrencia',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Separate upcoming (non-cancelled, future or today) from past/cancelled
  const upcoming = occurrences.filter(
    (o) => o.status !== 'CANCELLED' && new Date(o.departureAt) >= new Date(new Date().setHours(0, 0, 0, 0)),
  );
  const past = occurrences.filter(
    (o) => o.status === 'CANCELLED' || new Date(o.departureAt) < new Date(new Date().setHours(0, 0, 0, 0)),
  );

  return (
    <Screen safe={false}>
      {isLoading && occurrences.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error && occurrences.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">{error}</Text>
          <TouchableOpacity onPress={refetch}>
            <Text className="text-sm font-semibold" style={{ color: Colors.primary[600] }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : occurrences.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} color={Colors.neutral[300]} />}
          title="Sin ocurrencias"
          description="Cuando la ruta esté activa, aquí aparecerán los próximos 14 días de operación."
        />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {upcoming.length > 0 && (
            <>
              <Text className="text-sm font-semibold text-neutral-700 mb-3">Próximas</Text>
              {upcoming.map((o) => (
                <OccurrenceRow
                  key={o.id}
                  occurrence={o}
                  onView={() => handleView(o.id)}
                  onCancel={() => handlePressCancel(o)}
                />
              ))}
            </>
          )}

          {past.length > 0 && (
            <>
              <Text className="text-sm font-semibold text-neutral-500 mt-4 mb-3">Pasadas</Text>
              {past.map((o) => (
                <OccurrenceRow
                  key={o.id}
                  occurrence={o}
                  onView={() => handleView(o.id)}
                  onCancel={() => handlePressCancel(o)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Cancel modal */}
      <Modal
        visible={cancelTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelTarget(null)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-8">
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              Cancelar ocurrencia
            </Text>

            {cancelTarget && cancelTarget.availableSeats === 0 && (
              <View className="flex-row items-start gap-2 bg-yellow-50 rounded-xl px-3 py-3 mb-4">
                <AlertTriangle size={16} color="#b45309" />
                <Text className="text-xs text-yellow-800 flex-1 leading-5">
                  Esta ocurrencia tiene pasajeros confirmados. Se les notificará de la cancelación.
                </Text>
              </View>
            )}

            <Text className="text-sm font-medium text-neutral-700 mb-1.5">
              Motivo{' '}
              <Text className="text-neutral-400 font-normal">(opcional)</Text>
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Ej: Imprevisto personal, condición climática…"
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={3}
              className="bg-neutral-50 rounded-xl p-3 text-sm text-neutral-800 mb-5"
              style={{ minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.neutral[200] }}
            />

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setCancelTarget(null)}
                disabled={isCancelling}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onPress={handleConfirmCancel}
                loading={isCancelling}
              >
                Cancelar día
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
