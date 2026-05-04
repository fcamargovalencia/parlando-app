import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Info } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner } from '@/components/ui';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatDisclaimers } from '@/components/chat/ChatDisclaimers';
import { ChatSubscriptionBar } from '@/components/chat/ChatSubscriptionBar';
import { useRoutineChat } from '@/hooks/useRoutineChat';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { Colors } from '@/constants/colors';

export default function RoutineChatScreen() {
  const { routineTripId, otherUserId, otherUserName, otherUserPhoto, fromSubscriptionNew } =
    useLocalSearchParams<{
      routineTripId: string;
      otherUserId: string;
      otherUserName: string;
      otherUserPhoto?: string;
      fromSubscriptionNew?: string;
    }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const keyboardHeight = useKeyboardHeight();

  const {
    messages,
    routineTrip,
    mySubscription,
    counterpartSubscription,
    loading,
    sending,
    error,
    currentUserId,
    sendMessage,
    load,
  } = useRoutineChat(routineTripId, otherUserId);

  useEffect(() => {
    if (keyboardHeight <= 0) return;
    const timer = setTimeout(
      () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
      100,
    );
    return () => clearTimeout(timer);
  }, [keyboardHeight]);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const nameParts = (otherUserName ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const isCancelled = routineTrip?.status === 'CANCELLED';
  const isDriver = routineTrip?.driverId === currentUserId;

  const isAndroid = Platform.OS === 'android';
  const keyboardOpen = keyboardHeight > 0;
  const bottomPadding = keyboardOpen ? 0 : insets.bottom;

  return (
    <View
      className="flex-1 bg-neutral-50"
      style={isAndroid ? { paddingBottom: keyboardHeight } : undefined}
    >
      {/* Header */}
      <ChatHeader
        firstName={firstName}
        lastName={lastName}
        photoUrl={otherUserPhoto}
        routineTrip={routineTrip}
        onBack={() => router.back()}
      />

      {/* Subscription bar */}
      {routineTrip && !isCancelled && (
        <ChatSubscriptionBar
          isDriver={isDriver}
          routineTrip={routineTrip}
          mySubscription={mySubscription}
          counterpartSubscription={counterpartSubscription}
          fromSubscriptionNew={fromSubscriptionNew === 'true'}
        />
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={isAndroid ? undefined : 'padding'}
      >
        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Spinner />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6 gap-3">
            <Text className="text-sm text-neutral-500 text-center">{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text className="text-sm font-semibold text-primary-600">Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1">
            <ChatDisclaimers />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isOwn={item.senderId === currentUserId}
              />
            )}
            inverted
            contentContainerStyle={{
              flexGrow: 1,
              padding: 16,
              justifyContent: messages.length === 0 ? 'center' : undefined,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* Input o aviso de ruta cancelada */}
        <View className="bg-white" style={{ paddingBottom: bottomPadding }}>
          {isCancelled ? (
            <View className="px-4 pt-3 pb-2 border-t border-neutral-100">
              <View
                className="flex-row items-start gap-2 rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: Colors.semantic.infoLight,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                }}
              >
                <Info size={16} color={Colors.semantic.info} style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: Colors.semantic.info }}>
                    Ruta cancelada
                  </Text>
                  <Text className="text-xs text-neutral-600 mt-0.5">
                    Esta ruta fue cancelada. El chat queda disponible solo como historial.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <ChatInput onSend={sendMessage} sending={sending} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
