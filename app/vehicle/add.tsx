import React, { useReducer } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Car } from 'lucide-react-native';
import { Screen, Button, Input, Card } from '@/components/ui';
import { useVehicles } from '@/hooks/useVehicles';
import { Colors } from '@/constants/colors';
import type { CreateVehicleRequest } from '@/types/api';
import Toast from 'react-native-toast-message';

// ── Vehicle Form Reducer ──

interface VehicleFormState {
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  capacity: string;
  soatExpiry: string;
}

type VehicleFormAction =
  | { type: 'SET'; field: keyof VehicleFormState; value: string }
  | { type: 'RESET' };

const initialState: VehicleFormState = {
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  capacity: '4',
  soatExpiry: '',
};

function formReducer(state: VehicleFormState, action: VehicleFormAction): VehicleFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
  }
}

export default function AddVehicleScreen() {
  const router = useRouter();
  const { createVehicle, submitting, error } = useVehicles();
  const [form, dispatch] = useReducer(formReducer, initialState);

  const setField = (field: keyof VehicleFormState, value: string) =>
    dispatch({ type: 'SET', field, value });

  const handleSubmit = async () => {
    if (!form.plateNumber || !form.brand || !form.model || !form.year || !form.color) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos obligatorios.');
      return;
    }

    const payload: CreateVehicleRequest = {
      plateNumber: form.plateNumber.toUpperCase(),
      brand: form.brand,
      model: form.model,
      year: parseInt(form.year, 10),
      color: form.color,
      capacity: parseInt(form.capacity, 10) || 4,
      soatDocumentUrl: 'https://placeholder.com/soat.pdf', // TODO: File upload
      soatExpiry: form.soatExpiry || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      transitCardUrl: 'https://placeholder.com/transit.pdf', // TODO: File upload
    };

    const success = await createVehicle(payload);
    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Vehículo registrado',
        text2: `${form.brand} ${form.model} agregado correctamente`,
      });
      router.back();
    }
  };

  return (
    <Screen safe={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-4 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle Info */}
          <View className="gap-4 mb-6">
            <Input
              label="Placa *"
              placeholder="ABC-123"
              autoCapitalize="characters"
              value={form.plateNumber}
              onChangeText={(v) => setField('plateNumber', v)}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Marca *"
                  placeholder="Toyota"
                  value={form.brand}
                  onChangeText={(v) => setField('brand', v)}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Modelo *"
                  placeholder="Corolla"
                  value={form.model}
                  onChangeText={(v) => setField('model', v)}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Año *"
                  placeholder="2022"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={form.year}
                  onChangeText={(v) => setField('year', v.replace(/\D/g, ''))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Color *"
                  placeholder="Blanco"
                  value={form.color}
                  onChangeText={(v) => setField('color', v)}
                />
              </View>
            </View>

            <Input
              label="Capacidad de pasajeros"
              placeholder="4"
              keyboardType="number-pad"
              maxLength={1}
              value={form.capacity}
              onChangeText={(v) => setField('capacity', v.replace(/\D/g, ''))}
              hint="Número de asientos disponibles (1-8)"
            />
          </View>

          {/* Documents Section */}
          <Text className="text-base font-semibold text-neutral-900 mb-3">
            Documentos del vehículo
          </Text>

          <Card className="mb-4">
            <TouchableOpacity className="flex-row items-center py-2">
              <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                <Camera size={24} color={Colors.primary[600]} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-neutral-800">Fotos del vehículo</Text>
                <Text className="text-xs text-neutral-400 mt-0.5">
                  Mínimo 1 foto exterior
                </Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card className="mb-4">
            <TouchableOpacity className="flex-row items-center py-2">
              <View className="w-12 h-12 rounded-xl bg-accent-50 items-center justify-center mr-3">
                <Car size={24} color={Colors.accent[600]} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-neutral-800">SOAT</Text>
                <Text className="text-xs text-neutral-400 mt-0.5">
                  Seguro obligatorio vigente
                </Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card className="mb-4">
            <TouchableOpacity className="flex-row items-center py-2">
              <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-3">
                <Car size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-neutral-800">Tarjeta de propiedad</Text>
                <Text className="text-xs text-neutral-400 mt-0.5">
                  Foto frontal y posterior
                </Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Input
            label="Vencimiento SOAT"
            placeholder="AAAA-MM-DD"
            value={form.soatExpiry}
            onChangeText={(v) => setField('soatExpiry', v)}
            containerClassName="mb-6"
            hint="Fecha de vencimiento del SOAT"
          />

          {/* Error */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Button
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            className="w-full"
          >
            Registrar vehículo
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
