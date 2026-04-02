import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Camera, Car, ChevronDown, CreditCard, FileText, Plus, Upload, X } from 'lucide-react-native';
import { Screen, Button, Input, Card } from '@/components/ui';
import { useVehicles } from '@/hooks/useVehicles';
import { Colors } from '@/constants/colors';
import { uploadFileToCloudinary, uploadImageToCloudinary } from '@/lib/cloudinary';
import { verificationsApi } from '@/api/verifications';
import {
  CapturePhotoModal,
  type CapturedPhoto,
  type CapturePhotoConfig,
} from '@/components/verification/CapturePhotoModal';
import type { CreateVehicleRequest, IdentityVerificationResponse } from '@/types/api';
import Toast from 'react-native-toast-message';

interface VehicleFormState {
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  capacity: string;
  driverLicenseNumber: string;
}

type VehicleFormAction =
  | { type: 'SET'; field: keyof VehicleFormState; value: string; }
  | { type: 'RESET'; };

interface LocalAsset {
  uri: string;
}

interface LocalDocument {
  uri: string;
  name: string;
  mimeType: string;
}

interface UploadCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  preview?: string;
  fileLabel?: string;
  onPick: () => void;
  onRemove?: () => void;
}

interface PendingCameraCapture {
  config: CapturePhotoConfig;
  onCaptured: (asset: LocalAsset) => void;
}

const initialState: VehicleFormState = {
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  capacity: '4',
  driverLicenseNumber: '',
};

const LICENSE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  VERIFIED: 'Verificada',
};

function formReducer(state: VehicleFormState, action: VehicleFormAction): VehicleFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
  }
}

function pickFirstAsset(result: ImagePicker.ImagePickerResult): LocalAsset | null {
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return { uri: result.assets[0].uri };
}

async function requestMediaPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Debes permitir acceso a la galería para seleccionar archivos.');
  }
}

async function pickImageFromLibrary() {
  await requestMediaPermission();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });
  return pickFirstAsset(result);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHumanDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function licenseOptionLabel(license: IdentityVerificationResponse, index: number): string {
  const status = LICENSE_STATUS_LABEL[license.status] ?? license.status;
  return `Licencia ${index + 1} · ${status}`;
}

function UploadCard({ title, description, icon, preview, fileLabel, onPick, onRemove }: UploadCardProps) {
  return (
    <Card className="mb-4">
      <TouchableOpacity className="flex-row items-center py-2" onPress={onPick} activeOpacity={0.8}>
        <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
          {icon}
        </View>
        <View className="flex-1 pr-3">
          <Text className="text-base text-neutral-800">{title}</Text>
          <Text className="text-xs text-neutral-400 mt-0.5">{description}</Text>
          {!!fileLabel && (
            <Text className="text-xs text-primary-700 mt-1" numberOfLines={1}>
              {fileLabel}
            </Text>
          )}
        </View>
        <View className="items-end">
          {preview ? (
            <>
              <Image source={{ uri: preview }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
              {onRemove && (
                <TouchableOpacity onPress={onRemove} className="mt-2" hitSlop={8}>
                  <Text className="text-xs font-medium text-red-500">Quitar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : fileLabel ? (
            <>
              <View className="w-14 h-14 rounded-xl bg-neutral-100 items-center justify-center">
                <FileText size={20} color={Colors.neutral[600]} />
              </View>
              {onRemove && (
                <TouchableOpacity onPress={onRemove} className="mt-2" hitSlop={8}>
                  <Text className="text-xs font-medium text-red-500">Quitar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View className="items-center">
              <Upload size={18} color={Colors.primary[600]} />
              <Text className="text-xs font-medium text-primary-600 mt-1">Cargar</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
}

export default function AddVehicleScreen() {
  const router = useRouter();
  const { createVehicle, submitting, error, clearError } = useVehicles();
  const [form, dispatch] = useReducer(formReducer, initialState);
  const [uploading, setUploading] = useState(false);

  // Licencias existentes
  const [existingLicenses, setExistingLicenses] = useState<IdentityVerificationResponse[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [showNewLicenseForm, setShowNewLicenseForm] = useState(false);
  const [showLicenseDropdown, setShowLicenseDropdown] = useState(false);

  const [vehiclePhotos, setVehiclePhotos] = useState<LocalAsset[]>([]);
  const [soatDocument, setSoatDocument] = useState<LocalDocument | null>(null);
  const [transitCardDocument, setTransitCardDocument] = useState<LocalAsset | null>(null);
  const [driverLicenseFront, setDriverLicenseFront] = useState<LocalAsset | null>(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState<LocalAsset | null>(null);
  const [soatExpiryDate, setSoatExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [iosDateDraft, setIosDateDraft] = useState<Date>(new Date());
  const [pendingCameraCapture, setPendingCameraCapture] = useState<PendingCameraCapture | null>(null);

  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const soatExpiry = soatExpiryDate ? formatIsoDate(soatExpiryDate) : null;

  useEffect(() => {
    let mounted = true;

    const fetchLicenses = async () => {
      try {
        const { data: res } = await verificationsApi.getMine();
        const licenses = (res.data ?? []).filter(
          (v) => v.documentType === 'LICENCIA_CONDUCCION'
            && v.status !== 'REJECTED'
            && v.status !== 'EXPIRED',
        );
        if (mounted) {
          setExistingLicenses(licenses);
          if (licenses.length === 1) {
            setSelectedLicenseId(licenses[0].id);
          } else if (licenses.length === 0) {
            setShowNewLicenseForm(true);
          }
        }
      } catch {
        // si falla, dejar al usuario agregar manualmente
        if (mounted) setShowNewLicenseForm(true);
      } finally {
        if (mounted) setLoadingLicenses(false);
      }
    };

    void fetchLicenses();

    return () => {
      mounted = false;
    };
  }, []);

  const openSoatDatePicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      setIosDateDraft(soatExpiryDate ?? new Date());
    }
    setShowDatePicker(true);
  }, [soatExpiryDate]);

  const closeSoatDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const confirmSoatDatePicker = useCallback(() => {
    setSoatExpiryDate(iosDateDraft);
    setShowDatePicker(false);
  }, [iosDateDraft]);

  const handleSelectLicense = useCallback((id: string | null) => {
    setSelectedLicenseId(id);
    setShowNewLicenseForm(false);
    setShowLicenseDropdown(false);
  }, []);

  const handleToggleNewLicenseForm = useCallback(() => {
    setShowNewLicenseForm((prev) => {
      if (!prev) {
        setSelectedLicenseId(null);
      }
      return !prev;
    });
  }, []);

  const setField = (field: keyof VehicleFormState, value: string) => {
    if (error) clearError();
    dispatch({ type: 'SET', field, value });
  };

  const openCameraOverlay = useCallback((capture: PendingCameraCapture) => {
    setPendingCameraCapture(capture);
  }, []);

  const pickImageAsset = useCallback((onSelected: (asset: LocalAsset) => void, config: CapturePhotoConfig) => {
    Alert.alert('Adjuntar imagen', 'Selecciona cómo quieres cargar la imagen.', [
      {
        text: 'Tomar foto',
        onPress: () => openCameraOverlay({ config, onCaptured: onSelected }),
      },
      {
        text: 'Galería',
        onPress: () => {
          void (async () => {
            try {
              const asset = await pickImageFromLibrary();
              if (asset) onSelected(asset);
            } catch (pickError: any) {
              Alert.alert('No se pudo abrir la galería', pickError?.message ?? 'Inténtalo de nuevo.');
            }
          })();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [openCameraOverlay]);

  const pickSoatPdfFromGallery = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setSoatDocument({
        uri: file.uri,
        name: file.name || `soat-${Date.now()}.pdf`,
        mimeType: file.mimeType || 'application/pdf',
      });
    } catch (pickError: any) {
      Alert.alert('No se pudo seleccionar el PDF', pickError?.message ?? 'Inténtalo de nuevo.');
    }
  }, []);

  const addVehiclePhoto = useCallback(() => {
    if (vehiclePhotos.length >= 4) {
      Alert.alert('Límite alcanzado', 'Puedes cargar hasta 4 fotos del vehículo.');
      return;
    }

    pickImageAsset(
      (asset) => {
        setVehiclePhotos((current) => [...current, asset]);
      },
      {
        title: 'Foto del vehículo',
        description: 'Centra el vehículo completo dentro del marco y evita reflejos fuertes.',
        hint: 'Toma la foto en un lugar iluminado y con buen enfoque.',
        frameAspectRatio: 1.4,
        useFrontCamera: false,
        frameRadius: 20,
      },
    );
  }, [pickImageAsset, vehiclePhotos.length]);

  const removeVehiclePhoto = (index: number) => {
    setVehiclePhotos((current) => current.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!form.plateNumber || !form.brand || !form.model || !form.year || !form.color) {
      Alert.alert('Campos requeridos', 'Completa placa, marca, modelo, año y color.');
      return false;
    }

    const year = Number.parseInt(form.year, 10);
    const maxVehicleYear = new Date().getFullYear() + 1;
    if (Number.isNaN(year) || year < 1980 || year > maxVehicleYear) {
      Alert.alert('Año inválido', `Ingresa un año válido entre 1980 y ${maxVehicleYear}.`);
      return false;
    }

    const capacity = Number.parseInt(form.capacity, 10);
    if (Number.isNaN(capacity) || capacity < 1 || capacity > 8) {
      Alert.alert('Capacidad inválida', 'La capacidad debe estar entre 1 y 8 pasajeros.');
      return false;
    }

    if (!soatExpiry) {
      Alert.alert('Fecha inválida', 'Selecciona una fecha válida para el vencimiento del SOAT.');
      return false;
    }

    if (soatExpiry < todayIso) {
      Alert.alert('SOAT vencido', 'La fecha del SOAT no puede ser anterior al día actual.');
      return false;
    }

    if (vehiclePhotos.length === 0) {
      Alert.alert('Falta información', 'Debes cargar al menos una foto exterior del vehículo.');
      return false;
    }

    if (!soatDocument) {
      Alert.alert('Falta información', 'Debes cargar el SOAT en formato PDF desde la galería.');
      return false;
    }

    if (!transitCardDocument) {
      Alert.alert('Falta información', 'Debes cargar la tarjeta de propiedad.');
      return false;
    }

    if (showNewLicenseForm) {
      const hasNumber = !!form.driverLicenseNumber.trim();
      const hasFront = !!driverLicenseFront;
      const hasBack = !!driverLicenseBack;
      if (!hasNumber || !hasFront || !hasBack) {
        Alert.alert(
          'Licencia incompleta',
          'Para registrar una nueva licencia debes completar número, foto frontal y foto posterior.',
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!soatDocument || !transitCardDocument || !soatExpiry) return;

    try {
      setUploading(true);

      const plateNumber = form.plateNumber.trim().toUpperCase();
      const timestamp = Date.now();
      const [photoUrls, soatDocumentUrl, transitCardUrl] = await Promise.all([
        Promise.all(
          vehiclePhotos.map((photo, index) =>
            uploadImageToCloudinary(photo.uri, {
              folder: 'parlando/vehicles/photos',
              publicId: `${plateNumber.toLowerCase()}-${timestamp}-${index + 1}`,
            }),
          ),
        ),
        uploadFileToCloudinary(
          {
            uri: soatDocument.uri,
            name: soatDocument.name,
            type: soatDocument.mimeType,
          },
          {
            folder: 'parlando/vehicles/soat',
            publicId: `${plateNumber.toLowerCase()}-soat-${timestamp}`,
          },
        ),
        uploadImageToCloudinary(transitCardDocument.uri, {
          folder: 'parlando/vehicles/transit-card',
          publicId: `${plateNumber.toLowerCase()}-transit-${timestamp}`,
        }),
      ]);

      let driverLicense: CreateVehicleRequest['driverLicense'];
      if (showNewLicenseForm && form.driverLicenseNumber && driverLicenseFront && driverLicenseBack) {
        const [documentFrontUrl, documentBackUrl] = await Promise.all([
          uploadImageToCloudinary(driverLicenseFront.uri, {
            folder: 'parlando/vehicles/driver-license',
            publicId: `${plateNumber.toLowerCase()}-license-front-${timestamp}`,
          }),
          uploadImageToCloudinary(driverLicenseBack.uri, {
            folder: 'parlando/vehicles/driver-license',
            publicId: `${plateNumber.toLowerCase()}-license-back-${timestamp}`,
          }),
        ]);

        driverLicense = {
          licenseNumber: form.driverLicenseNumber.trim().toUpperCase(),
          documentFrontUrl,
          documentBackUrl,
        };
      }

      const payload: CreateVehicleRequest = {
        plateNumber,
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number.parseInt(form.year, 10),
        color: form.color.trim(),
        capacity: Number.parseInt(form.capacity, 10),
        photoUrls,
        soatDocumentUrl,
        soatExpiry,
        transitCardUrl,
        ...(driverLicense ? { driverLicense } : {}),
      };

      const success = await createVehicle(payload);
      if (!success) return;

      Toast.show({
        type: 'success',
        text1: 'Vehículo registrado',
        text2: `${payload.brand} ${payload.model} agregado correctamente`,
      });
      router.back();
    } catch (submitError: any) {
      Alert.alert(
        'No se pudo registrar el vehículo',
        submitError?.message ?? 'Ocurrió un error subiendo los archivos. Inténtalo de nuevo.',
      );
    } finally {
      setUploading(false);
    }
  };

  const selectedLicense = existingLicenses.find((l) => l.id === selectedLicenseId);
  const selectedLicenseIndex = existingLicenses.findIndex((l) => l.id === selectedLicenseId);

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
          <View className="gap-4 mb-6">
            <View className="flex-row gap-3">
              <View className="w-32">
                <Input
                  label="Placa *"
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  value={form.plateNumber}
                  onChangeText={(value) => setField('plateNumber', value.replace(/[^a-zA-Z0-9]/g, ''))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Marca *"
                  placeholder="Toyota"
                  value={form.brand}
                  onChangeText={(value) => setField('brand', value)}
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
                  onChangeText={(value) => setField('year', value.replace(/\D/g, ''))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Modelo *"
                  placeholder="Corolla"
                  value={form.model}
                  onChangeText={(value) => setField('model', value)}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Color *"
                  placeholder="Blanco"
                  value={form.color}
                  onChangeText={(value) => setField('color', value)}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Capacidad *"
                  placeholder="4"
                  keyboardType="number-pad"
                  maxLength={1}
                  value={form.capacity}
                  onChangeText={(value) => setField('capacity', value.replace(/\D/g, ''))}
                  hint="Asientos disponibles (1-8)"
                />
              </View>
            </View>
          </View>

          <Text className="text-base font-semibold text-neutral-900 mb-2">
            Vencimiento SOAT *
          </Text>
          <TouchableOpacity
            onPress={openSoatDatePicker}
            activeOpacity={0.8}
            className="border border-neutral-200 rounded-2xl px-4 py-3 bg-white mb-6"
          >
            <Text className={soatExpiry ? 'text-neutral-900' : 'text-neutral-400'}>
              {soatExpiry ? formatHumanDate(soatExpiry) : 'Seleccionar fecha en calendario'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && Platform.OS !== 'ios' && (
            <DateTimePicker
              value={soatExpiryDate ?? new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onValueChange={(_, date) => {
                setSoatExpiryDate(date);
                setShowDatePicker(false);
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}

          <Text className="text-base font-semibold text-neutral-900 mb-3">
            Archivos requeridos
          </Text>

          <Card className="mb-4">
            <TouchableOpacity className="py-2" onPress={addVehiclePhoto} activeOpacity={0.8}>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                  <Camera size={24} color={Colors.primary[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-base text-neutral-800">Fotos del vehículo *</Text>
                  <Text className="text-xs text-neutral-400 mt-0.5">
                    Agrega entre 1 y 4 fotos exteriores claras.
                  </Text>
                </View>
                <View className="items-center">
                  <Upload size={18} color={Colors.primary[600]} />
                  <Text className="text-xs font-medium text-primary-600 mt-1">Agregar</Text>
                </View>
              </View>
            </TouchableOpacity>

            {vehiclePhotos.length > 0 && (
              <View className="flex-row flex-wrap gap-3 mt-4">
                {vehiclePhotos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} className="relative">
                    <Image source={{ uri: photo.uri }} className="w-20 h-20 rounded-2xl" resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => removeVehiclePhoto(index)}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/70 items-center justify-center"
                      activeOpacity={0.8}
                    >
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <UploadCard
            title="SOAT (PDF) *"
            description="Selecciona el PDF del SOAT desde la galería/archivos del dispositivo."
            icon={<Car size={24} color={Colors.accent[600]} />}
            fileLabel={soatDocument?.name}
            onPick={() => { void pickSoatPdfFromGallery(); }}
            onRemove={soatDocument ? () => setSoatDocument(null) : undefined}
          />

          <UploadCard
            title="Tarjeta de propiedad *"
            description="Carga una imagen clara del documento completo."
            icon={<FileText size={24} color={Colors.primary[600]} />}
            preview={transitCardDocument?.uri}
            onPick={() => pickImageAsset(setTransitCardDocument, {
              title: 'Tarjeta de propiedad',
              description: 'Alinea la tarjeta completa dentro del marco y evita sombras.',
              hint: 'Asegúrate de que el texto sea legible en toda la imagen.',
              frameAspectRatio: 1.58,
              useFrontCamera: false,
              frameRadius: 20,
            })}
            onRemove={transitCardDocument ? () => setTransitCardDocument(null) : undefined}
          />

          {/* ── Licencia de conducción ── */}
          <Text className="text-base font-semibold text-neutral-900 mb-2 mt-2">
            Licencia de conducción
          </Text>

          {loadingLicenses ? (
            <Text className="text-sm text-neutral-500 mb-4">
              Cargando licencias registradas...
            </Text>
          ) : (
            <View className="flex-row items-center gap-2 mb-4">
              <TouchableOpacity
                onPress={() => existingLicenses.length > 0 && setShowLicenseDropdown(true)}
                activeOpacity={existingLicenses.length > 0 ? 0.8 : 1}
                className="flex-1 flex-row items-center justify-between border border-neutral-200 rounded-2xl px-4 py-3 bg-white"
              >
                <Text className={selectedLicense ? 'text-neutral-900' : 'text-neutral-400'}>
                  {selectedLicense
                    ? licenseOptionLabel(selectedLicense, selectedLicenseIndex)
                    : existingLicenses.length > 0
                      ? 'Sin licencia seleccionada'
                      : 'Sin licencias registradas'}
                </Text>
                {existingLicenses.length > 0 && (
                  <ChevronDown size={16} color={Colors.neutral[400]} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleNewLicenseForm}
                activeOpacity={0.8}
                className={`w-11 h-11 rounded-2xl items-center justify-center ${showNewLicenseForm ? 'bg-primary-600' : 'bg-primary-50'}`}
              >
                <Plus size={20} color={showNewLicenseForm ? '#FFF' : Colors.primary[600]} />
              </TouchableOpacity>
            </View>
          )}

          {showNewLicenseForm && (
            <>
              <Input
                label="Número de licencia *"
                placeholder="123456789"
                value={form.driverLicenseNumber}
                onChangeText={(value) => setField('driverLicenseNumber', value)}
                containerClassName="mb-4"
              />

              <UploadCard
                title="Licencia frontal *"
                description="Foto del frente de la licencia de conducción."
                icon={<CreditCard size={24} color={Colors.primary[600]} />}
                preview={driverLicenseFront?.uri}
                onPick={() => pickImageAsset(setDriverLicenseFront, {
                  title: 'Licencia frontal',
                  description: 'Alinea el frente de la licencia dentro del marco.',
                  hint: 'Evita reflejos y captura todos los bordes.',
                  frameAspectRatio: 1.58,
                  useFrontCamera: false,
                  frameRadius: 20,
                })}
                onRemove={driverLicenseFront ? () => setDriverLicenseFront(null) : undefined}
              />

              <UploadCard
                title="Licencia posterior *"
                description="Foto del respaldo de la licencia de conducción."
                icon={<CreditCard size={24} color={Colors.primary[600]} />}
                preview={driverLicenseBack?.uri}
                onPick={() => pickImageAsset(setDriverLicenseBack, {
                  title: 'Licencia posterior',
                  description: 'Alinea el respaldo de la licencia dentro del marco.',
                  hint: 'Asegúrate de que toda la información sea legible.',
                  frameAspectRatio: 1.58,
                  useFrontCamera: false,
                  frameRadius: 20,
                })}
                onRemove={driverLicenseBack ? () => setDriverLicenseBack(null) : undefined}
              />
            </>
          )}

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <Button
            onPress={handleSubmit}
            loading={submitting || uploading || loadingLicenses}
            disabled={loadingLicenses}
            size="lg"
            className="w-full"
          >
            {uploading ? 'Subiendo archivos...' : 'Registrar vehículo'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <CapturePhotoModal
        visible={!!pendingCameraCapture}
        target={pendingCameraCapture ? 'documentFront' : null}
        customConfig={pendingCameraCapture?.config}
        onClose={() => setPendingCameraCapture(null)}
        onCapture={(photo: CapturedPhoto) => {
          if (pendingCameraCapture) {
            pendingCameraCapture.onCaptured({ uri: photo.uri });
          }
          setPendingCameraCapture(null);
        }}
      />

      {/* Dropdown de licencias */}
      {showLicenseDropdown && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowLicenseDropdown(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/35 justify-end"
            activeOpacity={1}
            onPress={() => setShowLicenseDropdown(false)}
          >
            <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
              <Text className="text-base font-semibold text-neutral-900 mb-4">
                Seleccionar licencia
              </Text>

              <TouchableOpacity
                onPress={() => handleSelectLicense(null)}
                activeOpacity={0.8}
                className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 ${selectedLicenseId === null ? 'bg-primary-50' : 'bg-neutral-50'}`}
              >
                <Text className={`flex-1 text-sm ${selectedLicenseId === null ? 'font-semibold text-primary-700' : 'text-neutral-700'}`}>
                  Sin licencia
                </Text>
              </TouchableOpacity>

              {existingLicenses.map((license, index) => (
                <TouchableOpacity
                  key={license.id}
                  onPress={() => handleSelectLicense(license.id)}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 ${selectedLicenseId === license.id ? 'bg-primary-50' : 'bg-neutral-50'}`}
                >
                  <View className="flex-1">
                    <Text className={`text-sm ${selectedLicenseId === license.id ? 'font-semibold text-primary-700' : 'text-neutral-700'}`}>
                      {licenseOptionLabel(license, index)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Date picker iOS */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeSoatDatePicker}
        >
          <View className="flex-1 bg-black/35 justify-end">
            <View className="bg-white rounded-t-3xl px-5 pt-4 pb-6">
              <View className="flex-row items-center justify-between mb-3">
                <TouchableOpacity onPress={closeSoatDatePicker} hitSlop={8}>
                  <Text className="text-sm font-semibold text-neutral-500">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold text-neutral-900">Vencimiento SOAT</Text>
                <TouchableOpacity onPress={confirmSoatDatePicker} hitSlop={8}>
                  <Text className="text-sm font-semibold text-primary-700">Confirmar</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={iosDateDraft}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                themeVariant="light"
                onValueChange={(_, date) => setIosDateDraft(date)}
              />
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}
