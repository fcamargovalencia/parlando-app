import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import type { ChatMessageResponse } from '@/types/api';

interface ChatBubbleProps {
  message: ChatMessageResponse;
  isOwn: boolean;
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const time = useMemo(() => formatMessageTime(message.sentAt), [message.sentAt]);

  return (
    <View className={`mb-2 max-w-[80%] ${isOwn ? 'self-end' : 'self-start'}`}>
      <View
        className={`px-3.5 py-2.5 ${isOwn
            ? 'rounded-2xl rounded-br-md'
            : 'rounded-2xl rounded-bl-md'
          }`}
        style={{
          backgroundColor: isOwn ? Colors.primary[500] : Colors.neutral[100],
        }}
      >
        <Text
          className={`text-[15px] leading-5 ${isOwn ? 'text-white' : 'text-neutral-800'
            }`}
        >
          {message.content}
        </Text>
      </View>
      <Text
        className={`text-[11px] mt-0.5 px-1 ${isOwn ? 'text-right text-neutral-400' : 'text-neutral-400'
          }`}
      >
        {time}
      </Text>
    </View>
  );
}
