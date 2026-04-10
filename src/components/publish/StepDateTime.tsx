import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { DatePickerModal } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { PublishAction } from '@/hooks/usePublishForm';

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface Props {
  departureAt: Date;
  dispatch: React.Dispatch<PublishAction>;
}

export function StepDateTime({ departureAt, dispatch }: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  return (
    <>
      <Text className="text-sm font-semibold text-neutral-700 mb-2">Día y hora de salida</Text>
      <View className="flex-row gap-3 mb-2">
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
          className="flex-1"
        >
          <View className="flex-row items-center px-4 py-3.5 rounded-xl border-2 border-neutral-200 bg-white">
            <Calendar size={18} color={Colors.neutral[500]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-400 mb-0.5">Fecha</Text>
              <Text className="text-sm font-medium text-neutral-900">{fmtDate(departureAt)}</Text>
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
              <Text className="text-sm font-medium text-neutral-900">{fmtTime(departureAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {departureAt <= new Date() && (
        <Text className="text-xs text-red-500">La salida debe ser en una fecha futura.</Text>
      )}

      <DatePickerModal
        visible={showDatePicker}
        value={departureAt}
        mode="date"
        title="Fecha de salida"
        minimumDate={new Date()}
        onConfirm={(date) => {
          const next = new Date(date);
          next.setHours(departureAt.getHours(), departureAt.getMinutes(), 0, 0);
          dispatch({ type: 'SET_DEPARTURE', payload: next });
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
      <DatePickerModal
        visible={showTimePicker}
        value={departureAt}
        mode="time"
        title="Hora de salida"
        onConfirm={(date) => {
          const next = new Date(departureAt);
          next.setHours(date.getHours(), date.getMinutes(), 0, 0);
          dispatch({ type: 'SET_DEPARTURE', payload: next });
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </>
  );
}
