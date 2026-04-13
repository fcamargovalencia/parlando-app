import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar } from '@/components/ui';
import { Colors } from '@/constants/colors';
import type { ConversationResponse } from '@/types/api';

interface ConversationItemProps {
  conversation: ConversationResponse;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const hasUnread = conversation.unreadCount > 0;
  const time = useMemo(
    () => formatTime(conversation.lastMessage.sentAt),
    [conversation.lastMessage.sentAt],
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center gap-3 px-4 py-3.5"
      style={hasUnread ? { backgroundColor: Colors.primary[50] } : undefined}
    >
      <Avatar
        uri={conversation.counterpartPhotoUrl}
        firstName={conversation.counterpartFirstName}
        lastName={conversation.counterpartLastName}
        size="md"
      />

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text
            className={`text-base ${hasUnread ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}
            numberOfLines={1}
          >
            {conversation.counterpartFirstName} {conversation.counterpartLastName}
          </Text>
          <Text className="text-xs text-neutral-400 ml-2">
            {time}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm flex-1 mr-2 ${hasUnread ? 'font-semibold text-neutral-700' : 'text-neutral-500'}`}
            numberOfLines={1}
          >
            {conversation.lastMessage.content}
          </Text>
          {hasUnread && (
            <View
              className="min-w-[20px] h-5 rounded-full items-center justify-center px-1.5"
              style={{ backgroundColor: Colors.primary[500] }}
            >
              <Text className="text-xs font-bold text-white">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
