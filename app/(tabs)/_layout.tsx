import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Route, PlusCircle, User, Ticket } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: Colors.neutral[100],
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{
          title: 'Mis viajes',
          tabBarIcon: ({ color, size }) => <Route size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: 'Publicar',
          tabBarIcon: ({ color, size }) => (
            <PlusCircle size={size + 4} color={Colors.primary[500]} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-bookings"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
