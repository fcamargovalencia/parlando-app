import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehicleDocuments } from '@/hooks/features/useVehicleDocuments';
import { uploadFileToCloudinary, uploadImageToCloudinary } from '@/lib/cloudinary';
import { verificationsApi } from '@/api/verifications';
import type { CreateVehicleRequest, IdentityVerificationResponse } from '@/types/api';
import Toast from 'react-native-toast-message';

export interface VehicleFormState {
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  capacity: string;
  driverLicenseNumber: string;
}

type VehicleFormAction =
  | { type: 'SET'; field: keyof VehicleFormState; value: string }
  | { type: 'RESET' };

const initialFormState: VehicleFormState = {
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  capacity: '4',
  driverLicenseNumber: '',
};

function formReducer(state: VehicleFormState, action: VehicleFormAction): VehicleFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialFormState;
  }
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatHumanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function licenseOptionLabel(license: IdentityVerificationResponse, index: number): string {
  const STATUS_LABEL: Record<string, string> = { PENDING: 'Pendiente', VERIFIED: 'Verificada' };
  const status = STATUS_LABEL[license.status] ?? license.status;
  return `Licencia ${index + 1} · ${status}`;
}

export function useVehicleAddScreen() {
  const router = useRouter();
  const { createVehicle, submitting, error, clearError } = useVehicles();
  const docs = useVehicleDocuments();

  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const [uploading, setUploading] = useState(false);
  const [soatExpiryDate, setSoatExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [existingLicenses, setExistingLicenses] = useState<IdentityVerificationResponse[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [showNewLicenseForm, setShowNewLicenseForm] = useState(false);
  const [showLicenseDropdown, setShowLicenseDropdown] = useState(false);

  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const soatExpiry = soatExpiryDate ? formatIsoDate(soatExpiryDate) : null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: res } = await verificationsApi.getMine();
        const rawData = (res as any)?.data;
        const verifications: IdentityVerificationResponse[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];
        const licenses = verifications.filter(
          (v) =>
            v.documentType === 'LICENCIA_CONDUCCION' &&
            v.status !== 'REJECTED' &&
            v.status !== 'EXPIRED',
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
        if (mounted) setShowNewLicenseForm(true);
      } finally {
        if (mounted) setLoadingLicenses(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setField = useCallback(
    (field: keyof VehicleFormState, value: string) => {
      if (error) clearError();
      dispatch({ type: 'SET', field, value });
    },
    [error, clearError],
  );

  const handleSelectLicense = useCallback((id: string | null) => {
    setSelectedLicenseId(id);
    setShowNewLicenseForm(false);
    setShowLicenseDropdown(false);
  }, []);

  const handleToggleNewLicenseForm = useCallback(() => {
    setShowNewLicenseForm((prev) => {
      if (!prev) setSelectedLicenseId(null);
      return !prev;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const { plateNumber, brand, model, year, color, capacity, driverLicenseNumber } = form;
    if (!plateNumber || !brand || !model || !year || !color) {
      Alert.alert('Campos requeridos', 'Completa placa, marca, modelo, año y color.');
      return false;
    }
    const yearNum = Number.parseInt(year, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (Number.isNaN(yearNum) || yearNum < 1980 || yearNum > maxYear) {
      Alert.alert('Año inválido', `Ingresa un año válido entre 1980 y ${maxYear}.`);
      return false;
    }
    const cap = Number.parseInt(capacity, 10);
    if (Number.isNaN(cap) || cap < 1 || cap > 8) {
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
    if (docs.vehiclePhotos.length === 0) {
      Alert.alert('Falta información', 'Debes cargar al menos una foto exterior del vehículo.');
      return false;
    }
    if (!docs.soatDocument) {
      Alert.alert('Falta información', 'Debes cargar el SOAT en formato PDF desde la galería.');
      return false;
    }
    if (!docs.transitCardDocument) {
      Alert.alert('Falta información', 'Debes cargar la tarjeta de propiedad.');
      return false;
    }
    if (showNewLicenseForm) {
      if (!driverLicenseNumber.trim() || !docs.driverLicenseFront || !docs.driverLicenseBack) {
        Alert.alert(
          'Licencia incompleta',
          'Para registrar una nueva licencia debes completar número, foto frontal y foto posterior.',
        );
        return false;
      }
    }
    return true;
  }, [form, soatExpiry, todayIso, docs, showNewLicenseForm]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    if (!docs.soatDocument || !docs.transitCardDocument || !soatExpiry) return;

    try {
      setUploading(true);
      const plateNumber = form.plateNumber.trim().toUpperCase();
      const timestamp = Date.now();

      const [photoUrls, soatDocumentUrl, transitCardUrl] = await Promise.all([
        Promise.all(
          docs.vehiclePhotos.map((photo, index) =>
            uploadImageToCloudinary(photo.uri, {
              folder: 'parlando/vehicles/photos',
              publicId: `${plateNumber.toLowerCase()}-${timestamp}-${index + 1}`,
            }),
          ),
        ),
        uploadFileToCloudinary(
          {
            uri: docs.soatDocument.uri,
            name: docs.soatDocument.name,
            type: docs.soatDocument.mimeType,
          },
          {
            folder: 'parlando/vehicles/soat',
            publicId: `${plateNumber.toLowerCase()}-soat-${timestamp}`,
          },
        ),
        uploadImageToCloudinary(docs.transitCardDocument.uri, {
          folder: 'parlando/vehicles/transit-card',
          publicId: `${plateNumber.toLowerCase()}-transit-${timestamp}`,
        }),
      ]);

      let driverLicense: CreateVehicleRequest['driverLicense'];
      if (
        showNewLicenseForm &&
        form.driverLicenseNumber &&
        docs.driverLicenseFront &&
        docs.driverLicenseBack
      ) {
        const [documentFrontUrl, documentBackUrl] = await Promise.all([
          uploadImageToCloudinary(docs.driverLicenseFront.uri, {
            folder: 'parlando/vehicles/driver-license',
            publicId: `${plateNumber.toLowerCase()}-license-front-${timestamp}`,
          }),
          uploadImageToCloudinary(docs.driverLicenseBack.uri, {
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
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      Alert.alert(
        'No se pudo registrar el vehículo',
        anyErr?.message ?? 'Ocurrió un error subiendo los archivos. Inténtalo de nuevo.',
      );
    } finally {
      setUploading(false);
    }
  }, [validateForm, docs, form, soatExpiry, showNewLicenseForm, createVehicle, router]);

  const selectedLicense = existingLicenses.find((l) => l.id === selectedLicenseId);
  const selectedLicenseIndex = existingLicenses.findIndex((l) => l.id === selectedLicenseId);

  return {
    form,
    setField,
    docs,
    uploading,
    submitting,
    error,
    soatExpiry,
    soatExpiryDate,
    setSoatExpiryDate,
    showDatePicker,
    setShowDatePicker,
    existingLicenses,
    loadingLicenses,
    selectedLicenseId,
    selectedLicense,
    selectedLicenseIndex,
    showNewLicenseForm,
    showLicenseDropdown,
    setShowLicenseDropdown,
    handlers: {
      setField,
      handleSelectLicense,
      handleToggleNewLicenseForm,
      handleSubmit,
    },
  };
}
