import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Search, X, ChevronRight } from 'lucide-react-native';
import { universitiesApi } from '@/api/universities';
import { tomtomService } from '@/lib/tomtom';
import type { UniversityResponse } from '@/types/api';
import { Colors } from '@/constants/colors';

interface UniversityPickerProps {
  value?: string;
  selectedLabel?: string;
  onChange: (id: string, university: (UniversityResponse & { latitude: number; longitude: number; address: string; }) | null) => void;
  placeholder?: string;
}

export function UniversityPicker({
  value,
  selectedLabel,
  onChange,
  placeholder = 'Buscar universidad...',
}: UniversityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversityResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await universitiesApi.search({ q });
        setResults(Array.isArray(res.data.data) ? res.data.data : []);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleSelect = async (university: UniversityResponse) => {
    handleClose();
    setGeocoding(true);
    try {
      const geoResults = await tomtomService.searchLocations(
        `${university.name}, ${university.city}`,
      );
      const geo = geoResults?.[0];
      if (!geo) throw new Error('No se encontraron coordenadas');
      onChange(university.id, {
        ...university,
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: geo.address ?? university.city,
      });
    } catch {
      onChange(university.id, {
        ...university,
        latitude: 0,
        longitude: 0,
        address: university.city,
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleClear = () => {
    onChange('', null);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="flex-row items-center border border-neutral-200 rounded-2xl px-4 py-3.5 bg-white"
      >
        <Search size={18} color={Colors.neutral[400]} />
        <Text
          className={`ml-3 flex-1 text-base ${value ? 'text-neutral-900' : 'text-neutral-400'}`}
          numberOfLines={1}
        >
          {(value && selectedLabel) ? selectedLabel : placeholder}
        </Text>
        {geocoding ? (
          <ActivityIndicator size="small" color={Colors.primary[500]} />
        ) : value ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={Colors.neutral[400]} />
          </TouchableOpacity>
        ) : (
          <ChevronRight size={18} color={Colors.neutral[400]} />
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={handleClose}>
        <View className="flex-1 bg-surface-muted">
          {/* Header */}
          <View className="bg-white px-4 pt-12 pb-3 border-b border-neutral-100">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleClose}
                className="mr-3"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={Colors.dark.DEFAULT} />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-neutral-900">
                Seleccionar universidad
              </Text>
            </View>

            {/* Search input */}
            <View className="flex-row items-center bg-neutral-100 rounded-xl px-3 py-2.5 mt-3">
              <Search size={18} color={Colors.neutral[400]} />
              <TextInput
                className="flex-1 ml-2 text-base text-neutral-900"
                placeholder="Escribe el nombre..."
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
                returnKeyType="search"
                placeholderTextColor={Colors.neutral[400]}
              />
              {searchLoading ? (
                <ActivityIndicator size="small" color={Colors.primary[500]} />
              ) : null}
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
                className="bg-white rounded-2xl px-4 py-3.5 flex-row items-center"
              >
                <View className="flex-1">
                  <Text className="text-base font-semibold text-neutral-900">{item.name}</Text>
                  <Text className="text-sm text-neutral-500 mt-0.5">
                    {item.shortName} · {item.city}
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.neutral[400]} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length > 0 && !searchLoading ? (
                <View className="items-center py-8">
                  <Text className="text-neutral-500 text-base">
                    Sin resultados para "{query}"
                  </Text>
                </View>
              ) : query.length === 0 ? (
                <View className="items-center py-8">
                  <Search size={32} color={Colors.neutral[300]} />
                  <Text className="text-neutral-400 text-base mt-3">
                    Empieza a escribir para buscar
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </>
  );
}
