import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Luggage, GraduationCap } from 'lucide-react-native';
import { Card, Toggle } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useEditTripForm } from '@/hooks/useEditTripForm';
import type { TripResponse } from '@/types/api';
import dayjs from 'dayjs';

interface EditTripModalProps {
  trip: TripResponse;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: TripResponse) => void;
}

export function EditTripModal({ trip, visible, onClose, onSaved }: EditTripModalProps) {
  const {
    form, setForm,
    showDate, setShowDate,
    showTime, setShowTime,
    handleDateChange, handleTimeChange,
    formError, save, isSaving,
  } = useEditTripForm(trip, onSaved, onClose);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-neutral-50">
        {/* Nav bar */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-neutral-100">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base text-neutral-500">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-neutral-900">Editar viaje</Text>
          <TouchableOpacity onPress={save} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.primary[500]} />
            ) : (
              <Text className="text-base font-semibold text-primary-600">Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled">
          {/* Validation / API error */}
          {formError && (
            <Text className="text-red-500 text-sm mb-4 text-center">{formError}</Text>
          )}

          {/* Date & time */}
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

          {/* Capacity & price */}
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Capacidad y precio
          </Text>
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5">
              <Text className="text-xs text-neutral-400 mb-1">Asientos totales</Text>
              <TextInput
                value={form.availableSeats}
                onChangeText={(v) => setForm((f) => ({ ...f, availableSeats: v.replace(/\D/g, '') }))}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={Colors.neutral[400]}
                style={{ fontSize: 15, fontWeight: '500', color: Colors.neutral[900] }}
              />
            </View>
            <View className="flex-1 bg-white rounded-xl border border-neutral-200 px-4 py-3.5">
              <Text className="text-xs text-neutral-400 mb-1">Precio / asiento (COP)</Text>
              <TextInput
                value={form.pricePerSeat}
                onChangeText={(v) => setForm((f) => ({ ...f, pricePerSeat: v.replace(/\D/g, '') }))}
                keyboardType="number-pad"
                placeholder="50000"
                placeholderTextColor={Colors.neutral[400]}
                style={{ fontSize: 15, fontWeight: '500', color: Colors.neutral[900] }}
              />
            </View>
          </View>

          {/* Options */}
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Opciones
          </Text>
          <Card className="mb-8">
            <TouchableOpacity
              className="flex-row items-center justify-between py-1"
              onPress={() => setForm((f) => ({ ...f, allowsLuggage: !f.allowsLuggage }))}
            >
              <View className="flex-row items-center gap-3">
                <Luggage size={20} color={Colors.neutral[600]} />
                <Text className="text-base text-neutral-800">Permite equipaje</Text>
              </View>
              <Toggle
                value={form.allowsLuggage}
                onPress={() => setForm((f) => ({ ...f, allowsLuggage: !f.allowsLuggage }))}
              />
            </TouchableOpacity>
            <View className="h-px bg-neutral-100 my-3" />
            <TouchableOpacity
              className="flex-row items-center justify-between py-1"
              onPress={() => setForm((f) => ({ ...f, studentsOnly: !f.studentsOnly }))}
            >
              <View className="flex-row items-center gap-3">
                <GraduationCap size={20} color={Colors.neutral[600]} />
                <Text className="text-base text-neutral-800">Solo estudiantes</Text>
              </View>
              <Toggle
                value={form.studentsOnly}
                onPress={() => setForm((f) => ({ ...f, studentsOnly: !f.studentsOnly }))}
              />
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}
