import React from 'react';
import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner } from '@/components/ui';
import { ConversationItem } from '@/components/chat/ConversationItem';
import { EmptyConversations } from '@/components/chat/EmptyConversations';
import { Colors, Shadows } from '@/constants/colors';
import { useConversations } from '@/hooks/useConversations';

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversations, loading, refreshing, error, refresh } = useConversations();

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="px-4 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, ...Shadows.sm }}
      >
        <Text className="text-3xl font-bold text-neutral-900">Mensajes</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-sm text-neutral-500 text-center">{error}</Text>
          <TouchableOpacity onPress={() => refresh()}>
            <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <EmptyConversations />
      ) : (
        <FlashList
          data={conversations}
          keyExtractor={(item) => `${item.tripId}-${item.counterpartId}`}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() =>
                router.push({
                  pathname: '/chat/[tripId]' as const,
                  params: {
                    tripId: item.tripId,
                    otherUserId: item.counterpartId,
                    otherUserName: `${item.counterpartFirstName} ${item.counterpartLastName}`,
                    otherUserPhoto: item.counterpartPhotoUrl ?? '',
                    tripStatus: item.tripStatus ?? '',
                  },
                } as any)
              }
            />
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-neutral-100 ml-16" />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary[500]}
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </View>
  );
}
