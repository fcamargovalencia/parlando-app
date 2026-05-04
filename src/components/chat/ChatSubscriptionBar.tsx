import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import type { RoutineTripResponse, RoutineSubscriptionResponse, SubscriptionStatus } from '@/types/api';

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING: 'Solicitud pendiente',
  ACCEPTED: 'Suscripción activa',
  PAUSED: 'Suscripción pausada',
  COMPLETED: 'Suscripción completada',
  CANCELLED: 'Suscripción cancelada',
};

const STATUS_COLORS: Record<SubscriptionStatus, { bg: string; text: string; border: string; }> = {
  PENDING: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A' },
  ACCEPTED: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  PAUSED: { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  COMPLETED: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  CANCELLED: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

interface ChatSubscriptionBarProps {
  isDriver: boolean;
  routineTrip: RoutineTripResponse;
  /** Mi suscripción (como pasajero) */
  mySubscription: RoutineSubscriptionResponse | null;
  /** Suscripción de la contraparte (como conductor) */
  counterpartSubscription: RoutineSubscriptionResponse | null;
}

export function ChatSubscriptionBar({
  isDriver,
  routineTrip,
  mySubscription,
  counterpartSubscription,
}: ChatSubscriptionBarProps) {
  const router = useRouter();

  const subscription = isDriver ? counterpartSubscription : mySubscription;

  const handleSubscribe = () => {
    router.push({
      pathname: '/subscription/new',
      params: { routineTripId: routineTrip.id },
    });
  };

  const handleViewSubscription = () => {
    router.push({
      pathname: '/routine/[id]/subscriptions' as const,
      params: { id: routineTrip.id },
    });
  };

  if (!subscription) {
    if (isDriver) {
      // El conductor ve que no hay suscripción de la contraparte aún
      return (
        <View
          className="flex-row items-center px-4 py-2.5 bg-white border-b border-neutral-100 gap-2"
        >
          <CalendarDays size={16} color={Colors.neutral[400]} />
          <Text className="flex-1 text-xs text-neutral-500">
            Este usuario no tiene suscripción activa en esta ruta.
          </Text>
        </View>
      );
    }

    // El pasajero aún no se suscribió
    return (
      <View className="flex-row items-center px-4 py-2.5 bg-white border-b border-neutral-100 gap-3">
        <CalendarDays size={16} color={Colors.primary[500]} />
        <Text className="flex-1 text-xs text-neutral-600">
          ¿Te interesa esta ruta?
        </Text>
        <TouchableOpacity
          onPress={handleSubscribe}
          activeOpacity={0.8}
          className="bg-primary-500 px-3 py-1.5 rounded-lg"
        >
          <Text className="text-xs font-semibold text-white">Suscribirme</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colors = STATUS_COLORS[subscription.status];

  return (
    <TouchableOpacity
      onPress={handleViewSubscription}
      activeOpacity={0.8}
      className="flex-row items-center px-4 py-2.5 bg-white border-b border-neutral-100 gap-2"
    >
      <View
        className="flex-row items-center flex-1 gap-2 rounded-lg px-2.5 py-1.5"
        style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
      >
        <CalendarDays size={14} color={colors.text} />
        <Text className="text-xs font-medium flex-1" style={{ color: colors.text }}>
          {STATUS_LABELS[subscription.status]}
        </Text>
      </View>
      <ChevronRight size={16} color={Colors.neutral[400]} />
    </TouchableOpacity>
  );
}
