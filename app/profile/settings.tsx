import React from 'react';
import { ScrollView } from 'react-native';
import { Screen } from '@/components/ui';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { LegalSection } from '@/components/settings/LegalSection';
import { AppFooter } from '@/components/settings/AppFooter';

export default function SettingsScreen() {
  return (
    <Screen safe={false}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <NotificationsSection />
        <PreferencesSection />
        <SecuritySection />
        <LegalSection />
        <AppFooter />
      </ScrollView>
    </Screen>
  );
}
