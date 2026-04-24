import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Calendar, Users, Settings2, Clock, AlertTriangle } from 'lucide-react-native';
import { Screen, Button, Card } from '@/components/ui';
import { RoutePreview } from '@/components/RoutePreview';
import { usePublishRoutineTrip } from '@/hooks/usePublishRoutineTrip';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import { Colors } from '@/constants/colors';
import type { RecurrenceDay } from '@/types/api';

// ── Formatting helpers ──

const DAY_SHORT: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

function formatDays(days: RecurrenceDay[] = []): string {
  if (!days.length) return '—';
  return days.map((d) => DAY_SHORT[d]).join(' · ');
}

function formatCOP(amount: number | undefined): string {
  if (amount == null) return '—';
  return `$${amount.toLocaleString('es-CO')} COP`;
}

function metersLabel(m: number | undefined): string {
  if (!m) return '—';
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function secondsLabel(s: number | undefined): string {
  if (!s) return '—';
  return `${Math.round(s / 60)} min`;
}

// ── Error messages returned by the backend for 422 ──

function humanizePublishError(error: unknown): string {
  // Axios wraps backend body in error.response.data; prefer that over error.message
  let msg = '';
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosResponse = (error as { response?: { data?: { message?: string } } }).response;
    msg = axiosResponse?.data?.message ?? '';
  }
  if (!msg) {
    msg = error instanceof Error ? error.message : String(error);
  }

  if (msg.includes('ARRIVAL_TIME_NOT_FEASIBLE')) {
    const match = msg.match(/(\d{2}:\d{2})/g);
    if (match && match.length >= 2) {
      return `La ruta estimada llega a las ${match[0]}, pero la hora límite es ${match[1]}. Ajusta la hora de llegada en el Paso 2.`;
    }
    return 'La ruta estimada no alcanza a llegar antes de la hora límite. Ajusta el horario.';
  }
  if (msg.includes('VEHICLE_SOAT_EXPIRED')) {
    return 'El SOAT del vehículo seleccionado está vencido. Ve a tus vehículos para actualizarlo.';
  }
  if (msg.includes('DUPLICATE_ROUTINE_TRIP')) {
    return 'Ya tienes una ruta activa con el mismo destino y horario. Revisa tus rutas activas.';
  }
  return msg || 'Ocurrió un error al publicar. Intenta de nuevo.';
}

// ── Section header ──

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string; }) {
  return (
    <View className="flex-row items-center mb-3">
      {icon}
      <Text className="text-sm font-semibold text-neutral-700 ml-2">{label}</Text>
    </View>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const {
    formData,
    isSubmitting,
    lastCreatedId,
    saveDraft,
    publishDraft,
    resetForm,
  } = usePublishRoutineTrip();
  const { fetchMine } = useRoutineTripsStore();
  const [publishError, setPublishError] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    try {
      const trip = await saveDraft();
      await fetchMine();
      resetForm();
      router.replace(`/routine/${trip.id}` as never);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al guardar borrador');
    }
  };

  const handlePublish = async () => {
    setPublishError(null);
    try {
      let tripId = lastCreatedId;
      if (!tripId) {
        const trip = await saveDraft();
        tripId = trip.id;
      }
      await publishDraft(tripId);
      await fetchMine();
      resetForm();
      router.replace(`/routine/${tripId}` as never);
    } catch (err) {
      setPublishError(humanizePublishError(err));
    }
  };

  const recurrenceDays = (formData.recurrenceDays as RecurrenceDay[]) ?? [];

  return (
    <Screen edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-neutral-900 mb-1">Revisa tu ruta</Text>
        <Text className="text-base text-neutral-500 mb-6">
          Confirma los detalles antes de guardar o publicar.
        </Text>

        {/* 1. Route */}
        <Card className="p-4 mb-4">
          <SectionHeader
            icon={<MapPin size={16} color={Colors.primary[500]} />}
            label="Ruta"
          />
          {formData.originName && formData.destinationName ? (
            <RoutePreview
              originName={formData.originName}
              originSubtitle={formData.originSubtitle}
              destinationName={formData.destinationName}
              destinationSubtitle={formData.destinationSubtitle}
            />
          ) : (
            <Text className="text-sm text-neutral-400 italic">Sin definir</Text>
          )}
          {formData.routePolyline?.length ? (
            <Text className="text-xs text-primary-600 mt-2">✓ Ruta trazada</Text>
          ) : null}
        </Card>

        {/* 2. Schedule */}
        <Card className="p-4 mb-4">
          <SectionHeader
            icon={<Calendar size={16} color={Colors.primary[500]} />}
            label="Horario"
          />
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Días</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formatDays(recurrenceDays)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Hora de salida</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.departureTime ?? '—'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Hora límite llegada</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.requiredArrivalTime ?? '—'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Vigencia desde</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.validFrom ?? '—'}
              </Text>
            </View>
            {formData.validUntil ? (
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Vigencia hasta</Text>
                <Text className="text-sm font-medium text-neutral-800">{formData.validUntil}</Text>
              </View>
            ) : null}
            {formData.studentsOnly ? (
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Acceso</Text>
                <Text className="text-sm font-medium text-primary-600">Solo estudiantes</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* 3. Seats & price */}
        <Card className="p-4 mb-4">
          <SectionHeader
            icon={<Users size={16} color={Colors.primary[500]} />}
            label="Cupos y precio"
          />
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Cupos disponibles</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.availableSeats ?? '—'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Precio por cupo</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formatCOP(formData.pricePerSeat)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Equipaje</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.allowsLuggage ? 'Permitido' : 'No permitido'}
              </Text>
            </View>
          </View>
        </Card>

        {/* 4. Pickup config */}
        <Card className="p-4 mb-4">
          <SectionHeader
            icon={<Settings2 size={16} color={Colors.primary[500]} />}
            label="Configuración de recogida"
          />
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Recogida personalizada</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.allowsCustomPickup ? 'Habilitada' : 'Deshabilitada'}
              </Text>
            </View>
            {formData.allowsCustomPickup ? (
              <>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-500">Desviación máx.</Text>
                  <Text className="text-sm font-medium text-neutral-800">
                    {metersLabel(formData.maxPickupDeviationMeters)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-500">Tiempo extra máx.</Text>
                  <Text className="text-sm font-medium text-neutral-800">
                    {secondsLabel(formData.maxTimeOverheadSeconds)}
                  </Text>
                </View>
              </>
            ) : null}
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Aprobación automática</Text>
              <Text className="text-sm font-medium text-neutral-800">
                {formData.autoApproveBookings ? 'Activada' : 'Manual'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Waypoints note */}
        <View className="flex-row items-center bg-primary-50 rounded-2xl p-4 mb-2">
          <Clock size={16} color={Colors.primary[600]} />
          <Text className="text-sm text-primary-700 ml-2 flex-1">
            Puedes agregar paradas predefinidas después de crear la plantilla.
          </Text>
        </View>

        {/* Publish error */}
        {publishError ? (
          <View className="flex-row items-start bg-red-50 rounded-2xl p-4 mb-2 mt-2">
            <AlertTriangle size={16} color={Colors.semantic.error} style={{ marginTop: 2 }} />
            <Text className="text-sm text-red-700 ml-2 flex-1">{publishError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="px-5 pb-6 pt-3 border-t border-neutral-100 bg-white gap-3">
        <Button
          onPress={handlePublish}
          loading={isSubmitting}
        >
          Guardar y publicar
        </Button>
        <Button
          variant="outline"
          onPress={handleSaveDraft}
          loading={isSubmitting}
        >
          Guardar como borrador
        </Button>
      </View>
    </Screen>
  );
}
