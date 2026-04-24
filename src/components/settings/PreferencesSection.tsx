import React from 'react';
import { View, Alert } from 'react-native';
import { Globe, Moon } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingRow } from '@/components/settings/SettingRow';
import { SettingToggle } from '@/components/settings/SettingToggle';

const ICON_GLOBE = <Globe size={20} color={Colors.primary[600]} />;
const ICON_MOON = <Moon size={20} color={Colors.primary[600]} />;
const handleLanguage = () =>
  Alert.alert('Próximamente', 'La selección de idioma estará disponible pronto.');
const handleDarkMode = () =>
  Alert.alert('Próximamente', 'El modo oscuro estará disponible pronto.');

export const PreferencesSection = React.memo(function PreferencesSection() {
  return (
    <>
      <SectionTitle title="Preferencias" />
      <Card className="mb-6">
        <SettingRow
          icon={ICON_GLOBE}
          label="Idioma"
          value="Español"
          onPress={handleLanguage}
        />
        <View className="h-px bg-neutral-100" />
        <SettingToggle
          icon={ICON_MOON}
          label="Modo oscuro"
          defaultValue={false}
          onToggle={handleDarkMode}
        />
      </Card>
    </>
  );
});
