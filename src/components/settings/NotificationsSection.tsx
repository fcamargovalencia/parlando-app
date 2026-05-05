import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Bell, BookOpen, Map, MessageSquare, Users, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingToggle } from '@/components/settings/SettingToggle';
import { notificationsApi } from '@/api/notifications';
import { useNotificationsStore } from '@/stores/notifications-store';
import type { NotificationPreferences } from '@/types/api';

const ICON_BELL = <Bell size={20} color={Colors.primary[600]} />;
const ICON_BOOKINGS = <BookOpen size={20} color={Colors.primary[600]} />;
const ICON_TRIPS = <Map size={20} color={Colors.primary[600]} />;
const ICON_CHAT = <MessageSquare size={20} color={Colors.primary[600]} />;
const ICON_SUBS = <Users size={20} color={Colors.primary[600]} />;
const ICON_VERIF = <ShieldCheck size={20} color={Colors.primary[600]} />;

type PrefKey = keyof Omit<NotificationPreferences, 'push_enabled' | 'marketing'>;

const CATEGORY_ROWS: { key: PrefKey; label: string; icon: React.ReactNode; }[] = [
  { key: 'bookings', label: 'Reservas', icon: ICON_BOOKINGS },
  { key: 'trips', label: 'Viajes', icon: ICON_TRIPS },
  { key: 'chat', label: 'Mensajes', icon: ICON_CHAT },
  { key: 'subscriptions', label: 'Suscripciones', icon: ICON_SUBS },
  { key: 'verifications', label: 'Verificaciones', icon: ICON_VERIF },
];

export const NotificationsSection = React.memo(function NotificationsSection() {
  const { preferences, setPreferences } = useNotificationsStore((s) => ({
    preferences: s.preferences,
    setPreferences: s.setPreferences,
  }));
  const [loading, setLoading] = useState(preferences === null);
  const [osPermissionDenied, setOsPermissionDenied] = useState(false);

  // Load preferences and check OS permissions every time the settings screen gains focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          // 7.3 — Check OS-level permission (could be revoked from device settings)
          const { status } = await Notifications.getPermissionsAsync();
          if (!cancelled) setOsPermissionDenied(status !== 'granted');

          // 7.1 — Fetch preferences from backend
          const res = await notificationsApi.getPreferences();
          if (!cancelled && res.data.data) {
            setPreferences(res.data.data);
          }
        } catch {
          // Silently ignore — existing preferences (if any) remain usable
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => { cancelled = true; };
    }, [setPreferences]),
  );

  // Optimistically update store and persist to backend.
  const handleToggle = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!preferences) return;
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);
      try {
        await notificationsApi.updatePreferences({ [key]: value });
      } catch {
        // Revert on error
        setPreferences(preferences);
      }
    },
    [preferences, setPreferences],
  );

  const pushEnabled = preferences?.push_enabled ?? true;

  return (
    <>
      <SectionTitle title="Notificaciones" />

      {/* OS permission revocation banner (7.3) */}
      {osPermissionDenied && (
        <TouchableOpacity
          className="flex-row items-start gap-3 bg-warning-50 border border-warning-200 rounded-2xl px-4 py-3 mb-4"
          onPress={() => Linking.openSettings()}
          activeOpacity={0.8}
        >
          <AlertTriangle size={18} color="#d97706" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-warning-800">Permisos desactivados</Text>
            <Text className="text-xs text-warning-700 mt-0.5">
              Las notificaciones push están bloqueadas en la configuración del sistema.
              Toca aquí para habilitarlas.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <Card className="mb-6">
        {loading ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          </View>
        ) : (
          <>
            {/* Master push toggle */}
            <SettingToggle
              icon={ICON_BELL}
              label="Notificaciones push"
              value={pushEnabled}
              onToggle={(v) => void handleToggle('push_enabled', v)}
            />

            {/* Category toggles — disabled when push is globally off */}
            {CATEGORY_ROWS.map(({ key, label, icon }, i) => (
              <React.Fragment key={key}>
                <View className="h-px bg-neutral-100" />
                <SettingToggle
                  icon={icon}
                  label={label}
                  value={preferences?.[key] ?? true}
                  onToggle={(v) => void handleToggle(key, v)}
                  disabled={!pushEnabled}
                />
              </React.Fragment>
            ))}
          </>
        )}
      </Card>
    </>
  );
});
