import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Car, FileCheck, Settings, Shield, LogOut, Phone } from 'lucide-react-native';
import { Card, Badge, Divider } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { MenuItem } from '@/components/profile/MenuItem';
import type { UserResponse } from '@/types/api';

const ICON_PHONE = <Phone size={20} color={Colors.semantic.warning} />;
const ICON_CAR = <Car size={20} color={Colors.primary[600]} />;
const ICON_FILE_CHECK = <FileCheck size={20} color={Colors.accent[600]} />;
const ICON_SHIELD = <Shield size={20} color="#3B82F6" />;
const ICON_SETTINGS = <Settings size={20} color={Colors.neutral[600]} />;
const ICON_LOGOUT = <LogOut size={20} color={Colors.semantic.error} />;
const BADGE_PENDING = <Badge label="Pendiente" variant="warning" />;

interface Props {
  user: UserResponse | null;
  onLogout: () => void;
}

export const ProfileMenuSections = React.memo(function ProfileMenuSections({ user, onLogout }: Props) {
  const router = useRouter();

  const handleVerifyPhone = useCallback(
    () => router.push('/(auth)/verify-phone?from=profile'),
    [router],
  );
  const handleVehicles = useCallback(() => router.push('/vehicle'), [router]);
  const handleVerifications = useCallback(() => router.push('/verification'), [router]);
  const handleSecurity = useCallback(() => router.push('/profile/settings'), [router]);
  const handleSettings = useCallback(() => router.push('/profile/settings'), [router]);

  return (
    <>
      {user?.phoneVerified === false && (
        <Card className="mb-4">
          <MenuItem
            icon={ICON_PHONE}
            title="Verificar teléfono"
            subtitle="Verifica tu número para mayor seguridad"
            onPress={handleVerifyPhone}
            badge={BADGE_PENDING}
          />
        </Card>
      )}

      <Card className="mb-4">
        <MenuItem
          icon={ICON_CAR}
          title="Mis vehículos"
          subtitle="Gestiona tus vehículos registrados"
          onPress={handleVehicles}
        />
        <Divider />
        <MenuItem
          icon={ICON_FILE_CHECK}
          title="Verificaciones"
          subtitle="Estado de tus documentos"
          onPress={handleVerifications}
        />
        <Divider />
        <MenuItem
          icon={ICON_SHIELD}
          title="Seguridad"
          subtitle="Contraseña y autenticación"
          onPress={handleSecurity}
        />
      </Card>

      <Card className="mb-4">
        <MenuItem
          icon={ICON_SETTINGS}
          title="Configuración"
          subtitle="Preferencias y notificaciones"
          onPress={handleSettings}
        />
      </Card>

      <Card>
        <MenuItem
          icon={ICON_LOGOUT}
          title="Cerrar sesión"
          onPress={onLogout}
          danger
        />
      </Card>
    </>
  );
});
