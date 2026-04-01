import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Camera, RefreshCw, ScanFace, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export type CaptureTarget = 'documentFront' | 'documentBack' | 'selfie';

export interface CapturedPhoto {
  uri: string;
  width?: number;
  height?: number;
}

interface CapturePhotoModalProps {
  visible: boolean;
  target: CaptureTarget | null;
  onClose: () => void;
  onCapture: (photo: CapturedPhoto) => void;
}

const captureConfig: Record<
  CaptureTarget,
  {
    title: string;
    description: string;
    hint: string;
    frameAspectRatio: number;
    useFrontCamera: boolean;
    frameRadius: number;
  }
> = {
  documentFront: {
    title: 'Frente del documento',
    description: 'Alinea el documento completo dentro del marco y evita reflejos o sombras.',
    hint: 'La foto debe verse nítida, con los cuatro bordes completos.',
    frameAspectRatio: 1.58,
    useFrontCamera: false,
    frameRadius: 22,
  },
  documentBack: {
    title: 'Respaldo del documento',
    description: 'Captura el reverso completo y verifica que el texto sea legible.',
    hint: 'No cortes esquinas ni tapes el documento con los dedos.',
    frameAspectRatio: 1.58,
    useFrontCamera: false,
    frameRadius: 22,
  },
  selfie: {
    title: 'Selfie con documento',
    description: 'Ubica tu rostro y el documento dentro del marco para revisión manual en el admin panel.',
    hint: 'Buena luz, rostro visible y documento cerca al mentón.',
    frameAspectRatio: 0.78,
    useFrontCamera: true,
    frameRadius: 28,
  },
};

function buildCenteredCrop(
  width: number,
  height: number,
  targetAspectRatio: number,
) {
  const sourceAspectRatio = width / height;

  if (sourceAspectRatio > targetAspectRatio) {
    const cropHeight = height;
    const cropWidth = Math.round(height * targetAspectRatio);
    const originX = Math.round((width - cropWidth) / 2);
    return { originX, originY: 0, width: cropWidth, height: cropHeight };
  }

  const cropWidth = width;
  const cropHeight = Math.round(width / targetAspectRatio);
  const originY = Math.round((height - cropHeight) / 2);
  return { originX: 0, originY, width: cropWidth, height: cropHeight };
}

export function CapturePhotoModal({ visible, target, onClose, onCapture }: CapturePhotoModalProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  if (!visible || !target) {
    return null;
  }

  const config = captureConfig[target];

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted && !result.canAskAgain) {
      await Linking.openSettings();
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || capturing) return;

    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        const crop = buildCenteredCrop(
          photo.width,
          photo.height,
          config.frameAspectRatio,
        );

        const croppedPhoto = await manipulateAsync(
          photo.uri,
          [{ crop }],
          { compress: 0.9, format: SaveFormat.JPEG },
        );

        onCapture({
          uri: croppedPhoto.uri,
          width: croppedPhoto.width,
          height: croppedPhoto.height,
        });
      }
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {permission?.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={config.useFrontCamera ? 'front' : 'back'}
            />

            <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
              <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
                <TouchableOpacity style={styles.iconButton} onPress={onClose} activeOpacity={0.85}>
                  <X size={20} color={Colors.white} />
                </TouchableOpacity>
                <View style={styles.headerCard}>
                  <Text style={styles.headerTitle}>{config.title}</Text>
                  <Text style={styles.headerDescription}>{config.description}</Text>
                </View>
              </View>

              <View style={styles.frameWrapper}>
                <View
                  style={[
                    styles.captureFrame,
                    target === 'selfie'
                      ? styles.selfieFrame
                      : {
                        aspectRatio: config.frameAspectRatio,
                        borderRadius: config.frameRadius,
                      },
                  ]}
                >
                  {target === 'selfie' ? (
                    <View style={styles.selfieGuideWrapper} pointerEvents="none">
                      <View style={styles.selfieOval} />
                    </View>
                  ) : (
                    <>
                      <View style={[styles.corner, styles.cornerTopLeft]} />
                      <View style={[styles.corner, styles.cornerTopRight]} />
                      <View style={[styles.corner, styles.cornerBottomLeft]} />
                      <View style={[styles.corner, styles.cornerBottomRight]} />
                    </>
                  )}
                </View>
              </View>

              <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
                <View style={styles.hintCard}>
                  <ScanFace size={18} color={Colors.white} />
                  <Text style={styles.hintText}>{config.hint}</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.85}>
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={handleTakePicture}
                    activeOpacity={0.85}
                    disabled={capturing}
                  >
                    {capturing ? (
                      <ActivityIndicator color={Colors.primary[700]} />
                    ) : (
                      <Camera size={26} color={Colors.primary[700]} />
                    )}
                  </TouchableOpacity>

                  <View style={styles.placeholderButton}>
                    <RefreshCw size={18} color="rgba(255,255,255,0.8)" />
                  </View>
                </View>
              </View>
            </SafeAreaView>
          </>
        ) : (
          <SafeAreaView style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>Permite acceder a la cámara</Text>
              <Text style={styles.permissionDescription}>
                Necesitamos la cámara para capturar el documento y la selfie obligatoria antes de enviar la verificación.
              </Text>
              <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission} activeOpacity={0.85}>
                <Text style={styles.permissionButtonText}>
                  {permission?.canAskAgain === false ? 'Abrir ajustes' : 'Permitir cámara'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
                <Text style={styles.permissionCancel}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  topBar: {
    paddingHorizontal: 20,
    gap: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: 'rgba(0, 48, 64, 0.78)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerDescription: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
  },
  frameWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  captureFrame: {
    width: '100%',
    maxWidth: 330,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'transparent',
  },
  selfieFrame: {
    width: '100%',
    maxWidth: 330,
    aspectRatio: 0.78,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: Colors.accent[400],
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 18,
  },
  selfieGuideWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieOval: {
    width: '74%',
    maxWidth: 228,
    aspectRatio: 0.78,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bottomPanel: {
    paddingHorizontal: 20,
    gap: 18,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hintText: {
    flex: 1,
    color: Colors.white,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'rgba(0, 115, 128, 0.25)',
  },
  placeholderButton: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.primary[900],
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.DEFAULT,
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral[600],
    marginBottom: 18,
  },
  permissionButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  permissionCancel: {
    textAlign: 'center',
    color: Colors.neutral[500],
    fontWeight: '600',
  },
});