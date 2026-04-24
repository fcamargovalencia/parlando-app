import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSubscriptionDetailScreen } from '@/hooks/screens/useSubscriptionDetailScreen';
import {
  SubscriptionDetailView,
  SubscriptionDetailLoading,
  SubscriptionDetailError,
} from '@/components/screens/SubscriptionDetailView';

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uiState, dispatch, subscription, bookings, isLoading, loadError, handlers } =
    useSubscriptionDetailScreen(id);

  if (isLoading) return <SubscriptionDetailLoading />;
  if (loadError || !subscription) return <SubscriptionDetailError error={loadError} />;

  return (
    <SubscriptionDetailView
      uiState={uiState}
      dispatch={dispatch}
      subscription={subscription}
      bookings={bookings}
      handlers={handlers}
    />
  );
}
