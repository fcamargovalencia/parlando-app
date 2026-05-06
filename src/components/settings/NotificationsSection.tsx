import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Bell, BookOpen, Map, MessageSquare, Users, ShieldCheck, AlertTriangle, Mail, BellOff } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { SectionTitle } from '@/components/settings/SectionTitle';
import { SettingToggle } from '@/components/settings/SettingToggle';
import { notificationsApi } from '@/api/notifications';
import { useNotificationsStore } from '@/stores/notifications-store';
import { registerForPushNotifications } from '@/lib/notifications';
import type { NotificationPreferences } from '@/types/api';

const ICON_BELL = <Bell size={20} color={Colors.primary[600]} />;
const ICON_BOOKINGS = <BookOpen size={20} color={Colors.primary[600]} />;
const ICON_TRIPS = <Map size={20} color={Colors.primary[600]} />;
const ICON_CHAT = <MessageSquare size={20} color={Colors.primary[600]} />;
const ICON_SUBS = <Users size={20} color={Colors.primary[600]} />;
const ICON_VERIF = <ShieldCheck size={20} color={Colors.primary[600]} />;
const ICON_MAIL = <Mail size={20} color={Colors.primary[600]} />;

type PrefKey = keyof Omit<NotificationPreferences, 'push_enabled' | 'marketing'>;

const CATEGORY_ROWS: { key: PrefKey; label: string; icon: React.ReactNode; }[] = [
  { key: 'bookings', label: 'Reservas', icon: ICON_BOOKINGS },
  { key: 'trips', label: 'Viajes', icon: ICON_TRIPS },
  { key: 'chat', label: 'Mensajes', icon: ICON_CHAT },
  { key: 'subscriptions', label: 'Suscripciones', icon: ICON_SUBS },
  { key: 'verifications', label: 'Verificaciones', icon: ICON_VERIF },
];

type OsPermissionStatus = 'granted' | 'denied' | 'undetermined';

export const NotificationsSection = React.memo(function NotificationsSection() {
  const preferences = useNotificationsStore((s) => s.preferences);
  const setPreferences = useNotificationsStore((s) => s.setPreferences);
  const setPermissions = useNotificationsStore((s) => s.setPermissions);
  const [loading, setLoading] = useState(preferences === null);
  const [osStatus, setOsStatus] = useState<OsPermissionStatus>('granted');
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Load preferences and check OS permissions every time the settings screen gains focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          // Check OS-level permission (could be revoked from device settings)
          const { status } = await Notifications.getPermissionsAsync();
          if (!cancelled) {
            setOsStatus(status as OsPermissionStatus);
            // Keep store in sync with actual OS state
            setPermissions(status === 'granted');
          }

          // Fetch preferences from backend
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
    }, [setPreferences, setPermissions]),
  );

  // Optimistically update store and persist to backend.
  const handleToggle = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!preferences) return;
      let updated = { ...preferences, [key]: value };
      // Cascade: only when disabling the master toggle, turn off all categories too
      if (key === 'pushEnabled' && value === false) {
        updated = {
          ...updated,
          bookings: false,
          trips: false,
          chat: false,
          subscriptions: false,
          verifications: false,
        };
      }
      setPreferences(updated);
      try {
        await notificationsApi.updatePreferences(updated);
      } catch (err) {// Revert on error and notify user
        setPreferences(preferences);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No se pudo guardar la configuración',
        });
      }
    },
    [preferences, setPreferences],
  );

  // Request OS permission in-app when status is undetermined.
  const handleRequestPermission = useCallback(async () => {
    setRequestingPermission(true);
    try {
      await registerForPushNotifications();
      const { status } = await Notifications.getPermissionsAsync();
      setOsStatus(status as OsPermissionStatus);
      setPermissions(status === 'granted');
    } catch {
      // Silently ignore
    } finally {
      setRequestingPermission(false);
    }
  }, [setPermissions]);

  const pushEnabled = preferences?.pushEnabled ?? true;

  return (
    <>
      <SectionTitle title="Notificaciones" />

      {/* OS permission denied — send user to system settings */}
      {osStatus === 'denied' && (
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

      {/* OS permission undetermined — request in-app */}
      {osStatus === 'undetermined' && (
        <TouchableOpacity
          className="flex-row items-start gap-3 bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 mb-4"
          onPress={handleRequestPermission}
          activeOpacity={0.8}
          disabled={requestingPermission}
        >
          <BellOff size={18} color={Colors.primary[600]} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-primary-800">Activar notificaciones</Text>
            <Text className="text-xs text-primary-700 mt-0.5">
              Toca aquí para habilitar las notificaciones push en este dispositivo.
            </Text>
          </View>
          {requestingPermission && (
            <ActivityIndicator size="small" color={Colors.primary[600]} />
          )}
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
              onToggle={(v) => void handleToggle('pushEnabled', v)}
            />

            {/* Category toggles — disabled when push is globally off */}
            {CATEGORY_ROWS.map(({ key, label, icon }) => (
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

            {/* Marketing toggle — separated visually (email, not push) */}
            <View className="h-px bg-neutral-200 mt-2" />
            <Text className="text-xs text-neutral-400 pt-2 pb-0.5 px-1">Correos</Text>
            <SettingToggle
              icon={ICON_MAIL}
              label="Correos de marketing"
              value={preferences?.marketing ?? false}
              onToggle={(v) => void handleToggle('marketing', v)}
            />
          </>
        )}
      </Card>
    </>
  );
});
