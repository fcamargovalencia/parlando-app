import React, { useRef, useState } from 'react';
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
  const inputRef = useRef<TextInput>(null);
  // Ref para el texto real — siempre en sync con la capa nativa, sin lag de autocorrect
  const textRef = useRef('');
  // Estado mínimo solo para habilitar/colorear el botón de enviar
  const [hasText, setHasText] = useState(false);
  // Guard para ignorar el onChangeText que iOS dispara al hacer commit del autocorrect
  // justo después de clear() — se libera en el siguiente frame de animación.
  const ignoringRef = useRef(false);

  const handleChangeText = (value: string) => {
    if (ignoringRef.current) return;
    textRef.current = value;
    setHasText(value.trim().length > 0);
  };

  const handleSend = () => {
    const message = textRef.current.trim();
    if (!message || sending) return;
    ignoringRef.current = true;
    inputRef.current?.clear();
    textRef.current = '';
    setHasText(false);
    onSend(message);
    // Liberar el guard después de que iOS haya tenido oportunidad de disparar
    // cualquier onChangeText pendiente del autocorrect.
    requestAnimationFrame(() => {
      ignoringRef.current = false;
    });
  };

  return (
    <View className="flex-row items-end gap-2 px-4 py-2.5 bg-white border-t border-neutral-100">
      <TextInput
        ref={inputRef}
        className="flex-1 bg-neutral-100 rounded-2xl px-4 py-2.5 text-base text-neutral-900 max-h-24"
        placeholder="Escribe un mensaje..."
        placeholderTextColor={Colors.neutral[400]}
        multiline
        onChangeText={handleChangeText}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        editable={!sending}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!hasText || sending}
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{
          backgroundColor: hasText ? Colors.primary[500] : Colors.neutral[200],
        }}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Send size={18} color={hasText ? '#fff' : Colors.neutral[400]} />
        )}
      </TouchableOpacity>
    </View>
  );
}
