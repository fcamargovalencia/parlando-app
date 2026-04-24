import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import type { EmergencyContactResponse } from '@/types/api';

const MAX_CONTACTS = 5;

export interface EmergencyContactFormState {
  name: string;
  phone: string;
  relationship: string;
  notifyOnTrip: boolean;
}

const EMPTY_FORM: EmergencyContactFormState = {
  name: '',
  phone: '',
  relationship: '',
  notifyOnTrip: true,
};

function parseDigits(value: string) {
  return value.replace(/[^0-9+]/g, '');
}

function validateForm(form: EmergencyContactFormState): string | null {
  if (!form.name.trim()) return 'Ingresa el nombre del contacto.';
  if (!form.phone.trim()) return 'Ingresa el numero de telefono.';
  if (!form.relationship.trim()) return 'Indica la relacion con el contacto.';
  return null;
}

function initialFormFromContact(contact: EmergencyContactResponse): EmergencyContactFormState {
  return {
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship,
    notifyOnTrip: contact.notifyOnTrip,
  };
}

export function useEmergencyContactsScreen() {
  const {
    contacts,
    loading,
    submitting,
    deletingId,
    error,
    createContact,
    updateContact,
    deleteContact,
    clearError,
  } = useEmergencyContacts();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmergencyContactFormState>(EMPTY_FORM);

  const isEditing = !!editingId;
  const remaining = useMemo(() => Math.max(0, MAX_CONTACTS - contacts.length), [contacts.length]);
  const canCreate = contacts.length < MAX_CONTACTS;

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearError();
  };

  const startEdit = useCallback((contact: EmergencyContactResponse) => {
    setEditingId(contact.id);
    setForm(initialFormFromContact(contact));
    clearError();
  }, [clearError]);

  const onChangeName = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const onChangePhone = (value: string) => {
    setForm((prev) => ({ ...prev, phone: parseDigits(value) }));
  };

  const onChangeRelationship = (value: string) => {
    setForm((prev) => ({ ...prev, relationship: value }));
  };

  const onChangeNotifyOnTrip = (value: boolean) => {
    setForm((prev) => ({ ...prev, notifyOnTrip: value }));
  };

  const submitForm = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      Alert.alert('Datos incompletos', validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      relationship: form.relationship.trim(),
      notifyOnTrip: form.notifyOnTrip,
    };

    const ok = editingId
      ? await updateContact(editingId, payload)
      : await createContact(payload);

    if (ok) resetForm();
  };

  const requestDelete = useCallback((contact: EmergencyContactResponse) => {
    Alert.alert(
      'Eliminar contacto',
      `Deseas eliminar a ${contact.name} de tus contactos de emergencia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteContact(contact.id);
          },
        },
      ],
    );
  }, [deleteContact]);

  return {
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
  };
}
