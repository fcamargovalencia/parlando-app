import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { Screen, Button, Card, Toggle } from '@/components/ui';
import { usePublishRoutineTrip } from '@/hooks/usePublishRoutineTrip';
import { Colors } from '@/constants/colors';

function metersLabel(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function secondsLabel(s: number): string {
  const min = Math.round(s / 60);
  return `${min} min`;
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel: (v: number) => string;
  disabled?: boolean;
}

function Stepper({ value, min, max, step, onChange, formatLabel, disabled }: StepperProps) {
  return (
    <View className="flex-row items-center justify-between bg-neutral-100 rounded-2xl px-2 py-1">
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={disabled || value <= min}
        className="w-10 h-10 items-center justify-center"
        activeOpacity={0.7}
      >
        <Minus size={18} color={value <= min || disabled ? Colors.neutral[300] : Colors.primary[600]} />
      </TouchableOpacity>
      <Text className="text-base font-bold text-neutral-900 min-w-[72px] text-center">
        {formatLabel(value)}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={disabled || value >= max}
        className="w-10 h-10 items-center justify-center"
        activeOpacity={0.7}
      >
        <Plus size={18} color={value >= max || disabled ? Colors.neutral[300] : Colors.primary[600]} />
      </TouchableOpacity>
    </View>
  );
}

export default function Step4PickupConfigScreen() {
  const router = useRouter();
  const { formData, updateForm } = usePublishRoutineTrip();

  const allowsCustom = !!formData.allowsCustomPickup;
  const deviationMeters = formData.maxPickupDeviationMeters ?? 500;
  const overheadSeconds = formData.maxTimeOverheadSeconds ?? 300;
  const autoApprove = !!formData.autoApproveBookings;

  const handleNext = () => {
    router.push('/routine/create/review');
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-neutral-900 mb-1">Configuración de recogida</Text>
        <Text className="text-base text-neutral-500 mb-6">
          Define cómo gestionas los puntos de recogida personalizados.
        </Text>

        {/* Allow custom pickup */}
        <Card className="p-4 mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-neutral-800">
                Recogida personalizada
              </Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                Permite que los pasajeros propongan un punto distinto a las paradas fijas
              </Text>
            </View>
            <Toggle
              value={allowsCustom}
              onPress={() => updateForm({ allowsCustomPickup: !allowsCustom })}
            />
          </View>
        </Card>

        {/* Deviation stepper */}
        <View
          className={`mb-5 ${!allowsCustom ? 'opacity-40' : ''}`}
          pointerEvents={allowsCustom ? 'auto' : 'none'}
        >
          <Text className="text-sm font-semibold text-neutral-700 mb-1">
            Desviación máxima de ruta
          </Text>
          <Text className="text-xs text-neutral-500 mb-3">
            Acepto desvíos de hasta {metersLabel(deviationMeters)} de mi ruta
          </Text>
          <Stepper
            value={deviationMeters}
            min={100}
            max={2000}
            step={100}
            onChange={(v) => updateForm({ maxPickupDeviationMeters: v })}
            formatLabel={metersLabel}
            disabled={!allowsCustom}
          />
        </View>

        {/* Time overhead stepper */}
        <View
          className={`mb-5 ${!allowsCustom ? 'opacity-40' : ''}`}
          pointerEvents={allowsCustom ? 'auto' : 'none'}
        >
          <Text className="text-sm font-semibold text-neutral-700 mb-1">
            Tiempo extra máximo
          </Text>
          <Text className="text-xs text-neutral-500 mb-3">
            Acepto retrasos de hasta {secondsLabel(overheadSeconds)} por recogidas adicionales
          </Text>
          <Stepper
            value={overheadSeconds}
            min={60}
            max={600}
            step={60}
            onChange={(v) => updateForm({ maxTimeOverheadSeconds: v })}
            formatLabel={secondsLabel}
            disabled={!allowsCustom}
          />
        </View>

        {/* Auto-approve */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-neutral-800">
                Aprobación automática
              </Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                Acepta solicitudes sin revisión cuando no hay requerimientos especiales
              </Text>
            </View>
            <Toggle
              value={autoApprove}
              onPress={() => updateForm({ autoApproveBookings: !autoApprove })}
            />
          </View>
        </Card>
      </ScrollView>

      <View className="px-5 pb-6 pt-3 border-t border-neutral-100 bg-white">
        <Button onPress={handleNext}>Revisar ruta</Button>
      </View>
    </Screen>
  );
}
