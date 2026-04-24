import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Calendar, AlertCircle } from 'lucide-react-native';
import { Screen, Button, Card, Toggle, DatePickerModal } from '@/components/ui';
import { DaySelector } from '@/components/routine/DaySelector';
import { ArrivalWindowChip } from '@/components/university/ArrivalWindowChip';
import { usePublishRoutineTrip } from '@/hooks/usePublishRoutineTrip';
import { Colors } from '@/constants/colors';
import type { RecurrenceDay } from '@/types/api';

// ── Helpers ──

function timeFromDate(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function dateToISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseHHMM(t: string): Date {
  const [hh, mm] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function parseISODate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function fmtTime(t: string | undefined): string {
  if (!t) return '—';
  const [hh, mm] = t.split(':');
  return `${hh}:${mm}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

type PickerTarget = 'departure' | 'arrival' | 'validFrom' | 'validUntil';

export default function Step2ScheduleScreen() {
  const router = useRouter();
  const {
    formData,
    updateForm,
    selectedUniversity,
    validateAndProceed,
    errors,
  } = usePublishRoutineTrip();

  const [pickerOpen, setPickerOpen] = useState<PickerTarget | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Derive Date objects for the pickers
  const departureDateObj = parseHHMM(formData.departureTime ?? '08:00');
  const arrivalDateObj = parseHHMM(formData.requiredArrivalTime ?? '09:00');
  const validFromDateObj = formData.validFrom ? parseISODate(formData.validFrom) : today;
  const validUntilDateObj = formData.validUntil ? parseISODate(formData.validUntil) : undefined;

  const handlePickerConfirm = (date: Date) => {
    if (pickerOpen === 'departure') {
      updateForm({ departureTime: timeFromDate(date) });
    } else if (pickerOpen === 'arrival') {
      updateForm({ requiredArrivalTime: timeFromDate(date) });
    } else if (pickerOpen === 'validFrom') {
      updateForm({ validFrom: dateToISODate(date) });
    } else if (pickerOpen === 'validUntil') {
      updateForm({ validUntil: dateToISODate(date) });
    }
    setPickerOpen(null);
  };

  const handleNext = () => {
    if (validateAndProceed(2)) {
      router.push('/routine/create/step-3-seats');
    }
  };

  const arrivalWindows = Array.isArray(selectedUniversity?.typicalArrivalWindows)
    ? selectedUniversity.typicalArrivalWindows
    : [];

  return (
    <Screen edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-neutral-900 mb-1">Configura el horario</Text>
        <Text className="text-base text-neutral-500 mb-6">
          ¿Cuándo y qué días opera tu ruta rutinaria?
        </Text>

        {/* Days */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Días de operación</Text>
        <DaySelector
          selected={(formData.recurrenceDays as RecurrenceDay[]) ?? []}
          onChange={(days) => updateForm({ recurrenceDays: days })}
          error={errors.recurrenceDays}
        />
        <View className="mb-5" />

        {/* Departure time */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Hora de salida</Text>
        <TouchableOpacity
          onPress={() => setPickerOpen('departure')}
          activeOpacity={0.7}
          className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white mb-1 ${errors.departureTime ? 'border-red-400' : 'border-neutral-200'
            }`}
        >
          <Clock size={18} color={Colors.neutral[500]} />
          <Text className={`ml-3 text-base ${formData.departureTime ? 'text-neutral-900' : 'text-neutral-400'}`}>
            {formData.departureTime ? fmtTime(formData.departureTime) : 'Seleccionar hora'}
          </Text>
        </TouchableOpacity>
        {errors.departureTime ? (
          <Text className="text-red-500 text-xs mb-4">{errors.departureTime}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Arrival time */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Hora límite de llegada</Text>

        {/* University arrival window chips */}
        {arrivalWindows.length > 0 ? (
          <View className="mb-2">
            <ArrivalWindowChip
              windows={arrivalWindows}
              selectedTime={formData.requiredArrivalTime}
              onSelect={(time) => updateForm({ requiredArrivalTime: time })}
            />
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => setPickerOpen('arrival')}
          activeOpacity={0.7}
          className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white mb-1 ${errors.requiredArrivalTime ? 'border-red-400' : 'border-neutral-200'
            }`}
        >
          <Clock size={18} color={Colors.neutral[500]} />
          <Text className={`ml-3 text-base ${formData.requiredArrivalTime ? 'text-neutral-900' : 'text-neutral-400'}`}>
            {formData.requiredArrivalTime ? fmtTime(formData.requiredArrivalTime) : 'Seleccionar hora'}
          </Text>
        </TouchableOpacity>
        {errors.requiredArrivalTime ? (
          <View className="flex-row items-center mb-4">
            <AlertCircle size={13} color={Colors.semantic.error} />
            <Text className="text-red-500 text-xs ml-1">{errors.requiredArrivalTime}</Text>
          </View>
        ) : (
          <View className="mb-4" />
        )}

        {/* Validity period */}
        <Text className="text-sm font-semibold text-neutral-700 mb-2">Período de vigencia</Text>
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-xs text-neutral-500 mb-1">Desde</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen('validFrom')}
              activeOpacity={0.7}
              className={`flex-row items-center border rounded-2xl px-3 py-3 bg-white ${errors.validFrom ? 'border-red-400' : 'border-neutral-200'
                }`}
            >
              <Calendar size={16} color={Colors.neutral[500]} />
              <Text className={`ml-2 text-sm ${formData.validFrom ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {formData.validFrom ? fmtDate(parseISODate(formData.validFrom)) : 'Fecha inicio'}
              </Text>
            </TouchableOpacity>
            {errors.validFrom ? (
              <Text className="text-red-500 text-xs mt-1">{errors.validFrom}</Text>
            ) : null}
          </View>

          <View className="flex-1">
            <Text className="text-xs text-neutral-500 mb-1">Hasta (opcional)</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen('validUntil')}
              activeOpacity={0.7}
              className="flex-row items-center border border-neutral-200 rounded-2xl px-3 py-3 bg-white"
            >
              <Calendar size={16} color={Colors.neutral[500]} />
              <Text className={`ml-2 text-sm ${formData.validUntil ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {formData.validUntil ? fmtDate(parseISODate(formData.validUntil)) : 'Sin límite'}
              </Text>
            </TouchableOpacity>
            {formData.validUntil ? (
              <TouchableOpacity onPress={() => updateForm({ validUntil: undefined })}>
                <Text className="text-xs text-primary-600 mt-1 text-right">Quitar límite</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Students only toggle */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-neutral-800">Solo estudiantes</Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                Requiere verificación universitaria para reservar
              </Text>
              {errors.studentsOnly ? (
                <Text className="text-red-500 text-xs mt-1">{errors.studentsOnly}</Text>
              ) : null}
            </View>
            <Toggle
              value={!!formData.studentsOnly}
              onPress={() => updateForm({ studentsOnly: !formData.studentsOnly })}
            />
          </View>
        </Card>
      </ScrollView>

      <View className="px-5 pb-6 pt-3 border-t border-neutral-100 bg-white">
        <Button onPress={handleNext}>Siguiente</Button>
      </View>

      {/* Time picker — departure */}
      <DatePickerModal
        visible={pickerOpen === 'departure'}
        value={departureDateObj}
        mode="time"
        title="Hora de salida"
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerOpen(null)}
      />

      {/* Time picker — arrival */}
      <DatePickerModal
        visible={pickerOpen === 'arrival'}
        value={arrivalDateObj}
        mode="time"
        title="Hora límite de llegada"
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerOpen(null)}
      />

      {/* Date picker — validFrom */}
      <DatePickerModal
        visible={pickerOpen === 'validFrom'}
        value={validFromDateObj}
        mode="date"
        title="Fecha de inicio"
        minimumDate={today}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerOpen(null)}
      />

      {/* Date picker — validUntil */}
      <DatePickerModal
        visible={pickerOpen === 'validUntil'}
        value={validUntilDateObj ?? validFromDateObj}
        mode="date"
        title="Fecha de fin"
        minimumDate={formData.validFrom ? parseISODate(formData.validFrom) : today}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerOpen(null)}
      />
    </Screen>
  );
}
