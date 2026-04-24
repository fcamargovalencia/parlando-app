import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Info, ChevronUp, ChevronDown } from 'lucide-react-native';
import { Screen, Button, Card, Spinner, Toggle } from '@/components/ui';
import { RoutePreview } from '@/components/RoutePreview';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import { WaypointListItem } from '@/components/routine/WaypointListItem';
import { useRoutineWaypoints } from '@/hooks/useRoutineWaypoints';
import { useRoutineTripsStore } from '@/stores/routine-trips-store';
import { Colors } from '@/constants/colors';
import type { CreateRoutineWaypointRequest } from '@/types/api';

// ── Add form state ──

interface AddWaypointForm {
  location: SelectedLocation | null;
  estimatedMinutesOffset: string;
  isPickupPoint: boolean;
}

const DEFAULT_FORM: AddWaypointForm = {
  location: null,
  estimatedMinutesOffset: '5',
  isPickupPoint: true,
};

export default function Step5WaypointsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string; }>();
  const router = useRouter();

  const selectedTrip = useRoutineTripsStore((s) => s.selectedRoutineTrip);
  const fetchById = useRoutineTripsStore((s) => s.fetchById);
  const { waypoints, isLoading, fetchWaypoints, addWaypoint, deleteWaypoint, reorderWaypoints } =
    useRoutineWaypoints();
  const tripForPreview = selectedTrip?.id === tripId ? selectedTrip : null;

  const isActive = tripForPreview?.status === 'ACTIVE';

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddWaypointForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    fetchWaypoints(tripId);
    if (!tripForPreview) {
      fetchById(tripId);
    }
  }, [tripId, tripForPreview, fetchWaypoints, fetchById]);

  const handleAddWaypoint = async () => {
    if (!addForm.location || !tripId) return;
    const minutes = parseInt(addForm.estimatedMinutesOffset, 10);
    if (isNaN(minutes) || minutes < 0) {
      Alert.alert('Error', 'Ingresa un tiempo válido en minutos');
      return;
    }
    setIsSaving(true);
    try {
      const payload: CreateRoutineWaypointRequest = {
        orderIndex: waypoints.length,
        latitude: addForm.location.latitude,
        longitude: addForm.location.longitude,
        name: addForm.location.name,
        subtitle: addForm.location.subtitle,
        isPickupPoint: addForm.isPickupPoint,
        estimatedMinutesOffset: minutes,
      };
      await addWaypoint(tripId, payload);
      setAddForm(DEFAULT_FORM);
      setShowAddForm(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo agregar la parada');
    } finally {
      setIsSaving(false);
    }
  };

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

          {/* Add waypoint form */}
          {showAddForm ? (
            <Card className="p-4 mb-4">
              <Text className="text-sm font-semibold text-neutral-900 mb-3">Nueva parada</Text>

              {/* Location selector */}
              <TouchableOpacity
                onPress={() => setShowLocationPicker(true)}
                className="bg-neutral-100 rounded-xl px-4 py-3 mb-3"
              >
                <Text className="text-xs text-neutral-500 mb-0.5">Ubicación</Text>
                <Text
                  className={
                    addForm.location
                      ? 'text-sm text-neutral-900 font-medium'
                      : 'text-sm text-neutral-400'
                  }
                >
                  {addForm.location?.name ?? 'Seleccionar ubicación...'}
                </Text>
                {addForm.location?.subtitle ? (
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {addForm.location.subtitle}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {/* Minutes offset */}
              <View className="mb-3">
                <Text className="text-xs text-neutral-500 mb-1">
                  Minutos desde hora de salida
                </Text>
                <TextInput
                  value={addForm.estimatedMinutesOffset}
                  onChangeText={(v) =>
                    setAddForm((f) => ({ ...f, estimatedMinutesOffset: v }))
                  }
                  keyboardType="number-pad"
                  className="bg-neutral-100 rounded-xl px-4 py-3 text-sm text-neutral-900"
                  placeholder="5"
                />
              </View>

              {/* Is pickup point */}
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-sm font-medium text-neutral-800">Punto de recogida</Text>
                  <Text className="text-xs text-neutral-500">
                    Los pasajeros pueden elegir este punto
                  </Text>
                </View>
                <Toggle
                  value={addForm.isPickupPoint}
                  onPress={() =>
                    setAddForm((f) => ({ ...f, isPickupPoint: !f.isPickupPoint }))
                  }
                />
              </View>

              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  size="md"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowAddForm(false);
                    setAddForm(DEFAULT_FORM);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  style={{ flex: 1 }}
                  onPress={handleAddWaypoint}
                  disabled={!addForm.location || isSaving}
                  loading={isSaving}
                >
                  Agregar
                </Button>
              </View>
            </Card>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              className="flex-row items-center justify-center border-2 border-dashed border-primary-300 rounded-xl py-4 mb-6"
              activeOpacity={0.7}
            >
              <Plus size={18} color={Colors.primary[500]} />
              <Text className="text-sm font-semibold text-primary-600 ml-2">Agregar parada</Text>
            </TouchableOpacity>
          )}

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

      {/* Location picker modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        title="Seleccionar parada"
        routeLine={tripForPreview?.routeLine}
        onConfirm={(loc) => {
          setAddForm((f) => ({ ...f, location: loc }));
          setShowLocationPicker(false);
        }}
        onClose={() => setShowLocationPicker(false)}
      />
    </Screen>
  );
}
