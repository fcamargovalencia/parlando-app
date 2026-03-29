import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Globe,
  Lock,
  Shield,
  HelpCircle,
  FileText,
  ChevronRight,
  Moon,
  Smartphone,
} from 'lucide-react-native';
import { Screen, Card } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { APP } from '@/constants/config';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen safe={false}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <SectionTitle title="Notificaciones" />
        <Card className="mb-6">
          <SettingToggle
            icon={<Bell size={20} color={Colors.primary[600]} />}
            label="Notificaciones push"
            defaultValue={true}
          />
          <View className="h-px bg-neutral-100" />
          <SettingToggle
            icon={<Smartphone size={20} color={Colors.primary[600]} />}
            label="Notificaciones por SMS"
            defaultValue={false}
          />
        </Card>

        {/* Preferences */}
        <SectionTitle title="Preferencias" />
        <Card className="mb-6">
          <SettingRow
            icon={<Globe size={20} color={Colors.primary[600]} />}
            label="Idioma"
            value="Español"
            onPress={() => Alert.alert('Próximamente', 'La selección de idioma estará disponible pronto.')}
          />
          <View className="h-px bg-neutral-100" />
          <SettingToggle
            icon={<Moon size={20} color={Colors.primary[600]} />}
            label="Modo oscuro"
            defaultValue={false}
            onToggle={() => Alert.alert('Próximamente', 'El modo oscuro estará disponible pronto.')}
          />
        </Card>

        {/* Security */}
        <SectionTitle title="Seguridad" />
        <Card className="mb-6">
          <SettingRow
            icon={<Lock size={20} color={Colors.accent[600]} />}
            label="Cambiar contraseña"
            onPress={() => Alert.alert('Próximamente', 'El cambio de contraseña estará disponible pronto.')}
          />
          <View className="h-px bg-neutral-100" />
          <SettingRow
            icon={<Shield size={20} color={Colors.accent[600]} />}
            label="Verificación en dos pasos"
            onPress={() => Alert.alert('Próximamente', 'La verificación en dos pasos estará disponible pronto.')}
          />
        </Card>

        {/* Legal */}
        <SectionTitle title="Legal" />
        <Card className="mb-6">
          <SettingRow
            icon={<FileText size={20} color={Colors.neutral[500]} />}
            label="Términos y condiciones"
            onPress={() => Linking.openURL('https://parlando.app/terms')}
          />
          <View className="h-px bg-neutral-100" />
          <SettingRow
            icon={<FileText size={20} color={Colors.neutral[500]} />}
            label="Política de privacidad"
            onPress={() => Linking.openURL('https://parlando.app/privacy')}
          />
          <View className="h-px bg-neutral-100" />
          <SettingRow
            icon={<HelpCircle size={20} color={Colors.neutral[500]} />}
            label="Centro de ayuda"
            onPress={() => Linking.openURL('https://parlando.app/help')}
          />
        </Card>

        {/* App Info */}
        <View className="items-center py-4">
          <Text className="text-sm text-neutral-400">
            {APP.NAME} v{APP.VERSION}
          </Text>
          <Text className="text-xs text-neutral-300 mt-1">
            Hecho con ❤️ en Colombia
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Section Title ──

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2 ml-1">
      {title}
    </Text>
  );
}

// ── Setting Row ──

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-3"
      activeOpacity={0.6}
    >
      <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-base text-neutral-800 flex-1">{label}</Text>
      {value && <Text className="text-sm text-neutral-400 mr-2">{value}</Text>}
      <ChevronRight size={18} color={Colors.neutral[300]} />
    </TouchableOpacity>
  );
}

// ── Setting Toggle ──

function SettingToggle({
  icon,
  label,
  defaultValue = false,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  defaultValue?: boolean;
  onToggle?: (value: boolean) => void;
}) {
  const [enabled, setEnabled] = React.useState(defaultValue);

  return (
    <View className="flex-row items-center py-3">
      <View className="w-10 h-10 rounded-xl bg-neutral-50 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-base text-neutral-800 flex-1">{label}</Text>
      <Switch
        value={enabled}
        onValueChange={(v) => {
          setEnabled(v);
          onToggle?.(v);
        }}
        trackColor={{ false: Colors.neutral[200], true: Colors.primary[400] }}
        thumbColor={enabled ? Colors.primary[600] : Colors.neutral[50]}
      />
    </View>
  );
}
