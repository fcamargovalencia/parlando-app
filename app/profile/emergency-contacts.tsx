import React from 'react';
import { Text, ScrollView } from 'react-native';
import { Screen } from '@/components/ui';
import { EmergencyContactFormCard } from '@/components/profile/EmergencyContactFormCard';
import { EmergencyContactsList } from '@/components/profile/EmergencyContactsList';
import { useEmergencyContactsScreen } from '@/hooks/useEmergencyContactsScreen';

export default function EmergencyContactsScreen() {
  const {
    contacts,
    loading,
    submitting,
    deletingId,
    error,
    form,
    isEditing,
    remaining,
    canCreate,
    onChangeName,
    onChangePhone,
    onChangeRelationship,
    onChangeNotifyOnTrip,
    startEdit,
    resetForm,
    submitForm,
    requestDelete,
  } = useEmergencyContactsScreen();

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-base text-neutral-500 mb-4">
          Registra hasta 5 contactos para notificar en caso de emergencia durante tus viajes.
        </Text>

        <EmergencyContactFormCard
          form={form}
          isEditing={isEditing}
          remaining={remaining}
          canCreate={canCreate}
          submitting={submitting}
          error={error}
          onChangeName={onChangeName}
          onChangePhone={onChangePhone}
          onChangeRelationship={onChangeRelationship}
          onChangeNotifyOnTrip={onChangeNotifyOnTrip}
          onSubmit={submitForm}
          onCancelEdit={resetForm}
        />

        <Text className="text-sm font-semibold text-neutral-800 mb-2">Contactos registrados</Text>

        <EmergencyContactsList
          contacts={contacts}
          loading={loading}
          deletingId={deletingId}
          onEdit={startEdit}
          onDelete={requestDelete}
        />
      </ScrollView>
    </Screen>
  );
}
