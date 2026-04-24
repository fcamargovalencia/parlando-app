import { useRef, useState, useCallback } from 'react';
import { Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CapturedPhoto, CapturePhotoConfig } from '@/components/verification/CapturePhotoModal';

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

export function usePhotoCapture(
  config: CapturePhotoConfig,
  onCapture: (photo: CapturedPhoto) => void,
) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted && !result.canAskAgain) {
      await Linking.openSettings();
    }
  }, [requestPermission]);

  const handleTakePicture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        const crop = buildCenteredCrop(photo.width, photo.height, config.frameAspectRatio);
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
  }, [capturing, config.frameAspectRatio, onCapture]);

  return {
    permission,
    cameraRef,
    capturing,
    handleRequestPermission,
    handleTakePicture,
  };
}
