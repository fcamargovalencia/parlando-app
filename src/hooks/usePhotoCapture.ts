import { useRef, useState, useCallback, type RefObject } from 'react';
import { Linking, Dimensions, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CapturedPhoto, CapturePhotoConfig } from '@/components/verification/CapturePhotoModal';

type CropRect = { originX: number; originY: number; width: number; height: number; };

function buildCenteredCrop(
  width: number,
  height: number,
  targetAspectRatio: number,
): CropRect {
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

/**
 * Maps the on-screen frame rect to photo pixel coordinates, accounting for
 * cover-mode scaling (the camera preview may crop the sensor image).
 */
function buildFrameCrop(
  photoW: number, photoH: number,
  frameX: number, frameY: number, frameW: number, frameH: number,
  screenW: number, screenH: number,
): CropRect | null {
  if (frameW <= 0 || frameH <= 0) return null;

  const photoAspect = photoW / photoH;
  const screenAspect = screenW / screenH;

  let visibleW: number, visibleH: number, offsetX: number, offsetY: number;

  if (photoAspect > screenAspect) {
    // Photo wider than screen → preview scales by height, clips left/right
    visibleH = photoH;
    visibleW = screenW * (photoH / screenH);
    offsetX = (photoW - visibleW) / 2;
    offsetY = 0;
  } else {
    // Photo taller than screen → preview scales by width, clips top/bottom
    visibleW = photoW;
    visibleH = screenH * (photoW / screenW);
    offsetX = 0;
    offsetY = (photoH - visibleH) / 2;
  }

  const scaleX = visibleW / screenW;
  const scaleY = visibleH / screenH;

  const originX = Math.max(0, Math.round(offsetX + frameX * scaleX));
  const originY = Math.max(0, Math.round(offsetY + frameY * scaleY));
  const width = Math.min(Math.round(frameW * scaleX), photoW - originX);
  const height = Math.min(Math.round(frameH * scaleY), photoH - originY);

  if (width <= 0 || height <= 0) return null;
  return { originX, originY, width, height };
}

function measureFrame(ref: RefObject<View | null>): Promise<{ x: number; y: number; width: number; height: number; } | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

export function usePhotoCapture(
  config: CapturePhotoConfig,
  onCapture: (photo: CapturedPhoto) => void,
  frameRef?: RefObject<View | null>,
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
        let crop: CropRect;

        if (frameRef) {
          const frame = await measureFrame(frameRef);
          if (frame) {
            const screen = Dimensions.get('window');
            crop = buildFrameCrop(
              photo.width, photo.height,
              frame.x, frame.y, frame.width, frame.height,
              screen.width, screen.height,
            ) ?? buildCenteredCrop(photo.width, photo.height, config.frameAspectRatio);
          } else {
            crop = buildCenteredCrop(photo.width, photo.height, config.frameAspectRatio);
          }
        } else {
          crop = buildCenteredCrop(photo.width, photo.height, config.frameAspectRatio);
        }

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
  }, [capturing, config.frameAspectRatio, frameRef, onCapture]);

  return {
    permission,
    cameraRef,
    capturing,
    handleRequestPermission,
    handleTakePicture,
  };
}
