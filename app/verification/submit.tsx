import React, { useReducer, useState } from 'react';
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
import {
  FileText,
  Camera,
  ChevronDown,
  User,
  CreditCard,
  Landmark,
} from 'lucide-react-native';
import { Screen, Button, Input, Card } from '@/components/ui';
import { useVerifications } from '@/hooks/useVerifications';
import { Colors } from '@/constants/colors';
import { DocumentType, type SubmitVerificationRequest } from '@/types/api';
import { getDocumentTypeLabel } from '@/lib/utils';
import Toast from 'react-native-toast-message';

// ── Form Reducer ──

interface VerificationFormState {
  documentType: DocumentType;
  documentNumber: string;
  showPicker: boolean;
}

type VerificationFormAction =
  | { type: 'SET_DOC_TYPE'; value: DocumentType }
  | { type: 'SET_DOC_NUMBER'; value: string }
  | { type: 'TOGGLE_PICKER' }
  | { type: 'RESET' };

const initialState: VerificationFormState = {
  documentType: 'CEDULA_CIUDADANIA',
  documentNumber: '',
  showPicker: false,
};

function formReducer(state: VerificationFormState, action: VerificationFormAction): VerificationFormState {
  switch (action.type) {
    case 'SET_DOC_TYPE':
      return { ...state, documentType: action.value, showPicker: false };
    case 'SET_DOC_NUMBER':
      return { ...state, documentNumber: action.value };
    case 'TOGGLE_PICKER':
      return { ...state, showPicker: !state.showPicker };
    case 'RESET':
      return initialState;
  }
}

const documentTypes: { type: DocumentType; icon: React.ReactNode }[] = [
  { type: 'CEDULA_CIUDADANIA', icon: <CreditCard size={20} color={Colors.primary[600]} /> },
  { type: 'CEDULA_EXTRANJERIA', icon: <Landmark size={20} color={Colors.primary[600]} /> },
  { type: 'PASAPORTE', icon: <FileText size={20} color={Colors.primary[600]} /> },
];

export default function SubmitVerificationScreen() {
  const router = useRouter();
  const { submitVerification, submitting, error } = useVerifications();
  const [form, dispatch] = useReducer(formReducer, initialState);

  const handleSubmit = async () => {
    if (!form.documentNumber.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu número de documento.');
      return;
    }

    if (form.documentNumber.length < 5) {
      Alert.alert('Documento inválido', 'El número de documento debe tener al menos 5 caracteres.');
      return;
    }

    const payload: SubmitVerificationRequest = {
      documentType: form.documentType,
      documentNumber: form.documentNumber.trim(),
      documentFrontUrl: 'https://placeholder.com/front.jpg', // TODO: File upload
      documentBackUrl: 'https://placeholder.com/back.jpg', // TODO: File upload
    };

    const success = await submitVerification(payload);
    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Verificación enviada',
        text2: 'Tu documento será revisado en las próximas horas.',
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
          {/* Info Banner */}
          <View className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-sm text-blue-800 leading-5">
              La verificación de identidad aumenta tu nivel de confianza en la plataforma.
              Solo necesitas tu documento de identidad vigente.
            </Text>
          </View>

          {/* Document Type Picker */}
          <Text className="text-sm font-medium text-neutral-700 mb-2">
            Tipo de documento
          </Text>
          <TouchableOpacity
            onPress={() => dispatch({ type: 'TOGGLE_PICKER' })}
            activeOpacity={0.7}
          >
            <Card className="mb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-primary-50 items-center justify-center mr-3">
                    {documentTypes.find((d) => d.type === form.documentType)?.icon}
                  </View>
                  <Text className="text-base font-medium text-neutral-800">
                    {getDocumentTypeLabel(form.documentType)}
                  </Text>
                </View>
                <ChevronDown size={20} color={Colors.neutral[400]} />
              </View>
            </Card>
          </TouchableOpacity>

          {form.showPicker && (
            <Card className="mb-4">
              {documentTypes.map(({ type, icon }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => dispatch({ type: 'SET_DOC_TYPE', value: type })}
                  className={`flex-row items-center py-3 px-2 ${
                    type === form.documentType ? 'bg-primary-50 rounded-xl' : ''
                  }`}
                  activeOpacity={0.6}
                >
                  <View className="mr-3">{icon}</View>
                  <Text
                    className={`text-sm ${
                      type === form.documentType
                        ? 'font-semibold text-primary-700'
                        : 'text-neutral-700'
                    }`}
                  >
                    {getDocumentTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          {/* Document Number */}
          <Input
            label="Número de documento"
            placeholder="Ingresa tu número de documento"
            keyboardType="default"
            value={form.documentNumber}
            onChangeText={(v) => dispatch({ type: 'SET_DOC_NUMBER', value: v })}
            containerClassName="mb-6"
          />

          {/* Photo Upload Placeholders */}
          <Text className="text-base font-semibold text-neutral-900 mb-3">
            Fotos del documento
          </Text>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity className="flex-1 h-36 bg-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 items-center justify-center">
              <Camera size={28} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-400 mt-2">Parte frontal</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 h-36 bg-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 items-center justify-center">
              <Camera size={28} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-400 mt-2">Parte posterior</Text>
            </TouchableOpacity>
          </View>

          {/* Selfie */}
          <Text className="text-sm font-medium text-neutral-700 mb-2">
            Selfie (opcional)
          </Text>
          <TouchableOpacity className="h-36 bg-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 items-center justify-center mb-6">
            <User size={32} color={Colors.neutral[400]} />
            <Text className="text-xs text-neutral-400 mt-2">
              Toma una selfie sosteniendo tu documento
            </Text>
          </TouchableOpacity>

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
            Enviar verificación
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
