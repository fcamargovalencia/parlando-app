import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pencil, Trash2, UserRound } from 'lucide-react-native';
import { Card, Spinner } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { EmergencyContactResponse } from '@/types/api';

function maskPhone(phone: string): string {
  if (!phone) return 'Telefono no disponible';

  const trimmed = phone.trim();
  const startsWithPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 0) return '****';
  if (digits.length <= 4) return `${startsWithPlus ? '+' : ''}${'*'.repeat(digits.length)}`;

  const visible = digits.slice(-4);
  const hidden = '*'.repeat(Math.max(4, digits.length - 4));
  return `${startsWithPlus ? '+' : ''}${hidden}${visible}`;
}

interface EmergencyContactsListProps {
  contacts: EmergencyContactResponse[];
  loading: boolean;
  deletingId: string | null;
  onEdit: (contact: EmergencyContactResponse) => void;
  onDelete: (contact: EmergencyContactResponse) => void;
}

export function EmergencyContactsList({
  contacts,
  loading,
  deletingId,
  onEdit,
  onDelete,
}: EmergencyContactsListProps) {
  if (loading) {
    return (
      <View className="py-8 items-center">
        <Spinner />
      </View>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card className="p-4">
        <Text className="text-sm text-neutral-500">
          Aun no tienes contactos de emergencia registrados.
        </Text>
      </Card>
    );
  }

  return (
    <View className="gap-3">
      {contacts.map((contact) => (
        <Card key={contact.id} className="p-4">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-row items-center gap-2 pr-2 flex-1">
              <UserRound size={16} color={Colors.primary[600]} />
              <Text className="text-base font-semibold text-neutral-800" numberOfLines={1}>
                {contact.name}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => onEdit(contact)}>
                <Pencil size={16} color={Colors.neutral[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(contact)}
                disabled={deletingId === contact.id}
              >
                <Trash2 size={16} color={Colors.semantic.error} />
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-sm text-neutral-600">{contact.relationship}</Text>
          <Text className="text-sm text-neutral-600 mt-0.5">{maskPhone(contact.phone)}</Text>
          <Text className="text-xs text-neutral-500 mt-2">
            {contact.notifyOnTrip
              ? 'Recibe notificacion cuando inicies viaje'
              : 'Sin notificacion automatica'}
          </Text>
        </Card>
      ))}
    </View>
  );
}
