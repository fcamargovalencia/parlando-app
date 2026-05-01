import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, ChevronDown, MapPin, Minus, Plus, Search, Users } from 'lucide-react-native';
import dayjs from 'dayjs';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { UniversityPicker } from '@/components/university/UniversityPicker';
import { Colors } from '@/constants/colors';
import { TRIP_TYPE_OPTIONS } from '@/constants/trips';
import type { SelectedLocation } from '@/components/LocationPickerModal';
import type { TripType, UniversityResponse } from '@/types/api';

// ── Trip type dropdown ──

function TripTypeDropdown({
  tripType,
  onChange,
}: {
  tripType: TripType;
  onChange: (type: TripType) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = TRIP_TYPE_OPTIONS.find((t) => t.type === tripType)!;

  const handleSelect = (type: TripType) => {
    onChange(type);
    setOpen(false);
  };

  return (
    <View style={{ zIndex: 50 }} className="mb-4">
      {/* Trigger */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.75}
        className="flex-row items-center bg-neutral-50 rounded-2xl px-3 py-3"
        style={{ borderWidth: 1, borderColor: open ? Colors.primary[300] : '#E5E7EB' }}
      >
        <TripTypeIcon type={tripType} size={16} />
        <View className="flex-1 ml-2.5">
          <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>
            Tipo de viaje
          </Text>
          <Text className="text-sm font-semibold text-neutral-900">{selected.label}</Text>
        </View>
        <ChevronDown
          size={16}
          color={Colors.neutral[400]}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {/* Dropdown overlay */}
      {open && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: Colors.neutral[200],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 12,
            marginTop: 4,
            overflow: 'hidden',
          }}
        >
          {TRIP_TYPE_OPTIONS.map((t, i) => {
            const active = tripType === t.type;
            return (
              <TouchableOpacity
                key={t.type}
                onPress={() => handleSelect(t.type)}
                activeOpacity={0.7}
                className="flex-row items-center px-4 py-3.5"
                style={{
                  backgroundColor: active ? Colors.primary[50] : '#fff',
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: Colors.neutral[100],
                }}
              >
                <TripTypeIcon type={t.type} size={18} />
                <View className="flex-1 ml-3">
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: active ? Colors.primary[700] : Colors.neutral[800] }}
                  >
                    {t.label}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: Colors.neutral[400] }}>
                    {t.subtitle}
                  </Text>
                </View>
                {active && (
                  <View
                    className="w-4 h-4 rounded-full items-center justify-center"
                    style={{ backgroundColor: Colors.primary[500] }}
                  >
                    <View className="w-1.5 h-1.5 rounded-full bg-white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Destination mode toggle ──

function DestinationModeToggle({
  mode,
  onChange,
}: {
  mode: 'place' | 'university';
  onChange: (m: 'place' | 'university') => void;
}) {
  return (
    <View className="flex-row bg-neutral-100 rounded-xl p-0.5">
      {(['place', 'university'] as const).map((m) => {
        const active = mode === m;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => onChange(m)}
            activeOpacity={0.7}
            className={`flex-1 py-1.5 rounded-lg items-center ${active ? 'bg-white' : ''}`}
            style={
              active
                ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }
                : undefined
            }
          >
            <Text
              className={`text-xs font-semibold ${active ? 'text-neutral-900' : 'text-neutral-500'}`}
            >
              {m === 'place' ? 'Direccion' : 'Universidad'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Location button ──

function LocationButton({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: SelectedLocation | null;
  accent: boolean;
  onPress: () => void;
}) {
  const dotColor = accent ? Colors.accent[500] : Colors.primary[500];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center bg-neutral-50 rounded-2xl px-3 py-4"
      style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: accent ? Colors.accent[50] : Colors.primary[50] }}
      >
        <MapPin size={16} color={dotColor} />
      </View>
      <View className="flex-1 ml-2.5">
        {value ? (
          <>
            <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>
              {label}
            </Text>
            <Text className="text-sm font-semibold text-neutral-900 mt-0.5" numberOfLines={1}>
              {value.name}
            </Text>
          </>
        ) : (
          <Text className="text-base text-neutral-400">{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Props ──

interface SearchCardProps {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureDate: Date;
  tripType: TripType;
  canSearch: boolean;
  passengers: number;
  destinationMode: 'place' | 'university';
  selectedUniversity: UniversityResponse | null;
  onOpenOriginPicker: () => void;
  onOpenDestPicker: () => void;
  onOpenDatePicker: () => void;
  onTripTypeChange: (type: TripType) => void;
  onPassengersChange: (n: number) => void;
  onDestinationModeChange: (mode: 'place' | 'university') => void;
  onUniversitySelect: (id: string, university: UniversityResponse | null) => void;
  onSearch: () => void;
}

// ── Card ──

export function SearchCard({
  origin,
  destination,
  departureDate,
  tripType,
  canSearch,
  passengers,
  destinationMode,
  selectedUniversity,
  onOpenOriginPicker,
  onOpenDestPicker,
  onOpenDatePicker,
  onTripTypeChange,
  onPassengersChange,
  onDestinationModeChange,
  onUniversitySelect,
  onSearch,
}: SearchCardProps) {
  const isRoutine = tripType === 'ROUTINE';
  const dateLabel = dayjs(departureDate).isSame(dayjs(), 'day')
    ? 'Hoy'
    : dayjs(departureDate).isSame(dayjs().add(1, 'day'), 'day')
      ? 'Mañana'
      : dayjs(departureDate).format('D MMM');

  return (
    <View
      className="bg-white rounded-3xl p-5"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
        overflow: 'visible',
      }}
    >
      {/* Trip type dropdown — always at top */}
      <TripTypeDropdown tripType={tripType} onChange={onTripTypeChange} />

      {/* Route inputs with decoration */}
      <View className="gap-2 mb-3">
        <View className="flex-row">
          <View className="items-center mr-3 pt-5 pb-5" style={{ width: 20 }}>
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.primary[500] }} />
            <View
              className="flex-1 w-0.5 my-1"
              style={{ backgroundColor: Colors.neutral[200], minHeight: 18 }}
            />
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.accent[500] }} />
          </View>
          <View className="flex-1 gap-2">
            <LocationButton
              label="¿Desde dónde sales?"
              value={origin}
              accent={false}
              onPress={onOpenOriginPicker}
            />
            {isRoutine && (
              <DestinationModeToggle
                mode={destinationMode}
                onChange={onDestinationModeChange}
              />
            )}
            {isRoutine && destinationMode === 'university' ? (
              <UniversityPicker
                value={selectedUniversity?.id}
                selectedLabel={selectedUniversity?.name}
                onChange={onUniversitySelect}
                placeholder="Buscar universidad..."
              />
            ) : (
              <LocationButton
                label="¿A dónde vas?"
                value={destination}
                accent={true}
                onPress={onOpenDestPicker}
              />
            )}
          </View>
        </View>
      </View>

      {/* Date + passengers row — only for non-routine trips */}
      {!isRoutine && (
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={onOpenDatePicker}
            activeOpacity={0.75}
            className="flex-row items-center bg-neutral-50 rounded-2xl px-3 py-3"
            style={{ flex: 2, borderWidth: 1, borderColor: '#E5E7EB' }}
          >
            <Calendar size={16} color={Colors.primary[500]} />
            <View className="ml-2 flex-1">
              <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>
                Fecha
              </Text>
              <Text className="text-sm font-semibold text-neutral-900">{dateLabel}</Text>
            </View>
          </TouchableOpacity>

          <View
            className="flex-row items-center justify-between bg-neutral-50 rounded-2xl px-3 py-3"
            style={{ flex: 3, borderWidth: 1, borderColor: '#E5E7EB' }}
          >
            {/* Minus */}
            <TouchableOpacity
              onPress={() => onPassengersChange(Math.max(1, passengers - 1))}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-xl items-center justify-center"
              style={{
                backgroundColor: passengers <= 1 ? Colors.neutral[100] : Colors.primary[50],
                borderWidth: 1,
                borderColor: passengers <= 1 ? Colors.neutral[200] : Colors.primary[200],
              }}
            >
              <Minus size={14} color={passengers <= 1 ? Colors.neutral[300] : Colors.primary[600]} />
            </TouchableOpacity>

            {/* Center: icon + value */}
            <View className="flex-1 items-center">
              <Text className="text-xs font-medium" style={{ color: Colors.neutral[400] }}>Pasajeros</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Users size={13} color={Colors.primary[500]} />
                <Text className="text-sm font-semibold text-neutral-900">{passengers}</Text>
              </View>
            </View>

            {/* Plus */}
            <TouchableOpacity
              onPress={() => onPassengersChange(Math.min(8, passengers + 1))}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-xl items-center justify-center"
              style={{
                backgroundColor: passengers >= 8 ? Colors.neutral[100] : Colors.primary[50],
                borderWidth: 1,
                borderColor: passengers >= 8 ? Colors.neutral[200] : Colors.primary[200],
              }}
            >
              <Plus size={14} color={passengers >= 8 ? Colors.neutral[300] : Colors.primary[600]} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search button */}
      <TouchableOpacity
        onPress={onSearch}
        activeOpacity={canSearch ? 0.8 : 1}
        className="rounded-2xl py-4 flex-row items-center justify-center"
        style={{ backgroundColor: canSearch ? Colors.primary[600] : Colors.neutral[200] }}
      >
        <Search size={18} color={canSearch ? '#FFF' : Colors.neutral[400]} />
        <Text
          className="font-bold ml-2 text-base"
          style={{ color: canSearch ? '#FFF' : Colors.neutral[400] }}
        >
          Buscar viaje
        </Text>
      </TouchableOpacity>
    </View>
  );
}


