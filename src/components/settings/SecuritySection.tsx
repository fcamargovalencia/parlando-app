import React from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Shield, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingRow } from '@/components/settings/SettingRow';

export function SecuritySection() {
  const router = useRouter();

  return (
    <>
      <SectionTitle title="Seguridad" />
      <Card className="mb-6">
        <SettingRow
          icon={<Lock size={20} color={Colors.accent[600]} />}
          label="Cambiar contraseña"
          onPress={() =>
            Alert.alert('Próximamente', 'El cambio de contraseña estará disponible pronto.')
          }
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={<Phone size={20} color={Colors.accent[600]} />}
          label="Contactos de emergencia"
          onPress={() => router.push('/profile/emergency-contacts' as any)}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={<Shield size={20} color={Colors.accent[600]} />}
          label="Verificación en dos pasos"
          onPress={() =>
            Alert.alert(
              'Próximamente',
              'La verificación en dos pasos estará disponible pronto.',
            )
          }
        />
      </Card>
    </>
  );
}
