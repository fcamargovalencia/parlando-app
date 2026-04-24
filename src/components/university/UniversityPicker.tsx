import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { universitiesApi } from '@/api/universities';
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const res = await universitiesApi.search({ q });
        setResults(Array.isArray(res.data.data) ? res.data.data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleSelect = (university: UniversityResponse) => {
    setQuery('');
    setResults([]);
    onChange(university.id, {
      ...university,
      latitude: university.latitude,
      longitude: university.longitude,
      address: university.address,
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    onChange('', null);
  };

  const showDropdown = !value && query.trim().length > 0;

  if (value && selectedLabel) {
    return (
      <TouchableOpacity
        onPress={handleClear}
        activeOpacity={0.7}
        className="flex-row items-center border border-primary-200 rounded-2xl px-4 py-3.5 bg-primary-50"
      >
        <Search size={18} color={Colors.primary[500]} />
        <Text className="ml-3 flex-1 text-base text-primary-900 font-medium" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <X size={18} color={Colors.primary[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ zIndex: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: showDropdown ? Colors.primary[300] : Colors.neutral[200],
          borderRadius: showDropdown ? 0 : 16,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomLeftRadius: showDropdown ? 0 : 16,
          borderBottomRightRadius: showDropdown ? 0 : 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: '#fff',
        }}
      >
        <Search size={18} color={Colors.neutral[400]} />
        <TextInput
          style={{ flex: 1, marginLeft: 12, fontSize: 16, color: Colors.neutral[900] }}
          placeholder={placeholder}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          placeholderTextColor={Colors.neutral[400]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary[500]} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={Colors.neutral[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showDropdown ? (
        <View
          style={{
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: Colors.primary[300],
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            backgroundColor: '#fff',
            maxHeight: 220,
            overflow: 'hidden',
          }}
        >
          {results.length > 0 ? results.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: '#f1f5f9',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {item.shortName} · {item.city}
              </Text>
            </TouchableOpacity>
          )) : !loading ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                    Sin resultados para "{query}"
                  </Text>
                </View>
              ) : null
            }
        </View>
      ) : null}
    </View>
  );
}
