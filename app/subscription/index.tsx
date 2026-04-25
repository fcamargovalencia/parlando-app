import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import { Card, EmptyState, FilterTabs, Spinner } from '@/components/ui';
import { SubscriptionStatusBadge } from '@/components/routine/SubscriptionStatusBadge';
import { Colors } from '@/constants/colors';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import type { RecurrenceDay, RoutineSubscriptionResponse, SubscriptionStatus } from '@/types/api';

// ── Types ──

type TabKey = 'active' | 'pending' | 'paused' | 'history';

const TAB_STATUSES: Record<TabKey, SubscriptionStatus[]> = {
  active: ['ACCEPTED'],
  pending: ['PENDING'],
  paused: ['PAUSED'],
  history: ['COMPLETED', 'CANCELLED'],
};

const DAY_LABELS: Record<RecurrenceDay, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue', FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

// ── Helpers ──

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short',
    });
  } catch { return iso; }
}

// ── Subscription row card ──

function SubscriptionRow({
  subscription,
  onPress,
}: {
  subscription: RoutineSubscriptionResponse;
  onPress: () => void;
}) {
  const trip = subscription.routineTrip;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            {/* Route */}
            <View className="flex-row items-center gap-1.5 mb-1">
              <MapPin size={13} color={Colors.primary[500]} />
              <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                {trip
                  ? `${trip.originName} → ${trip.destinationName}`
                  : `Suscripción ${subscription.id.slice(0, 8)}`}
              </Text>
            </View>

            {/* Schedule */}
            {trip && (
              <View className="flex-row items-center gap-1.5 mb-2">
                <Clock size={12} color={Colors.neutral[500]} />
                <Text className="text-xs text-neutral-500">
                  {trip.departureTime} → {trip.requiredArrivalTime}
                </Text>
              </View>
            )}

            {/* Days */}
            <View className="flex-row flex-wrap gap-1 mb-2">
              {subscription.subscribedDays.map((d) => (
                <View key={d} className="bg-primary-50 px-1.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-medium text-primary-700">{DAY_LABELS[d]}</Text>
                </View>
              ))}
            </View>

            {/* Period */}
            <View className="flex-row items-center gap-1.5">
              <Calendar size={12} color={Colors.neutral[400]} />
              <Text className="text-xs text-neutral-400">
                Desde {formatDate(subscription.startDate)}
                {subscription.endDate ? ` · Hasta ${formatDate(subscription.endDate)}` : ''}
              </Text>
            </View>
          </View>

          <View className="items-end gap-2">
            <SubscriptionStatusBadge status={subscription.status} />
            <ChevronRight size={16} color={Colors.neutral[400]} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Screen ──

export default function MySubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mySubscriptions = useRoutineSubscriptionsStore((s) => s.mySubscriptions);
  const isLoading = useRoutineSubscriptionsStore((s) => s.isLoading);
  const fetchMine = useRoutineSubscriptionsStore((s) => s.fetchMine);

  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMine();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMine();
    setRefreshing(false);
  };

  const filtered = mySubscriptions.filter((s: RoutineSubscriptionResponse) =>
    TAB_STATUSES[activeTab].includes(s.status),
  );
  console.warn('[Subscriptions] count:', mySubscriptions.length, 'first routineTrip:', mySubscriptions[0]?.routineTrip);

  const activeCount = mySubscriptions.filter((s) => s.status === 'ACCEPTED').length;
  const pendingCount = mySubscriptions.filter((s) => s.status === 'PENDING').length;
  const pausedCount = mySubscriptions.filter((s) => s.status === 'PAUSED').length;

  const tabs = [
    { key: 'active' as TabKey, label: 'Activas', count: activeCount },
    { key: 'pending' as TabKey, label: 'Pendientes', count: pendingCount },
    { key: 'paused' as TabKey, label: 'Pausadas', count: pausedCount },
    { key: 'history' as TabKey, label: 'Historial' },
  ];

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2 bg-white border-b border-neutral-100">
        <Text className="text-xl font-bold text-neutral-900">Mis suscripciones</Text>
        <Text className="text-sm text-neutral-500 mt-0.5">
          Rutas rutinarias en las que estás suscrito
        </Text>
      </View>

      {/* Tabs */}
      <View className="bg-white border-b border-neutral-100">
        <FilterTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />
      </View>

      {/* Content */}
      {isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState
              title={
                activeTab === 'active'
                  ? 'Sin suscripciones activas'
                  : activeTab === 'pending'
                    ? 'Sin solicitudes pendientes'
                    : activeTab === 'paused'
                      ? 'Sin suscripciones pausadas'
                      : 'Sin historial'
              }
              description={
                activeTab === 'active'
                  ? 'Busca una ruta rutinaria y suscríbete para verla aquí.'
                  : activeTab === 'pending'
                    ? 'Tus solicitudes aparecerán aquí mientras el conductor responde.'
                    : 'No tienes suscripciones en este estado.'
              }
            />
          ) : (
            filtered.map((s) => (
              <SubscriptionRow
                key={s.id}
                subscription={s}
                onPress={() => router.push(`/subscription/${s.id}`)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
