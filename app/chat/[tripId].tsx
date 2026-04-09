import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ticket } from 'lucide-react-native';
import { Spinner } from '@/components/ui';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatDisclaimers } from '@/components/chat/ChatDisclaimers';
import { Colors } from '@/constants/colors';
import { useChat } from '@/hooks/useChat';

export default function ChatScreen() {
  const { tripId, otherUserId, otherUserName, otherUserPhoto } =
    useLocalSearchParams<{
      tripId: string;
      otherUserId: string;
      otherUserName: string;
      otherUserPhoto?: string;
    }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const { messages, trip, loading, sending, error, currentUserId, sendMessage, load } =
    useChat(tripId, otherUserId);

  // Android: track keyboard to toggle bottom insets
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardOpen(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const nameParts = (otherUserName ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const isDriver = trip?.driverId === currentUserId;

  const handleBookTrip = useCallback(() => {
    router.push(`/trip/${tripId}` as any);
  }, [router, tripId]);

  // On Android, keyboard already covers the nav bar area, so drop insets when open
  const bottomPadding =
    Platform.OS === 'android' && keyboardOpen ? 0 : insets.bottom;

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <ChatHeader
        firstName={firstName}
        lastName={lastName}
        photoUrl={otherUserPhoto}
        trip={trip}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
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
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isOwn={item.senderId === currentUserId}
              />
            )}
            contentContainerStyle={{
              flexGrow: 1,
              padding: 16,
              justifyContent: messages.length === 0 ? 'center' : undefined,
            }}
            ListEmptyComponent={<ChatDisclaimers />}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* Book trip CTA + input */}
        <View className="bg-white" style={{ paddingBottom: bottomPadding }}>
          {!isDriver && trip && (
            <TouchableOpacity
              onPress={handleBookTrip}
              className="flex-row items-center justify-center gap-2 mx-4 mt-2 mb-1 py-2.5 rounded-xl"
              style={{ backgroundColor: Colors.semantic.infoLight }}
            >
              <Ticket size={16} color={Colors.semantic.info} />
              <Text className="text-sm font-semibold" style={{ color: Colors.semantic.info }}>
                Reservar cupo · ${trip.pricePerSeat.toLocaleString()} {trip.currency}
              </Text>
            </TouchableOpacity>
          )}
          <ChatInput onSend={sendMessage} sending={sending} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
