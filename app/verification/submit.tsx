import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  Camera,
  ChevronDown,
  User,
  CreditCard,
  Landmark,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import { Screen, Button, Input, Card } from '@/components/ui';
import { useVerifications } from '@/hooks/useVerifications';
import { Colors } from '@/constants/colors';
import { DocumentType, type SubmitVerificationRequest } from '@/types/api';
import { getDocumentTypeLabel } from '@/lib/utils';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import {
  CapturePhotoModal,
  type CapturedPhoto,
  type CaptureTarget,
} from '@/components/verification/CapturePhotoModal';
import Toast from 'react-native-toast-message';

interface VerificationFormState {
  documentType: DocumentType;
  documentNumber: string;
  showPicker: boolean;
}

type VerificationFormAction =
  | { type: 'SET_DOC_TYPE'; value: DocumentType; }
  | { type: 'SET_DOC_NUMBER'; value: string; }
  | { type: 'TOGGLE_PICKER'; }
  | { type: 'RESET'; };

interface VerificationPhotosState {
  documentFront: CapturedPhoto | null;
  documentBack: CapturedPhoto | null;
  selfie: CapturedPhoto | null;
}

const initialState: VerificationFormState = {
  documentType: 'CEDULA_CIUDADANIA',
  documentNumber: '',
  showPicker: false,
};

const initialPhotosState: VerificationPhotosState = {
  documentFront: null,
  documentBack: null,
  selfie: null,
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

const documentTypes: { type: DocumentType; icon: React.ReactNode; }[] = [
  { type: 'CEDULA_CIUDADANIA', icon: <CreditCard size={20} color={Colors.primary[600]} /> },
  { type: 'CEDULA_EXTRANJERIA', icon: <Landmark size={20} color={Colors.primary[600]} /> },
  { type: 'PASAPORTE', icon: <FileText size={20} color={Colors.primary[600]} /> },
];

const captureCardContent: Record<
  CaptureTarget,
  {
    title: string;
    subtitle: string;
    requiredLabel: string;
    icon: React.ReactNode;
  }
> = {
  documentFront: {
    title: 'Parte frontal',
    subtitle: 'Documento completo, bien iluminado y sin reflejos',
    requiredLabel: 'Obligatoria',
    icon: <Camera size={28} color={Colors.primary[600]} />,
  },
  documentBack: {
    title: 'Parte posterior',
    subtitle: 'Asegúrate de capturar texto y bordes completos',
    requiredLabel: 'Obligatoria',
    icon: <Camera size={28} color={Colors.accent[600]} />,
  },
  selfie: {
    title: 'Selfie con documento',
    subtitle: 'Rostro visible y documento junto al rostro para revisión manual',
    requiredLabel: 'Obligatoria',
    icon: <User size={30} color={Colors.primary[600]} />,
  },
};

export default function SubmitVerificationScreen() {
  const router = useRouter();
  const { submitVerification, submitting, error, clearError, verifications } = useVerifications();
  const [form, dispatch] = useReducer(formReducer, initialState);
  const [photos, setPhotos] = useState<VerificationPhotosState>(initialPhotosState);
  const [activeCapture, setActiveCapture] = useState<CaptureTarget | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const blockedVerificationsByType = useMemo(
    () => verifications.reduce<Partial<Record<DocumentType, (typeof verifications)[number]>>>((acc, verification) => {
      if (verification.status === 'PENDING' || verification.status === 'VERIFIED') {
        acc[verification.documentType] = verification;
      }
      return acc;
    }, {}),
    [verifications],
  );

  const firstAvailableDocumentType = useMemo(
    () => documentTypes.find(({ type }) => !blockedVerificationsByType[type])?.type ?? null,
    [blockedVerificationsByType],
  );

  const selectedTypeBlockingVerification = blockedVerificationsByType[form.documentType] ?? null;
  const selectedTypeIsBlocked = !!selectedTypeBlockingVerification;
  const requiresBackPhoto = form.documentType !== 'PASAPORTE';

  const isSubmitting = submitting || uploading;
  const combinedError = localError || error;
  const canSubmit = useMemo(
    () => form.documentNumber.trim().length >= 5
      && !!photos.documentFront
      && (!requiresBackPhoto || !!photos.documentBack)
      && !!photos.selfie
      && !selectedTypeIsBlocked,
    [
      form.documentNumber,
      photos.documentBack,
      photos.documentFront,
      photos.selfie,
      requiresBackPhoto,
      selectedTypeIsBlocked,
    ],
  );

  useEffect(() => {
    if (!selectedTypeIsBlocked || !firstAvailableDocumentType) return;
    dispatch({ type: 'SET_DOC_TYPE', value: firstAvailableDocumentType });
  }, [firstAvailableDocumentType, selectedTypeIsBlocked]);

  useEffect(() => {
    if (requiresBackPhoto || !photos.documentBack) return;
    setPhotos((current) => ({ ...current, documentBack: null }));
  }, [photos.documentBack, requiresBackPhoto]);

  const openCapture = (target: CaptureTarget) => {
    if (selectedTypeIsBlocked) {
      Alert.alert(
        'Documento ya registrado',
        `Ya tienes una verificación ${selectedTypeBlockingVerification?.status === 'VERIFIED' ? 'aprobada' : 'pendiente'} para ${getDocumentTypeLabel(form.documentType)}.`,
      );
      return;
    }

    clearError();
    setLocalError(null);
    setActiveCapture(target);
  };

  const handleSelectDocumentType = (type: DocumentType) => {
    const blockingVerification = blockedVerificationsByType[type];

    if (blockingVerification) {
      Alert.alert(
        'Documento ya registrado',
        `No puedes crear otra verificación de ${getDocumentTypeLabel(type)} porque ya tienes una ${blockingVerification.status === 'VERIFIED' ? 'aprobada' : 'pendiente'} de este mismo tipo.`,
      );
      return;
    }

    clearError();
    setLocalError(null);
    dispatch({ type: 'SET_DOC_TYPE', value: type });
  };

  const handleCapturedPhoto = (photo: CapturedPhoto) => {
    if (!activeCapture) return;

    setPhotos((current) => ({ ...current, [activeCapture]: photo }));
    setActiveCapture(null);
    clearError();
    setLocalError(null);
  };

  const validateBeforeSubmit = () => {
    if (selectedTypeIsBlocked) {
      Alert.alert(
        'Documento ya registrado',
        `No puedes enviar otra verificación de ${getDocumentTypeLabel(form.documentType)} porque ya existe una ${selectedTypeBlockingVerification?.status === 'VERIFIED' ? 'aprobada' : 'pendiente'} para este tipo.`,
      );
      return false;
    }

    if (!form.documentNumber.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu número de documento.');
      return false;
    }

    if (form.documentNumber.trim().length < 5) {
      Alert.alert('Documento inválido', 'El número de documento debe tener al menos 5 caracteres.');
      return false;
    }

    if (!photos.documentFront) {
      Alert.alert('Falta el documento frontal', 'Debes capturar el frente del documento.');
      return false;
    }

    if (requiresBackPhoto && !photos.documentBack) {
      Alert.alert('Falta el respaldo del documento', 'Debes capturar la parte posterior del documento.');
      return false;
    }

    if (!photos.selfie) {
      Alert.alert('Selfie obligatoria', 'Debes tomarte una selfie con el documento antes de enviar la verificación.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    try {
      clearError();
      setLocalError(null);
      setUploading(true);

      const timestamp = Date.now();
      const folder = 'parlando/verifications';

      const documentFrontUpload = uploadImageToCloudinary(photos.documentFront!.uri, {
        folder,
        publicId: `${form.documentType.toLowerCase()}-front-${timestamp}`,
      });

      const documentBackUpload = requiresBackPhoto
        ? uploadImageToCloudinary(photos.documentBack!.uri, {
          folder,
          publicId: `${form.documentType.toLowerCase()}-back-${timestamp}`,
        })
        : Promise.resolve('');

      const selfieUpload = uploadImageToCloudinary(photos.selfie!.uri, {
        folder,
        publicId: `${form.documentType.toLowerCase()}-selfie-${timestamp}`,
      });

      const [documentFrontUrl, documentBackUrl, selfieUrl] = await Promise.all([
        documentFrontUpload,
        documentBackUpload,
        selfieUpload,
      ]);

      const payload: SubmitVerificationRequest = {
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        documentFrontUrl,
        documentBackUrl: requiresBackPhoto ? documentBackUrl : documentFrontUrl,
        selfieUrl,
      };

      const success = await submitVerification(payload);
      if (!success) return;

      Toast.show({
        type: 'success',
        text1: 'Verificación enviada',
        text2: 'Tu identidad será revisada manualmente desde el panel administrativo.',
      });
      router.back();
    } catch (uploadError: any) {
      setLocalError(
        uploadError?.message ?? 'No se pudieron cargar las fotos. Intenta nuevamente.',
      );
    } finally {
      setUploading(false);
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
          <View className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-sm text-blue-800 leading-5">
              Esta verificación se revisará manualmente en el admin panel. Captura fotos nítidas del documento y una selfie obligatoria para agilizar la aprobación.
            </Text>
          </View>

          <Text className="text-sm font-medium text-neutral-700 mb-2">
            Tipo de documento
          </Text>
          <TouchableOpacity
            onPress={() => dispatch({ type: 'TOGGLE_PICKER' })}
            activeOpacity={0.7}
            disabled={!firstAvailableDocumentType}
          >
            <Card className={`mb-2 ${!firstAvailableDocumentType ? 'opacity-60' : ''}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-10 h-10 rounded-xl bg-primary-50 items-center justify-center mr-3">
                    {documentTypes.find((d) => d.type === form.documentType)?.icon}
                  </View>
                  <Text className="text-base font-medium text-neutral-800 flex-1">
                    {firstAvailableDocumentType ? getDocumentTypeLabel(form.documentType) : 'Sin documentos disponibles'}
                  </Text>
                </View>
                <ChevronDown size={20} color={Colors.neutral[400]} />
              </View>
            </Card>
          </TouchableOpacity>

          {!firstAvailableDocumentType && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-amber-800 leading-5">
                Ya tienes verificaciones pendientes o aprobadas para todos los tipos de documento disponibles. Solo podrás volver a enviar cuando una verificación sea rechazada o expire.
              </Text>
            </View>
          )}

          {form.showPicker && (
            <Card className="mb-4">
              {documentTypes.map(({ type, icon }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleSelectDocumentType(type)}
                  className={`flex-row items-center py-3 px-2 ${type === form.documentType ? 'bg-primary-50 rounded-xl' : ''
                    }`}
                  disabled={!!blockedVerificationsByType[type]}
                  activeOpacity={0.6}
                >
                  <View className="mr-3">{icon}</View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm ${!!blockedVerificationsByType[type]
                        ? 'text-neutral-400'
                        : type === form.documentType
                          ? 'font-semibold text-primary-700'
                          : 'text-neutral-700'
                        }`}
                    >
                      {getDocumentTypeLabel(type)}
                    </Text>
                    {blockedVerificationsByType[type] && (
                      <Text className="text-xs text-amber-700 mt-0.5">
                        Ya existe una verificación {blockedVerificationsByType[type]?.status === 'VERIFIED' ? 'aprobada' : 'pendiente'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          {selectedTypeIsBlocked && selectedTypeBlockingVerification && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-amber-800 leading-5">
                Ya tienes una verificación {selectedTypeBlockingVerification.status === 'VERIFIED' ? 'aprobada' : 'pendiente'} para {getDocumentTypeLabel(form.documentType)}. No se permite crear otra del mismo tipo.
              </Text>
            </View>
          )}

          <Input
            label="Número de documento"
            placeholder="Ingresa tu número de documento"
            keyboardType="default"
            value={form.documentNumber}
            onChangeText={(value) => {
              clearError();
              setLocalError(null);
              dispatch({ type: 'SET_DOC_NUMBER', value });
            }}
            containerClassName="mb-6"
          />

          <Text className="text-base font-semibold text-neutral-900 mb-3">
            Fotos del documento
          </Text>

          <View key={`doc-photos-${form.documentType}`} className="flex-row gap-3 mb-2">
            <CaptureSlot
              target="documentFront"
              photo={photos.documentFront}
              onPress={() => openCapture('documentFront')}
              fullWidth={!requiresBackPhoto}
            />
            {requiresBackPhoto && (
              <CaptureSlot
                target="documentBack"
                photo={photos.documentBack}
                onPress={() => openCapture('documentBack')}
              />
            )}
          </View>

          {!requiresBackPhoto && (
            <Text className="text-xs text-neutral-500 mb-6">
              Para pasaporte solo se requiere la foto frontal y la selfie.
            </Text>
          )}

          <Text className="text-sm font-medium text-neutral-700 mb-2">
            Selfie con documento
          </Text>
          <CaptureSlot
            target="selfie"
            photo={photos.selfie}
            onPress={() => openCapture('selfie')}
            fullWidth
            className="mb-6"
          />

          <Card className="mb-6 bg-primary-50 border-primary-100">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-full bg-white items-center justify-center mr-3">
                <CheckCircle2 size={18} color={Colors.primary[600]} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-primary-800 mb-1">
                  Checklist antes de enviar
                </Text>
                <Text className="text-sm text-primary-700 leading-5">
                  Frente legible y selfie visible con buena iluminación. Si el documento tiene reverso, también debe verse nítido. Las fotos se subirán a Cloudinary solo cuando pulses enviar verificación.
                </Text>
              </View>
            </View>
          </Card>

          {combinedError && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{combinedError}</Text>
            </View>
          )}

          <Button
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
          >
            {uploading ? 'Cargando fotos...' : 'Enviar verificación'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <CapturePhotoModal
        visible={!!activeCapture}
        target={activeCapture}
        onClose={() => setActiveCapture(null)}
        onCapture={handleCapturedPhoto}
      />
    </Screen>
  );
}

function CaptureSlot({
  target,
  photo,
  onPress,
  fullWidth = false,
  className = '',
}: {
  target: CaptureTarget;
  photo: CapturedPhoto | null;
  onPress: () => void;
  fullWidth?: boolean;
  className?: string;
}) {
  const content = captureCardContent[target];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      className={`${fullWidth ? 'w-full' : 'flex-1'} ${className}`}
    >
      <View className="bg-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 overflow-hidden min-h-[144px]">
        {photo?.uri ? (
          <>
            <Image source={{ uri: photo.uri }} className="w-full h-40" resizeMode="cover" />
            <View className="px-4 py-3 bg-white">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-semibold text-neutral-900">{content.title}</Text>
                <View className="flex-row items-center">
                  <CheckCircle2 size={16} color={Colors.semantic.success} />
                  <Text className="text-xs font-semibold text-green-700 ml-1">Lista</Text>
                </View>
              </View>
              <Text className="text-xs text-neutral-500 leading-4">{content.subtitle}</Text>
              <View className="flex-row items-center mt-2">
                <RefreshCw size={14} color={Colors.primary[600]} />
                <Text className="text-xs font-semibold text-primary-700 ml-1.5">Tomar de nuevo</Text>
              </View>
            </View>
          </>
        ) : (
          <View className="flex-1 items-center justify-center px-4 py-5">
            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
              {content.icon}
            </View>
            <Text className="text-sm font-semibold text-neutral-800 text-center">
              {content.title}
            </Text>
            <Text className="text-xs text-neutral-500 mt-1 text-center leading-4">
              {content.subtitle}
            </Text>
            <Text className="text-[11px] font-semibold text-accent-700 mt-3 uppercase tracking-wide">
              {content.requiredLabel}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
