import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export default function VehicleLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderHeader = (title: string) => () => (
    <View
      style={{
        backgroundColor: Colors.white,
        paddingTop: insets.top,
        height: 56 + insets.top,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
      >
        <Ionicons name="arrow-back-outline" size={24} color={Colors.dark.DEFAULT} />
      </TouchableOpacity>
      <Text style={{ fontSize: 17, fontWeight: '600', color: Colors.dark.DEFAULT }}>
        {title}
      </Text>
    </View>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: Colors.dark.DEFAULT,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis vehículos' }} />
      <Stack.Screen
        name="add"
        options={{
          header: renderHeader('Registrar vehículo'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          header: renderHeader('Detalle del vehículo'),
        }}
      />
    </Stack>
  );
}
