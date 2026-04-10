import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, Button } from '@/components/ui';
import { useEditProfile } from '@/hooks/useEditProfile';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { ProfileFormFields } from '@/components/profile/ProfileFormFields';
import { AccountInfoCard } from '@/components/profile/AccountInfoCard';

export default function EditProfileScreen() {
  const { user, form, setField, hasChanges, updating, error, handleSave } = useEditProfile();

  return (
    <Screen safe={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AvatarEditor
            uri={user?.profilePhotoUrl ?? undefined}
            firstName={user?.firstName || ''}
            lastName={user?.lastName || ''}
          />

          <ProfileFormFields
            firstName={form.firstName}
            lastName={form.lastName}
            onChangeFirstName={(v) => setField('firstName', v)}
            onChangeLastName={(v) => setField('lastName', v)}
          />

          <AccountInfoCard
            email={user?.email}
            phone={user?.phone}
            role={user?.role}
          />

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <Button
            onPress={handleSave}
            loading={updating}
            disabled={!hasChanges}
            size="lg"
            className="w-full"
          >
            Guardar cambios
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
