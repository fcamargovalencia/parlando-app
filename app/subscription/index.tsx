import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, FilterTabs, Spinner } from '@/components/ui';
import { SubscriptionRow } from '@/components/subscription/SubscriptionRow';
import { useRoutineSubscriptionsStore } from '@/stores/routine-subscriptions-store';
import type { RoutineSubscriptionResponse, SubscriptionStatus } from '@/types/api';

// ── Types ──

type TabKey = 'active' | 'pending' | 'paused' | 'history';

const TAB_STATUSES: Record<TabKey, SubscriptionStatus[]> = {
  active: ['ACCEPTED'],
  pending: ['PENDING'],
  paused: ['PAUSED'],
  history: ['COMPLETED', 'CANCELLED'],
};

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
