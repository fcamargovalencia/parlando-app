import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Luggage, GraduationCap } from 'lucide-react-native';
import { Card, Toggle } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { tripsApi } from '@/api/trips';
import type { TripResponse, UpdateTripRequest } from '@/types/api';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

interface EditFormState {
  availableSeats: string;
  pricePerSeat: string;
  departureAt: Date;
  allowsLuggage: boolean;
  studentsOnly: boolean;
}

interface EditTripModalProps {
  trip: TripResponse;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: TripResponse) => void;
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
    <TouchableOpacity
      className="flex-row items-center justify-between py-1"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="text-base text-neutral-800">{label}</Text>
      </View>
      <Toggle value={value} onPress={onPress} />
    </TouchableOpacity>
  );
}

export function EditTripModal({
  trip,
  visible,
  onClose,
  onSaved,
}: EditTripModalProps) {
  const [form, setForm] = useState<EditFormState>({
    availableSeats: String(trip.availableSeats),
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
    if (!seats || seats < 1) {
      Alert.alert('', 'Ingresa un número de asientos válido');
      return;
    }
    if (!price || price < 1) {
      Alert.alert('', 'Ingresa un precio válido');
      return;
    }
    if (form.departureAt <= new Date()) {
      Alert.alert('', 'La salida debe ser en el futuro');
      return;
    }

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
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? 'No se pudo actualizar el viaje',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(
      form.departureAt.getHours(),
      form.departureAt.getMinutes(),
      0,
      0,
    );
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-neutral-50">
        <View className="flex-row items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-neutral-100">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base text-neutral-500">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-neutral-900">
            Editar viaje
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary[500]} />
            ) : (
              <Text className="text-base font-semibold text-primary-600">
                Guardar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-5"
          keyboardShouldPersistTaps="handled"
        >
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

          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Capacidad y precio
          </Text>
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5">
              <Text className="text-xs text-neutral-400 mb-1">
                Asientos totales
              </Text>
              <TextInput
                value={form.availableSeats}
                onChangeText={(v) =>
                  setForm((f) => ({
                    ...f,
                    availableSeats: v.replace(/\D/g, ''),
                  }))
                }
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={Colors.neutral[400]}
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: Colors.neutral[900],
                }}
              />
            </View>
            <View className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5">
              <Text className="text-xs text-neutral-400 mb-1">
                Precio / asiento (COP)
              </Text>
              <TextInput
                value={form.pricePerSeat}
                onChangeText={(v) =>
                  setForm((f) => ({
                    ...f,
                    pricePerSeat: v.replace(/\D/g, ''),
                  }))
                }
                keyboardType="number-pad"
                placeholder="50000"
                placeholderTextColor={Colors.neutral[400]}
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: Colors.neutral[900],
                }}
              />
            </View>
          </View>

          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Opciones
          </Text>
          <Card className="mb-8">
            <ToggleRow
              icon={<Luggage size={20} color={Colors.neutral[600]} />}
              label="Permite equipaje"
              value={form.allowsLuggage}
              onPress={() =>
                setForm((f) => ({ ...f, allowsLuggage: !f.allowsLuggage }))
              }
            />
            <View className="h-px bg-neutral-100 my-3" />
            <ToggleRow
              icon={<GraduationCap size={20} color={Colors.neutral[600]} />}
              label="Solo estudiantes"
              value={form.studentsOnly}
              onPress={() =>
                setForm((f) => ({ ...f, studentsOnly: !f.studentsOnly }))
              }
            />
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}
