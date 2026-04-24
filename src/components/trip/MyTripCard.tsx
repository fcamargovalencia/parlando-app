import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Ban,
  Banknote,
  Car,
  ChevronRight,
  Clock,
  GraduationCap as StudentsIcon,
  Luggage,
  MapPin,
  Star,
  Ticket,
  Users,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import { Badge, Card } from '@/components/ui';
import { RoutePreview } from '@/components/RoutePreview';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { Colors } from '@/constants/colors';
import { formatCurrency, formatDeparture, getTripTypeLabel } from '@/lib/utils';
import type { MyTripItem, MyTripRole } from '@/types/my-trips';

const CHEVRON_RIGHT = <ChevronRight size={20} color={Colors.neutral[300]} />;

// ── Role chip ──

const ROLE_CONFIG: Record<
  MyTripRole,
  { label: string; color: string; bg: string; border: string; Icon: typeof Car; }
> = {
  driver: {
    label: 'Conductor',
    color: Colors.role.driver.text,
    bg: Colors.role.driver.bg,
    border: Colors.role.driver.border,
    Icon: Car,
  },
  passenger: {
    label: 'Pasajero',
    color: Colors.role.passenger.text,
    bg: Colors.role.passenger.bg,
    border: Colors.role.passenger.border,
    Icon: Ticket,
  },
};

function RoleChip({ role }: { role: MyTripRole; }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.Icon;
  return (
    <View
      className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border }}
    >
      <Icon size={11} color={cfg.color} />
      <Text className="text-[11px] font-semibold" style={{ color: cfg.color }}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ── Meta row ──

function MetaRow({ item }: { item: MyTripItem; }) {
  return (
    <View className="gap-y-2.5">
      {/* Time */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Clock size={15} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600">{formatDeparture(item.departureAt)}</Text>
        </View>
        {item.estimatedArrivalAt && (
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm text-neutral-400">→</Text>
            <Text className="text-sm text-neutral-600">
              {dayjs(item.estimatedArrivalAt).format('h:mm A')}
            </Text>
          </View>
        )}
      </View>

      {/* Seats + price */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Users size={15} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600">{item.seats.label}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Banknote size={15} color={Colors.neutral[400]} />
          <Text className="text-sm font-medium text-neutral-700">
            {formatCurrency(item.pricePerSeat, item.currency)} / asiento
          </Text>
        </View>
      </View>

      {/* Stops (driver) */}
      {item.stopCount != null && item.stopCount > 0 && (
        <View className="flex-row items-center gap-2">
          <MapPin size={15} color={Colors.neutral[400]} />
          <Text className="text-sm text-neutral-600">
            {item.stopCount} {item.stopCount === 1 ? 'parada' : 'paradas'}
          </Text>
        </View>
      )}

      {/* Luggage */}
      <View className="flex-row items-center gap-2">
        <Luggage
          size={15}
          color={item.allowsLuggage ? Colors.neutral[400] : Colors.neutral[300]}
        />
        <Text
          className={`text-sm ${item.allowsLuggage ? 'text-neutral-600' : 'text-neutral-300'}`}
        >
          {item.allowsLuggage ? 'Equipaje permitido' : 'Sin equipaje'}
        </Text>
        {!item.allowsLuggage && <Ban size={13} color="#EF4444" />}
      </View>

      {/* Students only (driver) */}
      {item.studentsOnly && (
        <View className="flex-row items-center gap-2">
          <StudentsIcon size={15} color="#3B82F6" />
          <Text className="text-sm text-blue-500">Solo estudiantes</Text>
        </View>
      )}
    </View>
  );
}

// ── Footer actions ──

interface FooterProps {
  item: MyTripItem;
  cancelling: boolean;
  onCancel: () => void;
  onRate: () => void;
}

function Footer({ item, cancelling, onCancel, onRate }: FooterProps) {
  const { canCancel, ratingStatus, role } = item;
  if (!canCancel && ratingStatus === 'none') return null;

  const cancelLabel = role === 'driver' ? 'Cancelar viaje' : 'Cancelar reserva';
  const rateLabel = role === 'driver' ? 'Calificar pasajeros' : 'Calificar conductor';
  const ratedLabel = role === 'driver' ? 'Pasajeros calificados' : 'Calificado';

  return (
    <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-neutral-100">
      {canCancel ? (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onCancel(); }}
          disabled={cancelling}
        >
          <Text className={`text-sm font-medium ${cancelling ? 'text-neutral-400' : 'text-red-500'}`}>
            {cancelling ? 'Cancelando...' : cancelLabel}
          </Text>
        </TouchableOpacity>
      ) : <View />}

      {ratingStatus === 'pending' && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onRate(); }}
          className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full"
          style={{ borderWidth: 1, borderColor: '#FDE68A' }}
        >
          <Star size={13} color={Colors.semantic.warning} fill={Colors.semantic.warning} />
          <Text className="text-sm font-semibold text-amber-600">{rateLabel}</Text>
        </TouchableOpacity>
      )}

      {ratingStatus === 'done' && (
        <View
          className="flex-row items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full"
          style={{ borderWidth: 1, borderColor: '#BBF7D0' }}
        >
          <Star size={13} color="#16A34A" fill="#16A34A" />
          <Text className="text-sm font-semibold text-green-700">{ratedLabel}</Text>
        </View>
      )}
    </View>
  );
}

// ── Card ──

interface MyTripCardProps {
  item: MyTripItem;
  cancelling: boolean;
  onPress: (tripId: string) => void;
  onCancel: (item: MyTripItem) => void;
  onRate: (item: MyTripItem) => void;
}

export const MyTripCard = React.memo(function MyTripCard({ item, cancelling, onPress, onCancel, onRate }: MyTripCardProps) {
  return (
    <TouchableOpacity onPress={() => onPress(item.tripId)} activeOpacity={0.75}>
      <Card className="mb-3">
        {/* Header: type + role chip + status badge */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <TripTypeIcon type={item.tripType} size={15} />
            <Text className="text-sm font-medium text-neutral-500">
              {getTripTypeLabel(item.tripType)}
            </Text>
            <RoleChip role={item.role} />
          </View>
          <Badge label={item.statusBadge.label} variant={item.statusBadge.variant} />
        </View>

        {/* Route */}
        <View className="mb-4">
          <RoutePreview
            originName={item.originName}
            originSubtitle={item.originSubtitle}
            destinationName={item.destinationName}
            destinationSubtitle={item.destinationSubtitle}
            rightContent={CHEVRON_RIGHT}
          />
        </View>

        {/* Divider */}
        <View className="h-px mb-3" style={{ backgroundColor: Colors.neutral[100] }} />

        {/* Meta */}
        <MetaRow item={item} />

        {/* Footer */}
        <Footer
          item={item}
          cancelling={cancelling}
          onCancel={() => onCancel(item)}
          onRate={() => onRate(item)}
        />
      </Card>
    </TouchableOpacity>
  );
});
