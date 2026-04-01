import React, { useState, useReducer } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Luggage,
  Car,
  ChevronRight,
} from 'lucide-react-native';
import { Screen, Button, Input, Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import type { TripType } from '@/types/api';

// ── Trip Form Reducer ──

interface TripFormState {
  tripType: TripType;
  origin: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: string;
  pricePerSeat: string;
  allowsLuggage: boolean;
  notes: string;
}

type TripFormAction =
  | { type: 'SET_FIELD'; field: keyof TripFormState; value: string | boolean; }
  | { type: 'SET_TRIP_TYPE'; payload: TripType; }
  | { type: 'RESET'; };

const initialFormState: TripFormState = {
  tripType: 'INTERCITY',
  origin: '',
  destination: '',
  date: '',
  time: '',
  availableSeats: '3',
  pricePerSeat: '',
  allowsLuggage: true,
  notes: '',
};

function formReducer(state: TripFormState, action: TripFormAction): TripFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_TRIP_TYPE':
      return { ...state, tripType: action.payload };
    case 'RESET':
      return initialFormState;
  }
}

const tripTypeOptions: { type: TripType; label: string; icon: React.ReactNode; }[] = [
  { type: 'INTERCITY', label: 'Interurbano', icon: <MapPin size={20} color={Colors.primary[600]} /> },
  { type: 'URBAN', label: 'Urbano', icon: <MapPin size={20} color={Colors.accent[600]} /> },
  { type: 'ROUTINE', label: 'Rutinario', icon: <Clock size={20} color="#3B82F6" /> },
];

export default function PublishScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  const handlePublish = () => {
    // TODO: Call trips API when endpoint is available
    Alert.alert(
      'Próximamente',
      'La publicación de viajes estará disponible pronto. Los endpoints del backend para viajes están en desarrollo.',
      [{ text: 'Entendido' }],
    );
  };

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
            <Text className="text-2xl font-bold text-neutral-900">
              Publicar viaje
            </Text>
            <Text className="text-sm text-neutral-500 mt-1">
              Comparte tu ruta y gana dinero viajando
            </Text>
          </View>

          {/* Trip Type */}
          <Text className="text-sm font-semibold text-neutral-700 mb-2">
            Tipo de viaje
          </Text>
          <View className="flex-row gap-2 mb-6">
            {tripTypeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                onPress={() => dispatch({ type: 'SET_TRIP_TYPE', payload: opt.type })}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border-2 ${form.tripType === opt.type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 bg-white'
                  }`}
              >
                {opt.icon}
                <Text
                  className={`text-sm font-medium ml-1.5 ${form.tripType === opt.type ? 'text-primary-700' : 'text-neutral-600'
                    }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Route */}
          <View className="gap-4 mb-6">
            <Input
              label="Origen"
              placeholder="¿De dónde sales?"
              value={form.origin}
              onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'origin', value: v })}
              leftIcon={<View className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
            />
            <Input
              label="Destino"
              placeholder="¿A dónde vas?"
              value={form.destination}
              onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'destination', value: v })}
              leftIcon={<View className="w-2.5 h-2.5 rounded-full bg-accent-500" />}
            />
          </View>

          {/* Date & Time */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Input
                label="Fecha"
                placeholder="DD/MM/AAAA"
                value={form.date}
                onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'date', value: v })}
                leftIcon={<Calendar size={18} color={Colors.neutral[400]} />}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Hora"
                placeholder="HH:MM"
                value={form.time}
                onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'time', value: v })}
                leftIcon={<Clock size={18} color={Colors.neutral[400]} />}
              />
            </View>
          </View>

          {/* Seats & Price */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Input
                label="Asientos disponibles"
                placeholder="3"
                keyboardType="number-pad"
                value={form.availableSeats}
                onChangeText={(v) =>
                  dispatch({ type: 'SET_FIELD', field: 'availableSeats', value: v.replace(/\D/g, '') })
                }
                leftIcon={<Users size={18} color={Colors.neutral[400]} />}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Precio por asiento"
                placeholder="$50.000"
                keyboardType="number-pad"
                value={form.pricePerSeat}
                onChangeText={(v) =>
                  dispatch({ type: 'SET_FIELD', field: 'pricePerSeat', value: v.replace(/\D/g, '') })
                }
                leftIcon={<DollarSign size={18} color={Colors.neutral[400]} />}
              />
            </View>
          </View>

          {/* Options */}
          <Card className="mb-6">
            <TouchableOpacity
              className="flex-row items-center justify-between py-1"
              onPress={() =>
                dispatch({
                  type: 'SET_FIELD',
                  field: 'allowsLuggage',
                  value: !form.allowsLuggage,
                })
              }
            >
              <View className="flex-row items-center">
                <Luggage size={20} color={Colors.neutral[600]} />
                <Text className="text-base text-neutral-800 ml-3">Permite equipaje</Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full ${form.allowsLuggage ? 'bg-primary-500' : 'bg-neutral-200'
                  } justify-center px-0.5`}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${form.allowsLuggage ? 'self-end' : 'self-start'
                    }`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                />
              </View>
            </TouchableOpacity>
          </Card>

          {/* Vehicle Selection */}
          <TouchableOpacity
            onPress={() => router.push('/vehicle')}
            activeOpacity={0.7}
          >
            <Card className="mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Car size={20} color={Colors.primary[600]} />
                  <Text className="text-base text-neutral-800 ml-3">
                    Seleccionar vehículo
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.neutral[400]} />
              </View>
            </Card>
          </TouchableOpacity>

          {/* Notes */}
          <Input
            label="Notas adicionales (opcional)"
            placeholder="Ej: Salgo puntual, tengo espacio en el baúl..."
            multiline
            numberOfLines={3}
            value={form.notes}
            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'notes', value: v })}
            containerClassName="mb-6"
          />

          {/* Publish Button */}
          <Button onPress={handlePublish} size="lg" className="w-full">
            Publicar viaje
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
