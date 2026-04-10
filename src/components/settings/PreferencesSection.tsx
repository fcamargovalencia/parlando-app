import React from 'react';
import { View, Alert } from 'react-native';
import { Globe, Moon } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingRow } from '@/components/settings/SettingRow';
import { SettingToggle } from '@/components/settings/SettingToggle';

export function PreferencesSection() {
  return (
    <>
      <SectionTitle title="Preferencias" />
      <Card className="mb-6">
        <SettingRow
          icon={<Globe size={20} color={Colors.primary[600]} />}
          label="Idioma"
          value="Español"
          onPress={() =>
            Alert.alert('Próximamente', 'La selección de idioma estará disponible pronto.')
          }
        />
        <View className="h-px bg-neutral-100" />
        <SettingToggle
          icon={<Moon size={20} color={Colors.primary[600]} />}
          label="Modo oscuro"
          defaultValue={false}
          onToggle={() =>
            Alert.alert('Próximamente', 'El modo oscuro estará disponible pronto.')
          }
        />
      </Card>
    </>
  );
}
