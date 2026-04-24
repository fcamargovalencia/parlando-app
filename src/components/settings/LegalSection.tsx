import React from 'react';
import { Linking, View } from 'react-native';
import { FileText, HelpCircle } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingRow } from '@/components/settings/SettingRow';

const ICON_FILE = <FileText size={20} color={Colors.neutral[500]} />;
const ICON_HELP = <HelpCircle size={20} color={Colors.neutral[500]} />;
const openTerms = () => Linking.openURL('https://parlando.app/terms');
const openPrivacy = () => Linking.openURL('https://parlando.app/privacy');
const openHelp = () => Linking.openURL('https://parlando.app/help');

export const LegalSection = React.memo(function LegalSection() {
  return (
    <>
      <SectionTitle title="Legal" />
      <Card className="mb-6">
        <SettingRow
          icon={ICON_FILE}
          label="Términos y condiciones"
          onPress={openTerms}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={ICON_FILE}
          label="Política de privacidad"
          onPress={openPrivacy}
        />
        <View className="h-px bg-neutral-100" />
        <SettingRow
          icon={ICON_HELP}
          label="Centro de ayuda"
          onPress={openHelp}
        />
      </Card>
    </>
  );
});
