import React from 'react';
import { Modal } from 'react-native';
import { useLocationPicker } from '@/hooks/useLocationPicker';
import { LocationSearchView } from '@/components/location-picker/LocationSearchView';
import { LocationMapView } from '@/components/location-picker/LocationMapView';
import type { RoutineTripResponse } from '@/types/api';

// Re-export for backward compatibility — 8 files import SelectedLocation from here.
export type { SelectedLocation } from '@/hooks/useLocationPicker';

interface Props {
  visible: boolean;
  title: string;
  onConfirm: (loc: import('@/hooks/useLocationPicker').SelectedLocation) => void;
  onClose: () => void;
  initial?: import('@/hooks/useLocationPicker').SelectedLocation | null;
  mode?: 'full' | 'map-only';
  mapHintText?: string;
  municipalityFocus?: { latitude: number; longitude: number; name: string };
  allowCitySelection?: boolean;
  routeLine?: RoutineTripResponse['routeLine'];
}

export function LocationPickerModal({
  visible,
  title,
  onConfirm,
  onClose,
  initial,
  mode = 'full',
  mapHintText,
  municipalityFocus,
  allowCitySelection = false,
  routeLine,
}: Props) {
  const picker = useLocationPicker({
    visible,
    initial,
    mode,
    municipalityFocus,
    allowCitySelection,
    baseRouteLine: routeLine,
    onConfirm,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={
        picker.mapVisible && mode !== 'map-only'
          ? () => picker.setMapVisible(false)
          : onClose
      }
    >
      {!picker.mapVisible && mode !== 'map-only' ? (
        <LocationSearchView
          title={title}
          query={picker.query}
          results={picker.results}
          searching={picker.searching}
          locating={picker.locating}
          onChangeQuery={picker.setQuery}
          onClose={onClose}
          onSelectSuggestion={picker.handleSelectSuggestion}
          onUseMyLocation={picker.handleUseMyLocation}
          onOpenMap={picker.openMap}
          onSubmitSearch={picker.doSearch}
        />
      ) : (
        <LocationMapView
          mapRef={picker.mapRef}
          mapInitialRegion={picker.mapInitialRegion}
          mapName={picker.mapName}
          centerCoord={picker.centerCoord}
          isDragging={picker.isDragging}
          reverseGeocoding={picker.reverseGeocoding}
          municipalityCenter={picker.municipalityCenter}
          routeCoordinates={picker.routeCoordinates}
          mapHintText={mapHintText}
          mode={mode}
          onBack={mode === 'map-only' ? onClose : () => picker.setMapVisible(false)}
          onChangeMapName={picker.setMapName}
          onRegionChange={picker.handleRegionChange}
          onRegionChangeComplete={picker.handleRegionChangeComplete}
          onMapReady={picker.handleMapReady}
          onConfirm={picker.handleMapConfirm}
        />
      )}
    </Modal>
  );
}
