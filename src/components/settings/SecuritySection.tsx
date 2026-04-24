import React, { useCallback } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Shield, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingRow } from '@/components/settings/SettingRow';

const ICON_LOCK = <Lock size={20} color={Colors.accent[600]} />;
const ICON_PHONE = <Phone size={20} color={Colors.accent[600]} />;
const ICON_SHIELD = <Shield size={20} color={Colors.accent[600]} />;
const handleChangePassword = () =>
  Alert.alert('Próximamente', 'El cambio de contraseña estará disponible pronto.');
const handleTwoFactor = () =>
  Alert.alert('Próximamente', 'La verificación en dos pasos estará disponible pronto.');

export const SecuritySection = React.memo(function SecuritySection() {
  const router = useRouter();
  const handleEmergencyContacts = useCallback(
    () => router.push('/profile/emergency-contacts' as any),
    [router],
  );

  return (
    <>
      <SectionTitle title="Seguridad" />
      <Card className="mb-6">
        <SettingRow
          icon={ICON_LOCK}
          label="Cambiar contraseña"
          onPress={handleChangePassword}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={ICON_PHONE}
          label="Contactos de emergencia"
          onPress={handleEmergencyContacts}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={ICON_SHIELD}
          label="Verificación en dos pasos"
          onPress={handleTwoFactor}
        />
      </Card>
    </>
  );
});
