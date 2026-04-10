import React from 'react';
import { View, Linking } from 'react-native';
import { FileText, HelpCircle } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingRow } from '@/components/settings/SettingRow';

export function LegalSection() {
  return (
    <>
      <SectionTitle title="Legal" />
      <Card className="mb-6">
        <SettingRow
          icon={<FileText size={20} color={Colors.neutral[500]} />}
          label="Términos y condiciones"
          onPress={() => Linking.openURL('https://parlando.app/terms')}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={<FileText size={20} color={Colors.neutral[500]} />}
          label="Política de privacidad"
          onPress={() => Linking.openURL('https://parlando.app/privacy')}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={<HelpCircle size={20} color={Colors.neutral[500]} />}
          label="Centro de ayuda"
          onPress={() => Linking.openURL('https://parlando.app/help')}
        />
      </Card>
    </>
  );
}
