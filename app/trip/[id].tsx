import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Luggage,
  GraduationCap,
  Car,
  ChevronRight,
  Edit3,
  Play,
  CheckCircle,
  XCircle,
  UserCheck,
  Bus,
  Building2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Badge, Card, Spinner, Button } from '@/components/ui';
import { Colors, Shadows } from '@/constants/colors';
import { tripsApi } from '@/api/trips';
import { vehiclesApi } from '@/api/vehicles';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, getTripTypeLabel } from '@/lib/utils';
import type { TripResponse, TripStatus, VehicleResponse, UpdateTripRequest } from '@/types/api';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

// ── Helpers ──

const STATUS_BADGE: Record<TripStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral' }> = {
  DRAFT:       { label: 'Borrador',    variant: 'neutral' },
  PUBLISHED:   { label: 'Publicado',   variant: 'success' },
  IN_PROGRESS: { label: 'En curso',    variant: 'info' },
  COMPLETED:   { label: 'Completado',  variant: 'success' },
  CANCELLED:   { label: 'Cancelado',   variant: 'error' },
};

const TRIP_TYPE_ICON: Record<string, React.ReactNode> = {
  INTERCITY: <Bus size={18} color={Colors.primary[600]} />,
  URBAN:     <Building2 size={18} color={Colors.accent[600]} />,
  ROUTINE:   <GraduationCap size={18} color="#3B82F6" />,
};

function fmtDeparture(iso: string) {
  return dayjs(iso).format('ddd D MMM YYYY, h:mm A');
}

// ── Edit Modal ──

interface EditFormState {
  availableSeats: string;
  pricePerSeat: string;
  departureAt: Date;
  allowsLuggage: boolean;
  studentsOnly: boolean;
}

interface EditModalProps {
  trip: TripResponse;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: TripResponse) => void;
}

function EditModal({ trip, visible, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState<EditFormState>({
    availableSeats: String(trip.totalSeats),
    pricePerSeat: String(Math.round(trip.pricePerSeat)),
    departureAt: new Date(trip.departureAt),
    allowsLuggage: trip.allowsLuggage,
    studentsOnly: trip.studentsOnly,
  });
  const [saving, setSaving] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const handleSave = async () => {
    const seats = parseInt(form.availableSeats, 10);
    const price = parseFloat(form.pricePerSeat);
    if (!seats || seats < 1) { Alert.alert('', 'Ingresa un número de asientos válido'); return; }
    if (!price || price < 1) { Alert.alert('', 'Ingresa un precio válido'); return; }
    if (form.departureAt <= new Date()) { Alert.alert('', 'La salida debe ser en el futuro'); return; }

    setSaving(true);
    try {
      const body: UpdateTripRequest = {
        availableSeats: seats,
        pricePerSeat: price,
        departureAt: form.departureAt.toISOString(),
        allowsLuggage: form.allowsLuggage,
        studentsOnly: form.studentsOnly,
      };
      const { data: res } = await tripsApi.update(trip.id, body);
      if (!res.data) throw new Error();
      onSaved(res.data);
      Toast.show({ type: 'success', text1: 'Viaje actualizado' });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo actualizar el viaje');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(form.departureAt.getHours(), form.departureAt.getMinutes(), 0, 0);
    setForm((f) => ({ ...f, departureAt: next }));
    setShowDate(false);
  };

  const handleTimeChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(form.departureAt);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setForm((f) => ({ ...f, departureAt: next }));
    setShowTime(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-neutral-50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-neutral-100">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base text-neutral-500">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-neutral-900">Editar viaje</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.primary[500]} />
              : <Text className="text-base font-semibold text-primary-600">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled">
          {/* Departure */}
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Fecha y hora de salida
          </Text>
          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              onPress={() => setShowDate(true)}
              className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5"
            >
              <Text className="text-xs text-neutral-400 mb-0.5">Fecha</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {dayjs(form.departureAt).format('D MMM YYYY')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTime(true)}
              className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5"
            >
              <Text className="text-xs text-neutral-400 mb-0.5">Hora</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {dayjs(form.departureAt).format('h:mm A')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDate && (
            <DateTimePicker
              value={form.departureAt}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleDateChange}
              onDismiss={() => setShowDate(false)}
            />
          )}
          {showTime && (
            <DateTimePicker
              value={form.departureAt}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleTimeChange}
              onDismiss={() => setShowTime(false)}
            />
          )}

          {/* Seats & Price */}
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Capacidad y precio
          </Text>
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5">
              <Text className="text-xs text-neutral-400 mb-1">Asientos totales</Text>
              <View className="flex-row items-center gap-2">
                <Users size={16} color={Colors.neutral[400]} />
                <Text
                  className="flex-1 text-sm font-medium text-neutral-900"
                  onPress={() => {}} // dummy — use TextInput below
                />
                {/* Using Text + manual input pattern */}
              </View>
              <View className="mt-1">
                <TextInputField
                  value={form.availableSeats}
                  onChangeText={(v) => setForm((f) => ({ ...f, availableSeats: v.replace(/\D/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="3"
                />
              </View>
            </View>
            <View className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5">
              <Text className="text-xs text-neutral-400 mb-1">Precio / asiento (COP)</Text>
              <View className="mt-1">
                <TextInputField
                  value={form.pricePerSeat}
                  onChangeText={(v) => setForm((f) => ({ ...f, pricePerSeat: v.replace(/\D/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="50000"
                />
              </View>
            </View>
          </View>

          {/* Options */}
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Opciones
          </Text>
          <Card className="mb-8">
            <ToggleRow
              icon={<Luggage size={20} color={Colors.neutral[600]} />}
              label="Permite equipaje"
              value={form.allowsLuggage}
              onPress={() => setForm((f) => ({ ...f, allowsLuggage: !f.allowsLuggage }))}
            />
            <View className="h-px bg-neutral-100 my-3" />
            <ToggleRow
              icon={<GraduationCap size={20} color={Colors.neutral[600]} />}
              label="Solo estudiantes"
              value={form.studentsOnly}
              onPress={() => setForm((f) => ({ ...f, studentsOnly: !f.studentsOnly }))}
            />
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Small helpers ──

import { TextInput } from 'react-native';

function TextInputField({
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'number-pad' | 'default';
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={Colors.neutral[400]}
      style={{ fontSize: 15, fontWeight: '500', color: Colors.neutral[900] }}
    />
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="flex-row items-center justify-between py-1" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="text-base text-neutral-800">{label}</Text>
      </View>
      <View className={`w-12 h-7 rounded-full justify-center px-0.5 ${value ? 'bg-primary-500' : 'bg-neutral-200'}`}>
        <View className={`w-6 h-6 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} style={{ elevation: 2 }} />
      </View>
    </TouchableOpacity>
  );
}

// ── Detail Row ──

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

// ── Main Screen ──

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await tripsApi.getDetails(id);
      if (!res.data) throw new Error('Viaje no encontrado');
      setTrip(res.data);
      // Load vehicle info
      try {
        const { data: vRes } = await vehiclesApi.getById(res.data.vehicleId);
        if (vRes.data) setVehicle(vRes.data);
      } catch {}
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo cargar el viaje');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isDriver = trip && user ? trip.driverId === user.id : false;
  const canEdit = isDriver && (trip?.status === 'DRAFT' || trip?.status === 'PUBLISHED');

  const runAction = async (
    label: string,
    action: () => Promise<void>,
    confirmMsg?: string,
  ) => {
    if (confirmMsg) {
      await new Promise<void>((resolve, reject) => {
        Alert.alert(label, confirmMsg, [
          { text: 'Cancelar', style: 'cancel', onPress: () => reject() },
          { text: 'Confirmar', style: 'destructive', onPress: () => resolve() },
        ]);
      });
    }
    setActionLoading(label);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = () =>
    runAction('Publicar', async () => {
      const { data: res } = await tripsApi.publish(id);
      if (res.data) setTrip(res.data);
      Toast.show({ type: 'success', text1: '¡Viaje publicado!', text2: 'Ya es visible para pasajeros' });
    });

  const handleStart = () =>
    runAction('Iniciar viaje', async () => {
      const { data: res } = await tripsApi.start(id);
      if (res.data) setTrip(res.data);
      Toast.show({ type: 'success', text1: 'Viaje iniciado' });
    }, '¿Confirmas que el viaje está en camino?');

  const handleComplete = () =>
    runAction('Completar', async () => {
      const { data: res } = await tripsApi.complete(id);
      if (res.data) setTrip(res.data);
      Toast.show({ type: 'success', text1: 'Viaje completado' });
    }, '¿Confirmas que llegaste al destino?');

  const handleCancel = () =>
    runAction('Cancelar viaje', async () => {
      await tripsApi.cancel(id);
      setTrip((t) => t ? { ...t, status: 'CANCELLED' } : t);
      Toast.show({ type: 'success', text1: 'Viaje cancelado' });
    }, '¿Seguro que quieres cancelar este viaje? Esta acción no se puede deshacer.');

  // ── Render ──

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Custom header */}
      <View
        className="flex-row items-center justify-between px-4 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, ...Shadows.sm }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center"
        >
          <ArrowLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-neutral-900">Detalle del viaje</Text>
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
          <Text className="text-sm text-neutral-500 text-center">{error ?? 'No encontrado'}</Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 gap-4"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Status Banner ── */}
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {TRIP_TYPE_ICON[trip.tripType]}
                <Text className="text-sm font-medium text-neutral-600">
                  {getTripTypeLabel(trip.tripType)}
                </Text>
              </View>
              <Badge
                label={STATUS_BADGE[trip.status].label}
                variant={STATUS_BADGE[trip.status].variant}
              />
            </View>

            {/* Route summary */}
            <View className="flex-row items-center mt-4 gap-3">
              <View className="items-center">
                <View className="w-3 h-3 rounded-full bg-primary-500" />
                <View className="w-0.5 flex-1 bg-neutral-200 my-1" style={{ minHeight: 20 }} />
                <View className="w-3 h-3 rounded-full bg-accent-500" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                  {trip.originName}
                </Text>
                <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                  {trip.destinationName}
                </Text>
              </View>
            </View>
          </Card>

          {/* ── Driver Action Buttons ── */}
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
              {(trip.status === 'DRAFT' || trip.status === 'PUBLISHED') && (
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

          {/* ── Trip Details ── */}
          <Card>
            <Text className="text-sm font-semibold text-neutral-700 mb-1">Detalles del viaje</Text>
            <DetailRow
              icon={<Clock size={16} color={Colors.neutral[400]} />}
              label="Salida"
              value={fmtDeparture(trip.departureAt)}
            />
            <DetailRow
              icon={<Users size={16} color={Colors.neutral[400]} />}
              label="Asientos"
              value={`${trip.availableSeats} disponibles de ${trip.totalSeats}`}
            />
            <DetailRow
              icon={<DollarSign size={16} color={Colors.neutral[400]} />}
              label="Precio por asiento"
              value={formatCurrency(trip.pricePerSeat, trip.currency)}
            />
            <DetailRow
              icon={<Luggage size={16} color={Colors.neutral[400]} />}
              label="Equipaje"
              value={trip.allowsLuggage ? 'Permitido' : 'No permitido'}
            />
            <DetailRow
              icon={<GraduationCap size={16} color={Colors.neutral[400]} />}
              label="Solo estudiantes"
              value={trip.studentsOnly ? 'Sí' : 'No'}
            />
          </Card>

          {/* ── Vehicle ── */}
          {vehicle && (
            <Card>
              <View className="flex-row items-center gap-2 mb-1">
                <Car size={16} color={Colors.neutral[400]} />
                <Text className="text-sm font-semibold text-neutral-700">Vehículo</Text>
              </View>
              <Text className="text-base font-semibold text-neutral-900 mt-2">
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </Text>
              <Text className="text-sm text-neutral-500 mt-0.5">{vehicle.color}</Text>
              <View className="bg-primary-50 rounded px-2 py-1 self-start mt-2">
                <Text className="text-xs font-bold text-primary-700">{vehicle.plateNumber}</Text>
              </View>
            </Card>
          )}

          {/* ── Passenger Requests (Driver only) ── */}
          {isDriver && (
            <Card>
              <View className="flex-row items-center gap-2 mb-3">
                <UserCheck size={18} color={Colors.primary[600]} />
                <Text className="text-sm font-semibold text-neutral-700">
                  Solicitudes de pasajeros
                </Text>
              </View>
              <View className="items-center py-6">
                <View className="w-14 h-14 rounded-full bg-neutral-100 items-center justify-center mb-3">
                  <UserCheck size={28} color={Colors.neutral[300]} />
                </View>
                <Text className="text-sm font-medium text-neutral-600 mb-1">
                  Sin solicitudes aún
                </Text>
                <Text className="text-xs text-neutral-400 text-center px-4">
                  Cuando un pasajero solicite un cupo, aparecerá aquí para que puedas aceptar o rechazar.
                </Text>
              </View>
            </Card>
          )}

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      )}

      {/* Edit Modal */}
      {trip && canEdit && (
        <EditModal
          trip={trip}
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          onSaved={(updated) => setTrip(updated)}
        />
      )}
    </View>
  );
}
