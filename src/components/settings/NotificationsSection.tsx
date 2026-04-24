import React from 'react';
import { View } from 'react-native';
import { Bell, Smartphone } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingToggle } from '@/components/settings/SettingToggle';

const ICON_BELL = <Bell size={20} color={Colors.primary[600]} />;
const ICON_PHONE = <Smartphone size={20} color={Colors.primary[600]} />;

export const NotificationsSection = React.memo(function NotificationsSection() {
  return (
    <>
      <SectionTitle title="Notificaciones" />
      <Card className="mb-6">
        <SettingToggle
          icon={ICON_BELL}
          label="Notificaciones push"
          defaultValue={true}
        />
        <View className="h-px bg-neutral-100" />
        <SettingToggle
          icon={ICON_PHONE}
          label="Notificaciones por SMS"
          defaultValue={false}
        />
      </Card>
    </>
  );
});
