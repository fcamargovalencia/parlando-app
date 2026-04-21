import React from 'react';
import { Platform, TouchableOpacity, View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Route, Plus, User, Search, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

function PublishFABButton({ onPress }: { onPress?: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: Colors.primary[500],
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -8,
          shadowColor: Colors.primary[500],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.neutral[500], marginTop: 3 }}>
        Publicar
      </Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[500],
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
          title: 'Buscar',
          tabBarIcon: ({ color, size, focused }) => (
            <Search size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{
          title: 'Mis viajes',
          tabBarIcon: ({ color, size, focused }) => (
            <Route size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine-trips"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: 'Publicar',
          tabBarButton: (props) => (
            <PublishFABButton onPress={props.onPress ? () => props.onPress!(undefined as never) : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensajes',
          tabBarIcon: ({ color, size, focused }) => (
            <MessageCircle size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
