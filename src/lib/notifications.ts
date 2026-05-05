import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationsApi } from '@/api/notifications';
import { useNotificationsStore } from '@/stores/notifications-store';

// ── Android Notification Channels ──

interface AndroidChannel {
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
  description: string;
  vibrate?: boolean;
}

const ANDROID_CHANNELS: AndroidChannel[] = [
  {
    id: 'bookings',
    name: 'Reservas',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Aceptaciones, rechazos y cancelaciones de reservas',
    vibrate: true,
  },
  {
    id: 'trips',
    name: 'Viajes',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Inicio, recordatorios y completaciones de viajes',
    vibrate: true,
  },
  {
    id: 'chat',
    name: 'Mensajes',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Mensajes nuevos del chat',
    vibrate: true,
  },
  {
    id: 'subscriptions',
    name: 'Suscripciones',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Cambios en suscripciones rutinarias',
  },
  {
    id: 'verifications',
    name: 'Verificaciones',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Estado de verificación de documentos e identidad',
  },
  {
    id: 'system',
    name: 'Sistema',
    importance: Notifications.AndroidImportance.LOW,
    description: 'Mantenimiento y actualizaciones del sistema',
  },
];

/**
 * Creates all Android notification channels. Safe to call multiple times
 * (Android will upsert channels by ID). No-op on iOS.
 */
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  for (const channel of ANDROID_CHANNELS) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: channel.importance,
      description: channel.description,
      vibrationPattern: channel.vibrate ? [0, 250, 250, 250] : undefined,
      enableVibrate: channel.vibrate ?? false,
      lightColor: '#007380',
    });
  }
}

/**
 * Requests notification permissions, obtains the device FCM/APNs token, and
 * registers it with the backend. Must be called AFTER the auth token is stored
 * (i.e. after login) so the API call can be authenticated.
 *
 * @returns The raw device push token or null if permissions were denied or
 *          the code is running on a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { setToken, setPermissions } = useNotificationsStore.getState();

  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications only work on physical devices.');
    return null;
  }

  await setupAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    setPermissions(false);
    return null;
  }

  setPermissions(true);

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const token = tokenData.data as string;

  if (!token) return null;

  setToken(token);

  const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
  try {
    await notificationsApi.registerDevice(token, platform);
  } catch (error) {
    // Non-fatal: token is stored locally. Backend registration will succeed
    // on the next login attempt once connectivity is restored.
    console.error('[Notifications] Failed to register device token with backend:', error);
  }

  return token;
}

/**
 * Deletes the device token from the backend and clears local state.
 * Must be called BEFORE clearing the auth token (i.e. before logout) so the
 * API call can still be authenticated.
 */
export async function unregisterPushToken(): Promise<void> {
  const { fcmToken, setToken, setPermissions } = useNotificationsStore.getState();

  if (!fcmToken) return;

  try {
    await notificationsApi.unregisterDevice(fcmToken);
  } catch (error) {
    console.error('[Notifications] Failed to unregister device token:', error);
  } finally {
    setToken(null);
    setPermissions(false);
  }
}
