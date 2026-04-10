import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface ChatInputProps {
  onSend: (message: string) => void;
  sending: boolean;
}

export function ChatInput({ onSend, sending }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || sending) return;
    onSend(text);
    setText('');
  };

  return (
    <View className="flex-row items-end gap-2 px-4 py-2.5 bg-white border-t border-neutral-100">
      <TextInput
        className="flex-1 bg-neutral-100 rounded-2xl px-4 py-2.5 text-base text-neutral-900 max-h-24"
        placeholder="Escribe un mensaje..."
        placeholderTextColor={Colors.neutral[400]}
        multiline
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        editable={!sending}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!text.trim() || sending}
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{
          backgroundColor: text.trim() ? Colors.primary[500] : Colors.neutral[200],
        }}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Send size={18} color={text.trim() ? '#fff' : Colors.neutral[400]} />
        )}
      </TouchableOpacity>
    </View>
  );
}
