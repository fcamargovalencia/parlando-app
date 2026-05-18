import React from 'react';
import { Text, ScrollView } from 'react-native';
import { Screen } from '@/components/ui';
import { useProfileScreen } from '@/hooks/useProfileScreen';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileMenuSections } from '@/components/profile/ProfileMenuSections';
import { EmailVerificationBanner } from '@/components/home/EmailVerificationBanner';

export default function ProfileScreen() {
  const { user, handleEdit, handleLogout } = useProfileScreen();

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-4"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-neutral-900 mb-6">Mi perfil</Text>

        {user && <EmailVerificationBanner user={user} />}

        <ProfileCard user={user} onEdit={handleEdit} />

        <ProfileMenuSections user={user} onLogout={handleLogout} />
      </ScrollView>
    </Screen>
  );
}
