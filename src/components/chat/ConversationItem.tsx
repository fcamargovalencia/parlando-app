import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { Avatar } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import type { ConversationResponse, TripStatus, TripType } from '@/types/api';

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

function formatMsgTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function formatDepartureDay(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}`;
}

const TRIP_TYPE_LABELS: Record<TripType, string> = {
  INTERCITY: 'Interurbano',
  URBAN: 'Urbano',
  ROUTINE: 'Rutina',
};

const TRIP_TYPE_STYLES: Record<TripType, { bg: string; text: string; }> = {
  INTERCITY: { bg: Colors.accent[50], text: Colors.accent[700] },
  URBAN: { bg: Colors.primary[50], text: Colors.primary[700] },
  ROUTINE: { bg: Colors.role.passenger.bg, text: Colors.role.passenger.text },
};

const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const TRIP_STATUS_STYLES: Record<TripStatus, { bg: string; text: string }> = {
  DRAFT: { bg: Colors.neutral[200], text: Colors.neutral[600] },
  PUBLISHED: { bg: Colors.semantic.infoLight, text: Colors.semantic.info },
  IN_PROGRESS: { bg: Colors.semantic.successLight, text: Colors.semantic.success },
  COMPLETED: { bg: Colors.neutral[200], text: Colors.neutral[500] },
  CANCELLED: { bg: Colors.semantic.errorLight, text: Colors.semantic.error },
};

const ORIGIN_DOT_COLOR = Colors.semantic.success;
const DESTINATION_DOT_COLOR = Colors.accent[500];

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const hasUnread = conversation.unreadCount > 0;

  const time = useMemo(
    () => formatTime(conversation.lastMessage.sentAt),
    [conversation.lastMessage.sentAt],
  );
  const msgTime = useMemo(
    () => formatMsgTime(conversation.lastMessage.sentAt),
    [conversation.lastMessage.sentAt],
  );
  const departureText = useMemo(
    () => (conversation.departureAt ? formatDepartureDay(conversation.departureAt) : null),
    [conversation.departureAt],
  );

  const typeStyle = conversation.tripType ? TRIP_TYPE_STYLES[conversation.tripType] : null;
  const isSent = conversation.lastMessage.senderId === currentUserId;

  const showOriginRow = !!(conversation.originSubtitle || typeStyle);
  const showDestRow = !!(conversation.destinationSubtitle || departureText);

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
        {/* Row 1: Name + status badge | departure date */}
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center flex-1 min-w-0 mr-2 gap-1.5">
            <Text
              className={`shrink text-base ${hasUnread ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}
              numberOfLines={1}
            >
              {conversation.counterpartFirstName} {conversation.counterpartLastName}
            </Text>
            {conversation.tripStatus && (
              <View
                className="rounded px-1.5 py-0.5 flex-shrink-0"
                style={{ backgroundColor: TRIP_STATUS_STYLES[conversation.tripStatus].bg }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: TRIP_STATUS_STYLES[conversation.tripStatus].text }}
                >
                  {TRIP_STATUS_LABELS[conversation.tripStatus]}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-neutral-400 flex-shrink-0">{departureText}</Text>
        </View>

        {/* Row 2: Origin dot + text | type badge */}
        {showOriginRow && (
          <View className="flex-row items-center justify-between mb-0.5">
            <View className="flex-row items-center flex-1 mr-2 min-w-0">
              <View
                className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                style={{ backgroundColor: ORIGIN_DOT_COLOR }}
              />
              {conversation.originSubtitle ? (
                <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
                  {conversation.originSubtitle}
                </Text>
              ) : (
                <View className="flex-1" />
              )}
            </View>
            {typeStyle && (
              <View
                className="rounded px-1.5 py-0.5 flex-shrink-0"
                style={{ backgroundColor: typeStyle.bg }}
              >
                <Text className="text-xs font-medium" style={{ color: typeStyle.text }}>
                  {TRIP_TYPE_LABELS[conversation.tripType!]}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Row 3: Destination dot + text | departure date */}
        {showDestRow && (
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1 mr-2 min-w-0">
              <View
                className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                style={{ backgroundColor: DESTINATION_DOT_COLOR }}
              />
              {conversation.destinationSubtitle ? (
                <Text className="text-xs text-neutral-500 flex-1" numberOfLines={1}>
                  {conversation.destinationSubtitle}
                </Text>
              ) : (
                <View className="flex-1" />
              )}
            </View>
          </View>
        )}

        {/* Row 4: icon · time · message | unread badge */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 min-w-0 mr-2">
            {isSent ? (
              <ArrowUpRight size={13} color={Colors.primary[600]} strokeWidth={2.5} />
            ) : (
              <ArrowDownLeft size={13} color={Colors.neutral[500]} strokeWidth={2.5} />
            )}
            <Text numberOfLines={1} className="text-sm text-neutral-500 flex-1 ml-1">
              {`${msgTime}  ${conversation.lastMessage.content}`}
            </Text>
          </View>
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
