import React, { useState, useReducer, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Clock,
  Users,
  DollarSign,
  Luggage,
  Car,
  ChevronRight,
  GraduationCap,
  Bus,
  Building2,
  Calendar,
  Check,
} from 'lucide-react-native';
import { Screen, Button, Input, Card } from '@/components/ui';
import {
  LocationPickerModal,
  type SelectedLocation,
} from '@/components/LocationPickerModal';
import { Colors } from '@/constants/colors';
import { vehiclesApi } from '@/api/vehicles';
import { tripsApi } from '@/api/trips';
import type { TripType, VehicleResponse } from '@/types/api';
import Toast from 'react-native-toast-message';

// ── Form State ──

interface IntercityForm {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureAt: Date;
  availableSeats: string;
  pricePerSeat: string;
  vehicleId: string;
  allowsLuggage: boolean;
  studentsOnly: boolean;
}

type IntercityAction =
  | { type: 'SET_ORIGIN'; payload: SelectedLocation; }
  | { type: 'SET_DESTINATION'; payload: SelectedLocation; }
  | { type: 'SET_DEPARTURE'; payload: Date; }
  | { type: 'SET_SEATS'; payload: string; }
  | { type: 'SET_PRICE'; payload: string; }
  | { type: 'SET_VEHICLE'; payload: string; }
  | { type: 'TOGGLE_LUGGAGE'; }
  | { type: 'TOGGLE_STUDENTS'; }
  | { type: 'RESET'; };

function makeTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

const initialForm: IntercityForm = {
  origin: null,
  destination: null,
  departureAt: makeTomorrow(),
  availableSeats: '3',
  pricePerSeat: '',
  vehicleId: '',
  allowsLuggage: true,
  studentsOnly: false,
};

function formReducer(state: IntercityForm, action: IntercityAction): IntercityForm {
  switch (action.type) {
    case 'SET_ORIGIN': return { ...state, origin: action.payload };
    case 'SET_DESTINATION': return { ...state, destination: action.payload };
    case 'SET_DEPARTURE': return { ...state, departureAt: action.payload };
    case 'SET_SEATS': return { ...state, availableSeats: action.payload };
    case 'SET_PRICE': return { ...state, pricePerSeat: action.payload };
    case 'SET_VEHICLE': return { ...state, vehicleId: action.payload };
    case 'TOGGLE_LUGGAGE': return { ...state, allowsLuggage: !state.allowsLuggage };
    case 'TOGGLE_STUDENTS': return { ...state, studentsOnly: !state.studentsOnly };
    case 'RESET': return { ...initialForm, departureAt: makeTomorrow() };
  }
}

// ── Trip Type Config ──

const tripTypeOptions: { type: TripType; label: string; icon: React.ReactNode; }[] = [
  {
    type: 'INTERCITY',
    label: 'Interurbano',
    icon: <Bus size={20} color={Colors.primary[600]} />,
  },
  {
    type: 'URBAN',
    label: 'Urbano',
    icon: <Building2 size={20} color={Colors.accent[600]} />,
  },
  {
    type: 'ROUTINE',
    label: 'Rutinario',
    icon: <GraduationCap size={20} color="#3B82F6" />,
  },
];

// ── Helpers ──

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Toggle UI ──

function Toggle({ value, onPress }: { value: boolean; onPress: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-12 h-7 rounded-full justify-center px-0.5 ${value ? 'bg-primary-500' : 'bg-neutral-200'}`}
    >
      <View
        className={`w-6 h-6 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`}
        style={{ elevation: 2 }}
      />
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function PublishScreen() {
  const router = useRouter();

  const [tripType, setTripType] = useState<TripType>('INTERCITY');
  const [form, dispatch] = useReducer(formReducer, initialForm);

  // Vehicles
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Location picker
  const [locationPicker, setLocationPicker] = useState<{
    visible: boolean;
    target: 'origin' | 'destination';
  }>({ visible: false, target: 'origin' });

  // Date / Time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Load vehicles on mount
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      const { data: res } = await vehiclesApi.getMine();
      setVehicles(res.data ?? []);
    } catch {
      // empty list shown
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles]),
  );

  // Auto-select if only one active vehicle
  useEffect(() => {
    const active = vehicles.filter((v) => v.status === 'ACTIVE');
    if (active.length === 1 && !form.vehicleId) {
      dispatch({ type: 'SET_VEHICLE', payload: active[0].id });
    }
  }, [vehicles, form.vehicleId]);

  const activeVehicles = vehicles.filter((v) => v.status === 'ACTIVE');
  const hasRegisteredVehicles = vehicles.length > 0;

  useEffect(() => {
    if (form.vehicleId && !activeVehicles.some((v) => v.id === form.vehicleId)) {
      dispatch({ type: 'SET_VEHICLE', payload: '' });
    }
  }, [form.vehicleId, activeVehicles]);

  // ── Location handlers ──

  const openLocationPicker = (target: 'origin' | 'destination') => {
    setLocationPicker({ visible: true, target });
  };

  const handleLocationConfirm = (loc: SelectedLocation) => {
    dispatch({
      type: locationPicker.target === 'origin' ? 'SET_ORIGIN' : 'SET_DESTINATION',
      payload: loc,
    });
    setLocationPicker((p) => ({ ...p, visible: false }));
  };

  // ── Date handlers ──

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(form.departureAt.getHours(), form.departureAt.getMinutes(), 0, 0);
    dispatch({ type: 'SET_DEPARTURE', payload: next });
    setShowDatePicker(false);
  };

  const handleTimeChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(form.departureAt);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    dispatch({ type: 'SET_DEPARTURE', payload: next });
    setShowTimePicker(false);
  };

  // ── Submit ──

  const handlePublish = async () => {
    if (!form.origin || !form.destination) {
      Alert.alert('Campos requeridos', 'Selecciona el origen y destino del viaje');
      return;
    }
    if (!form.vehicleId) {
      Alert.alert('Campos requeridos', 'Selecciona un vehículo para el viaje');
      return;
    }
    if (!form.pricePerSeat || parseInt(form.pricePerSeat) <= 0) {
      Alert.alert('Campos requeridos', 'Ingresa el precio por asiento');
      return;
    }
    if (form.departureAt <= new Date()) {
      Alert.alert('Fecha inválida', 'La fecha de salida debe ser en el futuro');
      return;
    }

    setSubmitting(true);
    try {
      const { data: createRes } = await tripsApi.create({
        tripType,
        originName: form.origin.name,
        originLatitude: form.origin.latitude,
        originLongitude: form.origin.longitude,
        destinationName: form.destination.name,
        destinationLatitude: form.destination.latitude,
        destinationLongitude: form.destination.longitude,
        departureAt: form.departureAt.toISOString(),
        availableSeats: parseInt(form.availableSeats, 10),
        pricePerSeat: parseFloat(form.pricePerSeat),
        currency: 'COP',
        vehicleId: form.vehicleId,
        allowsLuggage: form.allowsLuggage,
        studentsOnly: form.studentsOnly,
      });

      if (!createRes.data) throw new Error('Error al crear viaje');
      await tripsApi.publish(createRes.data.id);

      Toast.show({
        type: 'success',
        text1: '¡Viaje publicado!',
        text2: 'Tu viaje ya es visible para pasajeros',
      });

      dispatch({ type: 'RESET' });
      router.push('/(tabs)/my-trips');
    } catch (err: any) {
      Alert.alert(
        'Error al publicar',
        err?.response?.data?.message ?? 'No se pudo publicar el viaje. Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-4 pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-neutral-900">Publicar viaje</Text>
            <Text className="text-sm text-neutral-500 mt-1">
              Comparte tu ruta y gana dinero viajando
            </Text>
          </View>

          {/* Trip Type */}
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Tipo de viaje</Text>
          <View className="flex-row gap-2 mb-6">
            {tripTypeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                onPress={() => setTripType(opt.type)}
                className={`flex-1 items-center py-3 rounded-xl border-2 ${tripType === opt.type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 bg-white'
                  }`}
              >
                {opt.icon}
                <Text
                  className={`text-xs font-medium mt-1 ${tripType === opt.type ? 'text-primary-700' : 'text-neutral-600'
                    }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Non-INTERCITY placeholder */}
          {tripType !== 'INTERCITY' && (
            <Card className="items-center py-10 mb-6">
              <Text className="text-base font-semibold text-neutral-700 mb-1">
                Próximamente
              </Text>
              <Text className="text-sm text-neutral-400 text-center px-4">
                La publicación de viajes{' '}
                {tripType === 'URBAN' ? 'urbanos' : 'rutinarios'} estará
                disponible pronto.
              </Text>
            </Card>
          )}

          {/* INTERCITY Form */}
          {tripType === 'INTERCITY' && (
            <>
              {/* Route */}
              <Text className="text-sm font-semibold text-neutral-700 mb-2">Ruta</Text>
              <View className="gap-3 mb-6">
                {/* Origin */}
                <TouchableOpacity
                  onPress={() => openLocationPicker('origin')}
                  activeOpacity={0.7}
                >
                  <View
                    className={`flex-row items-center px-4 py-3.5 rounded-xl border-2 ${form.origin
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 bg-white'
                      }`}
                  >
                    <View className="w-3 h-3 rounded-full bg-primary-500 mr-3" />
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-400 mb-0.5">Origen</Text>
                      <Text
                        className={`text-sm font-medium ${form.origin ? 'text-neutral-900' : 'text-neutral-400'
                          }`}
                      >
                        {form.origin?.name ?? '¿De dónde sales?'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.neutral[400]} />
                  </View>
                </TouchableOpacity>

                {/* Destination */}
                <TouchableOpacity
                  onPress={() => openLocationPicker('destination')}
                  activeOpacity={0.7}
                >
                  <View
                    className={`flex-row items-center px-4 py-3.5 rounded-xl border-2 ${form.destination
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-neutral-200 bg-white'
                      }`}
                  >
                    <View className="w-3 h-3 rounded-full bg-accent-500 mr-3" />
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-400 mb-0.5">Destino</Text>
                      <Text
                        className={`text-sm font-medium ${form.destination ? 'text-neutral-900' : 'text-neutral-400'
                          }`}
                      >
                        {form.destination?.name ?? '¿A dónde vas?'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.neutral[400]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Departure */}
              <Text className="text-sm font-semibold text-neutral-700 mb-2">Salida</Text>
              <View className="flex-row gap-3 mb-6">
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                  className="flex-1"
                >
                  <View className="flex-row items-center px-4 py-3.5 rounded-xl border-2 border-neutral-200 bg-white">
                    <Calendar size={18} color={Colors.neutral[500]} />
                    <View className="ml-3">
                      <Text className="text-xs text-neutral-400 mb-0.5">Fecha</Text>
                      <Text className="text-sm font-medium text-neutral-900">
                        {fmtDate(form.departureAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                  className="flex-1"
                >
                  <View className="flex-row items-center px-4 py-3.5 rounded-xl border-2 border-neutral-200 bg-white">
                    <Clock size={18} color={Colors.neutral[500]} />
                    <View className="ml-3">
                      <Text className="text-xs text-neutral-400 mb-0.5">Hora</Text>
                      <Text className="text-sm font-medium text-neutral-900">
                        {fmtTime(form.departureAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={form.departureAt}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onValueChange={handleDateChange}
                  onDismiss={() => setShowDatePicker(false)}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={form.departureAt}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onValueChange={handleTimeChange}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}

              {/* Seats & Price */}
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1">
                  <Input
                    label="Asientos disponibles"
                    placeholder="3"
                    keyboardType="number-pad"
                    value={form.availableSeats}
                    onChangeText={(v) =>
                      dispatch({ type: 'SET_SEATS', payload: v.replace(/\D/g, '') })
                    }
                    leftIcon={<Users size={18} color={Colors.neutral[400]} />}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Precio / asiento (COP)"
                    placeholder="50000"
                    keyboardType="number-pad"
                    value={form.pricePerSeat}
                    onChangeText={(v) =>
                      dispatch({ type: 'SET_PRICE', payload: v.replace(/\D/g, '') })
                    }
                    leftIcon={<DollarSign size={18} color={Colors.neutral[400]} />}
                  />
                </View>
              </View>

              {/* Vehicle */}
              <Text className="text-sm font-semibold text-neutral-700 mb-2">Vehículo</Text>
              {loadingVehicles ? (
                <View className="items-center py-6 mb-6">
                  <ActivityIndicator color={Colors.primary[500]} />
                </View>
              ) : activeVehicles.length === 0 ? (
                <TouchableOpacity
                  onPress={() => router.push('/vehicle/add')}
                  activeOpacity={0.7}
                >
                  <Card className="mb-6">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Car size={20} color={Colors.primary[600]} />
                        <Text className="text-sm text-neutral-700 ml-3 flex-1">
                          {hasRegisteredVehicles
                            ? 'Tu vehículo está registrado pero aún no está activo para publicar viajes.'
                            : 'No tienes vehículos activos. '}
                          <Text className="text-primary-600 font-semibold">
                            {hasRegisteredVehicles ? 'Ver mis vehículos' : 'Registrar uno'}
                          </Text>
                        </Text>
                      </View>
                      <ChevronRight size={20} color={Colors.neutral[400]} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ) : (
                <View className="mb-6">
                  {activeVehicles.map((v) => {
                    const selected = form.vehicleId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => dispatch({ type: 'SET_VEHICLE', payload: v.id })}
                        activeOpacity={0.7}
                        className={`flex-row items-center p-3 rounded-2xl border-2 mb-2 bg-white ${selected ? 'border-primary-500' : 'border-neutral-200'
                          }`}
                      >
                        <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                          <Car size={22} color={Colors.primary[400]} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-neutral-900">
                            {v.brand} {v.model} {v.year}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5">{v.color}</Text>
                          <View className="bg-primary-50 rounded px-1.5 py-0.5 self-start mt-1">
                            <Text className="text-xs font-bold text-primary-700">
                              {v.plateNumber}
                            </Text>
                          </View>
                        </View>
                        {selected && (
                          <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                            <Check size={14} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Options */}
              <Card className="mb-6">
                <TouchableOpacity
                  className="flex-row items-center justify-between py-1"
                  onPress={() => dispatch({ type: 'TOGGLE_LUGGAGE' })}
                >
                  <View className="flex-row items-center">
                    <Luggage size={20} color={Colors.neutral[600]} />
                    <Text className="text-base text-neutral-800 ml-3">Permite equipaje</Text>
                  </View>
                  <Toggle
                    value={form.allowsLuggage}
                    onPress={() => dispatch({ type: 'TOGGLE_LUGGAGE' })}
                  />
                </TouchableOpacity>

                <View className="h-px bg-neutral-100 my-3" />

                <TouchableOpacity
                  className="flex-row items-center justify-between py-1"
                  onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
                >
                  <View className="flex-row items-center">
                    <GraduationCap size={20} color={Colors.neutral[600]} />
                    <Text className="text-base text-neutral-800 ml-3">Solo estudiantes</Text>
                  </View>
                  <Toggle
                    value={form.studentsOnly}
                    onPress={() => dispatch({ type: 'TOGGLE_STUDENTS' })}
                  />
                </TouchableOpacity>
              </Card>

              {/* Submit */}
              <Button
                onPress={handlePublish}
                size="lg"
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                Publicar viaje
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={locationPicker.visible}
        title={
          locationPicker.target === 'origin' ? 'Seleccionar origen' : 'Seleccionar destino'
        }
        onConfirm={handleLocationConfirm}
        onClose={() => setLocationPicker((p) => ({ ...p, visible: false }))}
        initial={locationPicker.target === 'origin' ? form.origin : form.destination}
      />
    </Screen>
  );
}
