import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Clock,
  Users,
  Settings2,
  ChevronRight,
  Plus,
  AlertTriangle,
} from 'lucide-react-native';
import { Button, Card, Spinner } from '@/components/ui';
import { RoutePreview } from '@/components/RoutePreview';
import { WaypointListItem } from '@/components/routine/WaypointListItem';
import { RoutineTripDetailHeader } from '@/components/routine/RoutineTripDetailHeader';
import { Colors } from '@/constants/colors';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_TEXT_COLORS,
  formatDays,
  formatCOP,
  metersLabel,
  secondsLabel,
} from '@/utils/routine-trip.utils';
import { useRoutineDetailScreen } from '@/hooks/screens/useRoutineDetailScreen';
import type { RecurrenceDay, RoutineTripStatus } from '@/types/api';

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center mb-3">
      {icon}
      <Text className="text-sm font-semibold text-neutral-700 ml-2">{label}</Text>
    </View>
  );
}

export default function RoutineTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { selectedTrip, waypoints, storeLoading, isActioning, refreshing, handlers } =
    useRoutineDetailScreen(id);

  if (storeLoading && !selectedTrip) {
    return (
      <View className="flex-1 bg-neutral-50">
        <RoutineTripDetailHeader
          paddingTop={insets.top}
          canEdit={false}
          onBack={handlers.goToList}
          onEdit={() => {}}
        />
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      </View>
    );
  }

  if (!selectedTrip || selectedTrip.id !== id) {
    return (
      <View className="flex-1 bg-neutral-50">
        <RoutineTripDetailHeader
          paddingTop={insets.top}
          canEdit={false}
          onBack={handlers.goToList}
          onEdit={() => {}}
        />
        <View className="flex-1 items-center justify-center px-6">
          <AlertTriangle size={40} color={Colors.neutral[400]} />
          <Text className="text-base text-neutral-500 mt-3 text-center">
            No se encontró la ruta rutinaria.
          </Text>
          <Button variant="outline" size="md" onPress={() => router.back()} style={{ marginTop: 16 }}>
            Volver
          </Button>
        </View>
      </View>
    );
  }

  const trip = selectedTrip;
  const status = trip.status as RoutineTripStatus;
  const isReadOnly = status === 'COMPLETED' || status === 'CANCELLED';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <RoutineTripDetailHeader
        paddingTop={insets.top}
        canEdit={!isReadOnly}
        onBack={handlers.goToList}
        onEdit={() => router.push(`/routine/create/step-1-route?tripId=${id}` as never)}
      />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlers.onRefresh} />}
      >
        <View className="p-5 gap-4">
          <Card className="p-4">
            <View className={`self-start px-3 py-1 rounded-full mb-3 ${STATUS_COLORS[status]}`}>
              <Text className={`text-xs font-semibold ${STATUS_TEXT_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </Text>
            </View>
            <RoutePreview
              originName={trip.originName}
              originSubtitle={trip.originSubtitle}
              destinationName={trip.destinationName}
              destinationSubtitle={trip.destinationSubtitle}
            />
          </Card>

          <Card className="p-4">
            <SectionHeader icon={<Clock size={16} color={Colors.primary[500]} />} label="Horario" />
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Salida</Text>
                <Text className="text-sm font-medium text-neutral-800">{trip.departureTime}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Llegada límite</Text>
                <Text className="text-sm font-medium text-neutral-800">{trip.requiredArrivalTime}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Días</Text>
                <Text className="text-sm font-medium text-neutral-800 flex-1 text-right ml-4">
                  {formatDays(trip.recurrenceDays as RecurrenceDay[])}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Vigencia desde</Text>
                <Text className="text-sm font-medium text-neutral-800">{trip.validFrom}</Text>
              </View>
              {trip.validUntil ? (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-500">Vigencia hasta</Text>
                  <Text className="text-sm font-medium text-neutral-800">{trip.validUntil}</Text>
                </View>
              ) : null}
            </View>
          </Card>

          <Card className="p-4">
            <SectionHeader icon={<Users size={16} color={Colors.primary[500]} />} label="Cupos y precio" />
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Cupos disponibles</Text>
                <Text className="text-sm font-medium text-neutral-800">{trip.availableSeats}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Precio por cupo</Text>
                <Text className="text-sm font-medium text-neutral-800">{formatCOP(trip.pricePerSeat)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Equipaje</Text>
                <Text className="text-sm font-medium text-neutral-800">
                  {trip.allowsLuggage ? 'Permitido' : 'No permitido'}
                </Text>
              </View>
              {trip.studentsOnly ? (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-500">Acceso</Text>
                  <Text className="text-sm font-medium text-primary-600">Solo estudiantes</Text>
                </View>
              ) : null}
            </View>
          </Card>

          <Card className="p-4">
            <SectionHeader
              icon={<Settings2 size={16} color={Colors.primary[500]} />}
              label="Configuración de recogida"
            />
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Recogida personalizada</Text>
                <Text className="text-sm font-medium text-neutral-800">
                  {trip.allowsCustomPickup ? 'Permitida' : 'No permitida'}
                </Text>
              </View>
              {trip.allowsCustomPickup && (
                <>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-neutral-500">Desviación máx.</Text>
                    <Text className="text-sm font-medium text-neutral-800">
                      {metersLabel(trip.maxPickupDeviationMeters)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-neutral-500">Tiempo extra máx.</Text>
                    <Text className="text-sm font-medium text-neutral-800">
                      {secondsLabel(trip.maxTimeOverheadSeconds)}
                    </Text>
                  </View>
                </>
              )}
              <View className="flex-row justify-between">
                <Text className="text-sm text-neutral-500">Auto-aprobación</Text>
                <Text className="text-sm font-medium text-neutral-800">
                  {trip.autoApproveBookings ? 'Activada' : 'Desactivada'}
                </Text>
              </View>
            </View>
          </Card>

          <Card className="p-4">
            <View className="flex-row items-center justify-between mb-3">
              <SectionHeader
                icon={<MapPin size={16} color={Colors.primary[500]} />}
                label="Paradas predefinidas"
              />
              {!isReadOnly && (
                <TouchableOpacity
                  onPress={() => router.push(`/routine/create/step-5-waypoints?tripId=${id}` as never)}
                  className="flex-row items-center"
                >
                  <Plus size={14} color={Colors.primary[500]} />
                  <Text className="text-xs font-semibold text-primary-600 ml-1">Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
            {waypoints.length === 0 ? (
              <Text className="text-sm text-neutral-400 italic">Sin paradas definidas</Text>
            ) : (
              waypoints.map((wp) => <WaypointListItem key={wp.id} waypoint={wp} />)
            )}
          </Card>

          {status === 'ACTIVE' && (
            <TouchableOpacity
              onPress={() => router.push(`/routine/${id}/subscriptions` as never)}
              className="flex-row items-center bg-white rounded-2xl border border-neutral-200 px-4 py-4"
            >
              <Users size={18} color={Colors.primary[500]} className="mr-3" />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-neutral-900">Suscriptores</Text>
                <Text className="text-xs text-neutral-500">Ver solicitudes y activos</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[400]} />
            </TouchableOpacity>
          )}

          {!isReadOnly && (
            <View className="gap-3 mt-2">
              {status === 'DRAFT' && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handlers.handlePublish}
                    loading={isActioning}
                    disabled={isActioning}
                  >
                    Publicar ruta
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onPress={() =>
                      router.push(`/routine/create/step-5-waypoints?tripId=${id}` as never)
                    }
                  >
                    Agregar paradas
                  </Button>
                </>
              )}

              {status === 'ACTIVE' && (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    onPress={handlers.handlePause}
                    loading={isActioning}
                    disabled={isActioning}
                  >
                    Pausar ruta
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    onPress={handlers.handleCancel}
                    disabled={isActioning}
                  >
                    Cancelar plantilla
                  </Button>
                </>
              )}

              {status === 'PAUSED' && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handlers.handleResume}
                    loading={isActioning}
                    disabled={isActioning}
                  >
                    Reactivar ruta
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    onPress={handlers.handleCancel}
                    disabled={isActioning}
                  >
                    Cancelar plantilla
                  </Button>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
