import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Info, ChevronUp, ChevronDown } from 'lucide-react-native';
import { Screen, Button, Card, Spinner } from '@/components/ui';
import { RoutePreview } from '@/components/RoutePreview';
import { WaypointListItem } from '@/components/routine/WaypointListItem';
import { RoutineEditRouteModal } from '@/components/routine/RoutineEditRouteModal';
import { useRoutineWaypoints } from '@/hooks/useRoutineWaypoints';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import { Colors } from '@/constants/colors';

export default function Step5WaypointsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string; }>();
  const router = useRouter();

  const selectedTrip = useRoutineTripsStore((s) => s.selectedRoutineTrip);
  const fetchById = useRoutineTripsStore((s) => s.fetchById);
  const { waypoints, isLoading, fetchWaypoints, deleteWaypoint, reorderWaypoints } =
    useRoutineWaypoints();
  const tripForPreview = selectedTrip?.id === tripId ? selectedTrip : null;

  const isActive = tripForPreview?.status === 'ACTIVE';

  const [showEditRouteModal, setShowEditRouteModal] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    fetchWaypoints(tripId);
    if (!tripForPreview) {
      fetchById(tripId);
    }
  }, [tripId, tripForPreview, fetchWaypoints, fetchById]);

  const handleDelete = (waypointId: string) => {
    Alert.alert(
      'Eliminar parada',
      '¿Eliminar este waypoint? Los pasajeros con este punto de recogida verán su suscripción actualizada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWaypoint(tripId!, waypointId);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
            }
          },
        },
      ],
    );
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0 || !tripId) return;
    const newOrder = [...waypoints];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    try {
      await reorderWaypoints(tripId, newOrder.map((w) => w.id));
    } catch {
      // UI reverts on next fetch
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= waypoints.length - 1 || !tripId) return;
    const newOrder = [...waypoints];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    try {
      await reorderWaypoints(tripId, newOrder.map((w) => w.id));
    } catch {
      // UI reverts on next fetch
    }
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <Text className="text-2xl font-bold text-neutral-900 mb-1">Paradas predefinidas</Text>
          <Text className="text-base text-neutral-500 mb-4">
            Define puntos de recogida a lo largo de tu ruta (opcional).
          </Text>

          <Card className="p-4 mb-4">
            <Text className="text-sm font-semibold text-neutral-700 mb-3">Ruta seleccionada</Text>
            {tripForPreview ? (
              <RoutePreview
                originName={tripForPreview.originName}
                originSubtitle={tripForPreview.originSubtitle}
                destinationName={tripForPreview.destinationName}
                destinationSubtitle={tripForPreview.destinationSubtitle}
              />
            ) : (
              <Text className="text-sm text-neutral-400 italic">
                Cargando ruta seleccionada...
              </Text>
            )}
          </Card>

          {/* Active trip banner */}
          {isActive && (
            <View
              className="flex-row items-start p-3 rounded-xl mb-4"
              style={{ backgroundColor: Colors.semantic.infoLight }}
            >
              <Info size={16} color={Colors.semantic.info} style={{ marginTop: 2 }} />
              <Text className="text-sm text-blue-700 ml-2 flex-1">
                Esta ruta está activa. Solo puedes agregar nuevas paradas, no eliminar las
                existentes.
              </Text>
            </View>
          )}

          {/* Waypoints list */}
          {isLoading ? (
            <View className="items-center py-8">
              <Spinner />
            </View>
          ) : waypoints.length === 0 ? (
            <Card className="p-6 items-center mb-4">
              <Text className="text-sm text-neutral-400 text-center">
                Sin paradas definidas. Agrega puntos de recogida a lo largo de tu ruta.
              </Text>
            </Card>
          ) : (
            <View className="mb-4">
              {waypoints.map((wp, index) => (
                <View key={wp.id} className="flex-row items-center">
                  {!isActive && waypoints.length > 1 && (
                    <View className="mr-2 gap-1">
                      <TouchableOpacity
                        onPress={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="w-6 h-6 items-center justify-center"
                      >
                        <ChevronUp
                          size={16}
                          color={index === 0 ? Colors.neutral[300] : Colors.neutral[500]}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveDown(index)}
                        disabled={index === waypoints.length - 1}
                        className="w-6 h-6 items-center justify-center"
                      >
                        <ChevronDown
                          size={16}
                          color={
                            index === waypoints.length - 1
                              ? Colors.neutral[300]
                              : Colors.neutral[500]
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View className="flex-1">
                    <WaypointListItem
                      waypoint={wp}
                      showDelete={!isActive}
                      onDelete={handleDelete}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add stop — opens route editor modal */}
          <TouchableOpacity
            onPress={() => setShowEditRouteModal(true)}
            disabled={!tripForPreview}
            className="flex-row items-center justify-center border-2 border-dashed border-primary-300 rounded-xl py-4 mb-6"
            activeOpacity={0.7}
            style={{ opacity: tripForPreview ? 1 : 0.4 }}
          >
            <Plus size={18} color={Colors.primary[500]} />
            <Text className="text-sm font-semibold text-primary-600 ml-2">Agregar parada</Text>
          </TouchableOpacity>

          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              if (tripId) {
                router.replace(`/routine/${tripId}` as never);
              } else {
                router.back();
              }
            }}
          >
            Listo
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {tripForPreview && (
        <RoutineEditRouteModal
          visible={showEditRouteModal}
          trip={tripForPreview}
          existingWaypoints={waypoints}
          onClose={() => setShowEditRouteModal(false)}
          onDone={() => setShowEditRouteModal(false)}
        />
      )}
    </Screen>
  );
}
