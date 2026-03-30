import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Car,
  FileCheck,
  Settings,
  Star,
  Shield,
  LogOut,
  Edit2,
  Phone,
  Mail,
} from 'lucide-react-native';
import { Screen, Card, Avatar, Badge, Divider } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { getVerificationLevelLabel } from '@/lib/utils';

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: React.ReactNode;
  danger?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, badge, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5"
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${danger ? 'bg-red-50' : 'bg-neutral-50'
          }`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${danger ? 'text-red-600' : 'text-neutral-900'}`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xs text-neutral-400 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {badge}
      <ChevronRight size={18} color={Colors.neutral[300]} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const verificationBadge = () => {
    const level = user?.verificationLevel ?? 'NONE';
    const variant =
      level === 'FULL' || level === 'PREMIUM'
        ? 'success'
        : level === 'IDENTITY' || level === 'BASIC'
          ? 'warning'
          : 'neutral';
    return <Badge label={getVerificationLevelLabel(level)} variant={variant} />;
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-2xl font-bold text-neutral-900 mb-6">Mi perfil</Text>

        {/* Profile Card */}
        <Card className="mb-6">
          <View className="flex-row items-center">
            <Avatar
              uri={user?.profilePhotoUrl}
              firstName={user?.firstName ?? 'U'}
              lastName={user?.lastName ?? ''}
              size="lg"
              verified={
                user?.verificationLevel === 'FULL' ||
                user?.verificationLevel === 'PREMIUM'
              }
            />
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold text-neutral-900">
                {user?.firstName} {user?.lastName}
              </Text>
              <View className="flex-row items-center mt-1">
                <Star size={14} color={Colors.accent[500]} />
                <Text className="text-sm text-neutral-600 ml-1">
                  {user?.trustScore?.toFixed(1) ?? '0.0'}
                </Text>
                <Text className="text-sm text-neutral-400 ml-1">· {user?.role}</Text>
              </View>
              <View className="mt-2">{verificationBadge()}</View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/profile/edit')}
              className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center"
            >
              <Edit2 size={16} color={Colors.primary[600]} />
            </TouchableOpacity>
          </View>

          <Divider className="my-4" />

          {/* Contact Info */}
          <View className="gap-2.5">
            <View className="flex-row items-center">
              <Mail size={14} color={Colors.neutral[400]} />
              <Text className="text-sm text-neutral-600 ml-2">{user?.email}</Text>
            </View>
            <View className="flex-row items-center">
              <Phone size={14} color={Colors.neutral[400]} />
              <Text className="text-sm text-neutral-600 ml-2">{user?.phone}</Text>
            </View>
          </View>
        </Card>

        {/* Menu Sections */}
        {user?.phoneVerified === false && (
          <Card className="mb-4">
            <MenuItem
              icon={<Phone size={20} color={Colors.semantic.warning} />}
              title="Verificar teléfono"
              subtitle="Verifica tu número para mayor seguridad"
              onPress={() => router.push('/(auth)/verify-phone?from=profile')}
              badge={<Badge label="Pendiente" variant="warning" />}
            />
          </Card>
        )}

        <Card className="mb-4">
          <MenuItem
            icon={<Car size={20} color={Colors.primary[600]} />}
            title="Mis vehículos"
            subtitle="Gestiona tus vehículos registrados"
            onPress={() => router.push('/vehicle')}
          />
          <Divider />
          <MenuItem
            icon={<FileCheck size={20} color={Colors.accent[600]} />}
            title="Verificaciones"
            subtitle="Estado de tus documentos"
            onPress={() => router.push('/verification')}
          />
          <Divider />
          <MenuItem
            icon={<Shield size={20} color="#3B82F6" />}
            title="Seguridad"
            subtitle="Contraseña y autenticación"
            onPress={() => router.push('/profile/settings')}
          />
        </Card>

        <Card className="mb-4">
          <MenuItem
            icon={<Settings size={20} color={Colors.neutral[600]} />}
            title="Configuración"
            subtitle="Preferencias y notificaciones"
            onPress={() => router.push('/profile/settings')}
          />
        </Card>

        <Card>
          <MenuItem
            icon={<LogOut size={20} color={Colors.semantic.error} />}
            title="Cerrar sesión"
            onPress={handleLogout}
            danger
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
