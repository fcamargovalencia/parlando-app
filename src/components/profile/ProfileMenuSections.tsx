import React from 'react';
import { useRouter } from 'expo-router';
import { Car, FileCheck, Settings, Shield, LogOut, Phone } from 'lucide-react-native';
import { Card, Badge, Divider } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { MenuItem } from '@/components/profile/MenuItem';
import type { UserResponse } from '@/types/api';

interface Props {
  user: UserResponse | null;
  onLogout: () => void;
}

export function ProfileMenuSections({ user, onLogout }: Props) {
  const router = useRouter();

  return (
    <>
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
          onPress={onLogout}
          danger
        />
      </Card>
    </>
  );
}
