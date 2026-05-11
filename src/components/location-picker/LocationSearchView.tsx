import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { Navigation, X, Search, MapPin, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { LocationSearchResult } from '@/lib/maps';

interface Props {
  title: string;
  query: string;
  results: LocationSearchResult[];
  searching: boolean;
  locating: boolean;
  onChangeQuery: (q: string) => void;
  onClose: () => void;
  onSelectSuggestion: (result: LocationSearchResult) => void;
  onUseMyLocation: () => void;
  onOpenMap: () => void;
  onSubmitSearch: (q: string) => void;
}

export function LocationSearchView({
  title,
  query,
  results,
  searching,
  locating,
  onChangeQuery,
  onClose,
  onSelectSuggestion,
  onUseMyLocation,
  onOpenMap,
  onSubmitSearch,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
          <X size={24} color={Colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search input */}
      <View style={styles.searchRow}>
        <Search size={18} color={Colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ciudad o lugar..."
          placeholderTextColor={Colors.neutral[400]}
          value={query}
          onChangeText={onChangeQuery}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => {
            const q = query.trim();
            if (q.length >= 2) onSubmitSearch(q);
          }}
        />
        {searching ? (
          <ActivityIndicator size="small" color={Colors.primary[500]} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => onChangeQuery('')}>
            <X size={18} color={Colors.neutral[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick actions + suggestions */}
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              style={styles.listRow}
              onPress={onUseMyLocation}
              disabled={locating}
            >
              <View style={[styles.iconCircle, { backgroundColor: Colors.primary[50] }]}>
                {locating ? (
                  <ActivityIndicator size="small" color={Colors.primary[600]} />
                ) : (
                  <Navigation size={18} color={Colors.primary[600]} />
                )}
              </View>
              <Text style={[styles.rowPrimary, { color: Colors.primary[700] }]}>
                Usar mi ubicación actual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.listRow} onPress={onOpenMap}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.neutral[100] }]}>
                <MapPin size={18} color={Colors.neutral[600]} />
              </View>
              <Text style={[styles.rowPrimary, { flex: 1 }]}>Colocar en el mapa</Text>
              <ChevronRight size={18} color={Colors.neutral[400]} />
            </TouchableOpacity>

            {results.length > 0 && (
              <Text style={styles.sectionLabel}>
                {results[0].source === 'nominatim' ? 'OpenStreetMap' : 'Google Maps'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => onSelectSuggestion(item)}
          >
            <View style={[styles.iconCircle, { backgroundColor: Colors.neutral[100] }]}>
              <MapPin size={18} color={Colors.neutral[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowPrimary} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.rowSecondary} numberOfLines={1}>{item.address}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    backgroundColor: Colors.white,
  },
  iconBtn: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.neutral[900],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral[200],
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPrimary: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  rowSecondary: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.neutral[400],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
});
