import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { CapturePhotoConfig } from '@/components/verification/CapturePhotoModal';

export interface LocalAsset {
  uri: string;
}

export interface LocalDocument {
  uri: string;
  name: string;
  mimeType: string;
}

export interface PendingCameraCapture {
  config: CapturePhotoConfig;
  onCaptured: (asset: LocalAsset) => void;
}

async function requestMediaPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Debes permitir acceso a la galería para seleccionar archivos.');
  }
}

async function pickImageFromLibrary(): Promise<LocalAsset | null> {
  await requestMediaPermission();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return { uri: result.assets[0].uri };
}

export function useVehicleDocuments() {
  const [vehiclePhotos, setVehiclePhotos] = useState<LocalAsset[]>([]);
  const [soatDocument, setSoatDocument] = useState<LocalDocument | null>(null);
  const [transitCardDocument, setTransitCardDocument] = useState<LocalAsset | null>(null);
  const [driverLicenseFront, setDriverLicenseFront] = useState<LocalAsset | null>(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState<LocalAsset | null>(null);
  const [pendingCameraCapture, setPendingCameraCapture] = useState<PendingCameraCapture | null>(null);

  const openCameraOverlay = useCallback((capture: PendingCameraCapture) => {
    setPendingCameraCapture(capture);
  }, []);

  const closeCameraOverlay = useCallback(() => setPendingCameraCapture(null), []);

  const pickImageAsset = useCallback(
    (onSelected: (asset: LocalAsset) => void, config: CapturePhotoConfig) => {
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
              } catch (err: unknown) {
                const anyErr = err as { message?: string };
                Alert.alert('No se pudo abrir la galería', anyErr?.message ?? 'Inténtalo de nuevo.');
              }
            })();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    },
    [openCameraOverlay],
  );

  const pickSoatPdf = useCallback(async () => {
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
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      Alert.alert('No se pudo seleccionar el PDF', anyErr?.message ?? 'Inténtalo de nuevo.');
    }
  }, []);

  const addVehiclePhoto = useCallback(() => {
    if (vehiclePhotos.length >= 4) {
      Alert.alert('Límite alcanzado', 'Puedes cargar hasta 4 fotos del vehículo.');
      return;
    }
    pickImageAsset(
      (asset) => setVehiclePhotos((curr) => [...curr, asset]),
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

  const removeVehiclePhoto = useCallback(
    (index: number) => setVehiclePhotos((curr) => curr.filter((_, i) => i !== index)),
    [],
  );

  const pickTransitCard = useCallback(() => {
    pickImageAsset(setTransitCardDocument, {
      title: 'Tarjeta de propiedad',
      description: 'Alinea la tarjeta completa dentro del marco y evita sombras.',
      hint: 'Asegúrate de que el texto sea legible en toda la imagen.',
      frameAspectRatio: 1.58,
      useFrontCamera: false,
      frameRadius: 20,
    });
  }, [pickImageAsset]);

  const pickDriverLicenseFront = useCallback(() => {
    pickImageAsset(setDriverLicenseFront, {
      title: 'Licencia frontal',
      description: 'Alinea el frente de la licencia dentro del marco.',
      hint: 'Evita reflejos y captura todos los bordes.',
      frameAspectRatio: 1.58,
      useFrontCamera: false,
      frameRadius: 20,
    });
  }, [pickImageAsset]);

  const pickDriverLicenseBack = useCallback(() => {
    pickImageAsset(setDriverLicenseBack, {
      title: 'Licencia posterior',
      description: 'Alinea el respaldo de la licencia dentro del marco.',
      hint: 'Asegúrate de que toda la información sea legible.',
      frameAspectRatio: 1.58,
      useFrontCamera: false,
      frameRadius: 20,
    });
  }, [pickImageAsset]);

  return {
    vehiclePhotos,
    soatDocument,
    transitCardDocument,
    driverLicenseFront,
    driverLicenseBack,
    pendingCameraCapture,
    closeCameraOverlay,
    handlers: {
      addVehiclePhoto,
      removeVehiclePhoto,
      pickSoatPdf,
      pickTransitCard,
      pickDriverLicenseFront,
      pickDriverLicenseBack,
      clearSoat: () => setSoatDocument(null),
      clearTransitCard: () => setTransitCardDocument(null),
      clearLicenseFront: () => setDriverLicenseFront(null),
      clearLicenseBack: () => setDriverLicenseBack(null),
    },
  };
}
