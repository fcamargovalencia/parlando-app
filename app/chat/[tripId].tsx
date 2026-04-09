import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { messages, trip, loading, sending, error, currentUserId, sendMessage, load } =
    useChat(tripId, otherUserId);

  // Android edge-to-edge: the window no longer auto-resizes on keyboard,
  // so we capture the keyboard height and push the whole screen up manually.
  // NOTE: e.endCoordinates.height can be short by the nav-bar height in edge-to-edge
  // mode, so we compute the footprint from the screen bottom to the keyboard top.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      const screenHeight = Dimensions.get('screen').height;
      const keyboardTop = e.endCoordinates.screenY;
      const footprint = Math.max(e.endCoordinates.height, screenHeight - keyboardTop);
      setKeyboardHeight(footprint);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
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
  const isAndroid = Platform.OS === 'android';
  const keyboardOpen = keyboardHeight > 0;
  const bottomPadding = isAndroid && keyboardOpen ? 0 : insets.bottom;

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
        trip={trip}
        onBack={() => router.back()}
      />

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
