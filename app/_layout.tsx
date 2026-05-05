import '../global.css';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { loadFonts } from '../src/fonts';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { useNotificationsStore } from '@/stores/notifications-store';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { NotificationPreferences } from '@/types/api';

// Notification types that are always shown regardless of user preferences.
// These represent critical state changes the user must be aware of.
const CRITICAL_TYPES = new Set([
  'booking.accepted', 'booking.rejected',
  'trip.cancelled', 'trip.started',
  'waitlist.available',
  'subscription.accepted', 'subscription.rejected', 'subscription.route_paused',
  'account.suspended', 'account.reactivated',
]);

// Maps a notification type to the corresponding preference key.
function preferenceKeyForType(type: string): keyof Omit<NotificationPreferences, 'push_enabled' | 'marketing'> | null {
  if (type.startsWith('booking.') || type.startsWith('waitlist.')) return 'bookings';
  if (type.startsWith('trip.')) return 'trips';
  if (type.startsWith('chat.')) return 'chat';
  if (type.startsWith('subscription.')) return 'subscriptions';
  if (type.startsWith('verification.') || type.startsWith('student_verification.') || type.startsWith('vehicle.')) return 'verifications';
  return null;
}

// Show notifications as alerts when the app is in the foreground, except for
// chat messages when the user is already viewing that specific conversation,
// and respecting the user's per-category preferences (non-critical only).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { type?: string; tripId?: string; } | undefined;
    const type = data?.type ?? '';

    const SUPPRESS = { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
    const SHOW = { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true };

    // Suppress foreground chat alert if the user is already in that chat screen
    if (type === 'chat.new_message') {
      const { activeChatTripId } = useNotificationsStore.getState();
      if (activeChatTripId && activeChatTripId === data?.tripId) return SUPPRESS;
    }

    // Critical notifications always show, regardless of preferences
    if (CRITICAL_TYPES.has(type)) return SHOW;

    // Apply per-category preferences for non-critical notifications
    const { preferences } = useNotificationsStore.getState();
    if (preferences) {
      if (!preferences.push_enabled) return SUPPRESS;
      const key = preferenceKeyForType(type);
      if (key && !preferences[key]) return SUPPRESS;
    }

    return SHOW;
  },
});

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { navigate } = useNotificationNavigation();
  const incrementUnread = useNotificationsStore((s) => s.incrementUnread);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useChatWebSocket();

  useEffect(() => {
    (async () => {
      try {
        await loadFonts();
        if (Platform.OS === 'android') {
          await NavigationBar.setBackgroundColorAsync('#FFFFFF');
          await NavigationBar.setButtonStyleAsync('dark');
        }
      } catch (e) {
        console.warn('Failed to load fonts, using system defaults', e);
      } finally {
        setFontsLoaded(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  // ── Notification listeners ──
  useEffect(() => {
    // Fired when a notification arrives while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      incrementUnread();
    });

    // Fired when the user taps a notification (foreground, background or cold start via tray)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [navigate, incrementUnread]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="vehicle"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="verification"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="profile"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="trip"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="chat"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="subscription"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="routine"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="search"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
