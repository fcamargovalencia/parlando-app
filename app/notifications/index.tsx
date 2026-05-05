import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  Bell,
  ShieldCheck,
  MessageCircle,
  Route,
  Car,
  UserX,
  Clock,
  Repeat2,
  Trash2,
} from 'lucide-react-native';
import { EmptyState } from '@/components/ui';
import { useNotificationsStore, type StoredNotification } from '@/stores/notifications-store';
import { navigateToNotification, type NotificationData } from '@/hooks/useNotificationNavigation';
import { Colors } from '@/constants/colors';

// ── Icon & color by notification category ──────────────────────────────────

function iconForType(type: string): { icon: React.ReactNode; bg: string; } {
  if (type.startsWith('booking.') || type.startsWith('waitlist.')) {
    return {
      icon: <Route size={18} color={Colors.primary[600]} />,
      bg: Colors.primary[50],
    };
  }
  if (type.startsWith('trip.')) {
    return {
      icon: <Route size={18} color={Colors.primary[600]} />,
      bg: Colors.primary[50],
    };
  }
  if (type.startsWith('chat.')) {
    return {
      icon: <MessageCircle size={18} color="#7C3AED" />,
      bg: '#F5F3FF',
    };
  }
  if (type.startsWith('subscription.') || type.startsWith('routine.')) {
    return {
      icon: <Repeat2 size={18} color="#0891B2" />,
      bg: '#ECFEFF',
    };
  }
  if (type.startsWith('verification.') || type.startsWith('student_verification.')) {
    return {
      icon: <ShieldCheck size={18} color="#059669" />,
      bg: '#ECFDF5',
    };
  }
  if (type.startsWith('vehicle.')) {
    return {
      icon: <Car size={18} color="#D97706" />,
      bg: '#FFFBEB',
    };
  }
  if (type.startsWith('account.')) {
    return {
      icon: <UserX size={18} color="#DC2626" />,
      bg: '#FEF2F2',
    };
  }
  return {
    icon: <Bell size={18} color={Colors.neutral[500]} />,
    bg: Colors.neutral[100],
  };
}

function formatRelativeTime(ms: number): string {
  const diffMs = Date.now() - ms;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Ahora mismo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Hace ${diffHour} h`;
  const diffDay = Math.floor(diffHour / 24);
  return `Hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
}

// ── Notification row ────────────────────────────────────────────────────────

function NotificationItem({
  item,
  onPress,
  onDelete,
}: {
  item: StoredNotification;
  onPress: (item: StoredNotification) => void;
  onDelete: (id: string) => void;
}) {
  const { icon, bg } = iconForType(item.type);
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback(() => (
    <TouchableOpacity
      onPress={() => {
        swipeRef.current?.close();
        onDelete(item.id);
      }}
      activeOpacity={0.85}
      style={{
        width: 72,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral[100],
      }}
    >
      <Trash2 size={20} color="#FFFFFF" />
      <Text style={{ color: '#FFFFFF', fontSize: 11, marginTop: 3, fontWeight: '500' }}>
        Eliminar
      </Text>
    </TouchableOpacity>
  ), [item.id, onDelete]);

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: item.read ? '#FFFFFF' : '#F0F9FF',
          borderBottomWidth: 1,
          borderBottomColor: Colors.neutral[100],
          gap: 12,
        }}
      >
        {/* Icon bubble */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          {icon}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {item.title ? (
            <Text
              style={{
                fontSize: 14,
                fontWeight: item.read ? '400' : '600',
                color: Colors.neutral[900],
                marginBottom: 2,
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          ) : null}
          {item.body ? (
            <Text
              style={{ fontSize: 13, color: Colors.neutral[600], lineHeight: 18 }}
              numberOfLines={3}
            >
              {item.body}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <Clock size={11} color={Colors.neutral[400]} />
            <Text style={{ fontSize: 11, color: Colors.neutral[400] }}>
              {formatRelativeTime(item.receivedAt)}
            </Text>
          </View>
        </View>

        {/* Unread dot */}
        {!item.read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: Colors.primary[500],
              marginTop: 6,
            }}
          />
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const history = useNotificationsStore((s) => s.history);
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead);
  const clearHistory = useNotificationsStore((s) => s.clearHistory);
  const removeNotification = useNotificationsStore((s) => s.removeNotification);

  useFocusEffect(
    useCallback(() => {
      markAllAsRead();
      void Notifications.setBadgeCountAsync(0).catch(() => null);
    }, [markAllAsRead]),
  );

  const handlePress = useCallback(
    (item: StoredNotification) => {
      navigateToNotification(router, item.data as NotificationData);
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: string) => removeNotification(id),
    [removeNotification],
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Limpiar notificaciones',
      '¿Eliminar todas las notificaciones del historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: clearHistory },
      ],
    );
  }, [clearHistory]);

  const ListHeader = history.length > 0 ? (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral[100],
        backgroundColor: Colors.neutral[50],
      }}
    >
      <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Trash2 size={14} color={Colors.semantic.error} />
        <Text style={{ fontSize: 13, color: Colors.semantic.error, fontWeight: '500' }}>
          Limpiar todo
        </Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.neutral[50] }}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={handlePress} onDelete={handleDelete} />
        )}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={history.length === 0 ? { flex: 1 } : { paddingBottom: 40 }}
        ListEmptyComponent={
          <EmptyState
            icon={<Bell size={40} color={Colors.neutral[300]} />}
            title="Sin notificaciones"
            description="Aquí aparecerán las notificaciones que recibas mientras usas la app."
          />
        }
      />
    </View>
  );
}
