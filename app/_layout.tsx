import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
      </Stack>
      <StatusBar style="auto" />
      <Toast />
    </GestureHandlerRootView>
  );
}
