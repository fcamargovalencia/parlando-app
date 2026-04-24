import React from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, Car, ChevronDown, CreditCard, FileText, Plus, X } from 'lucide-react-native';
import { Screen, Button, Input, DatePickerModal } from '@/components/ui';
import { DocumentUploadCard } from '@/components/vehicle/DocumentUploadCard';
import { Colors } from '@/constants/colors';
import {
  CapturePhotoModal,
  type CapturedPhoto,
} from '@/components/verification/CapturePhotoModal';
import {
  useVehicleAddScreen,
  formatHumanDate,
  licenseOptionLabel,
} from '@/hooks/screens/useVehicleAddScreen';

export default function AddVehicleScreen() {
  const {
    form,
    setField,
    docs,
    uploading,
    submitting,
    error,
    soatExpiry,
    soatExpiryDate,
    setSoatExpiryDate,
    showDatePicker,
    setShowDatePicker,
    existingLicenses,
    loadingLicenses,
    selectedLicenseId,
    selectedLicense,
    selectedLicenseIndex,
    showNewLicenseForm,
    showLicenseDropdown,
    setShowLicenseDropdown,
    handlers,
  } = useVehicleAddScreen();

  return (
    <Screen safe={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-4 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4 mb-6">
            <View className="flex-row gap-3">
              <View className="w-32">
                <Input
                  label="Placa *"
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  value={form.plateNumber}
                  onChangeText={(v) => setField('plateNumber', v.replace(/[^a-zA-Z0-9]/g, ''))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Marca *"
                  placeholder="Toyota"
                  value={form.brand}
                  onChangeText={(v) => setField('brand', v)}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Año *"
                  placeholder="2022"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={form.year}
                  onChangeText={(v) => setField('year', v.replace(/\D/g, ''))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Modelo *"
                  placeholder="Corolla"
                  value={form.model}
                  onChangeText={(v) => setField('model', v)}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Color *"
                  placeholder="Blanco"
                  value={form.color}
                  onChangeText={(v) => setField('color', v)}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Capacidad *"
                  placeholder="4"
                  keyboardType="number-pad"
                  maxLength={1}
                  value={form.capacity}
                  onChangeText={(v) => setField('capacity', v.replace(/\D/g, ''))}
                  hint="Asientos disponibles (1-8)"
                />
              </View>
            </View>
          </View>

          <Text className="text-base font-semibold text-neutral-900 mb-2">
            Vencimiento SOAT *
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
            className="border border-neutral-200 rounded-2xl px-4 py-3 bg-white mb-6"
          >
            <Text className={soatExpiry ? 'text-neutral-900' : 'text-neutral-400'}>
              {soatExpiry ? formatHumanDate(soatExpiry) : 'Seleccionar fecha en calendario'}
            </Text>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={soatExpiryDate ?? new Date()}
            mode="date"
            title="Vencimiento SOAT"
            minimumDate={new Date()}
            onConfirm={(date) => { setSoatExpiryDate(date); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text className="text-base font-semibold text-neutral-900 mb-3">
            Archivos requeridos
          </Text>

          {/* Vehicle photos */}
          <View className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4">
            <TouchableOpacity className="flex-row items-center" onPress={docs.handlers.addVehiclePhoto} activeOpacity={0.8}>
              <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
                <Camera size={24} color={Colors.primary[600]} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-neutral-800">Fotos del vehículo *</Text>
                <Text className="text-xs text-neutral-400 mt-0.5">Agrega entre 1 y 4 fotos exteriores claras.</Text>
              </View>
            </TouchableOpacity>
            {docs.vehiclePhotos.length > 0 && (
              <View className="flex-row flex-wrap gap-3 mt-4">
                {docs.vehiclePhotos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} className="relative">
                    <Image source={{ uri: photo.uri }} className="w-20 h-20 rounded-2xl" resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => docs.handlers.removeVehiclePhoto(index)}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/70 items-center justify-center"
                      activeOpacity={0.8}
                    >
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <DocumentUploadCard
            title="SOAT (PDF) *"
            description="Selecciona el PDF del SOAT desde la galería/archivos del dispositivo."
            icon={<Car size={24} color={Colors.accent[600]} />}
            fileLabel={docs.soatDocument?.name}
            onPick={() => { void docs.handlers.pickSoatPdf(); }}
            onRemove={docs.soatDocument ? docs.handlers.clearSoat : undefined}
          />

          <DocumentUploadCard
            title="Tarjeta de propiedad *"
            description="Carga una imagen clara del documento completo."
            icon={<FileText size={24} color={Colors.primary[600]} />}
            preview={docs.transitCardDocument?.uri}
            onPick={docs.handlers.pickTransitCard}
            onRemove={docs.transitCardDocument ? docs.handlers.clearTransitCard : undefined}
          />

          {/* Driver license */}
          <Text className="text-base font-semibold text-neutral-900 mb-2 mt-2">
            Licencia de conducción
          </Text>

          {loadingLicenses ? (
            <Text className="text-sm text-neutral-500 mb-4">Cargando licencias registradas...</Text>
          ) : (
            <View className="flex-row items-center gap-2 mb-4">
              <TouchableOpacity
                onPress={() => existingLicenses.length > 0 && setShowLicenseDropdown(true)}
                activeOpacity={existingLicenses.length > 0 ? 0.8 : 1}
                className="flex-1 flex-row items-center justify-between border border-neutral-200 rounded-2xl px-4 py-3 bg-white"
              >
                <Text className={selectedLicense ? 'text-neutral-900' : 'text-neutral-400'}>
                  {selectedLicense
                    ? licenseOptionLabel(selectedLicense, selectedLicenseIndex)
                    : existingLicenses.length > 0
                      ? 'Sin licencia seleccionada'
                      : 'Sin licencias registradas'}
                </Text>
                {existingLicenses.length > 0 && (
                  <ChevronDown size={16} color={Colors.neutral[400]} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlers.handleToggleNewLicenseForm}
                activeOpacity={0.8}
                className={`w-11 h-11 rounded-2xl items-center justify-center ${showNewLicenseForm ? 'bg-primary-600' : 'bg-primary-50'}`}
              >
                <Plus size={20} color={showNewLicenseForm ? '#FFF' : Colors.primary[600]} />
              </TouchableOpacity>
            </View>
          )}

          {showNewLicenseForm && (
            <>
              <Input
                label="Número de licencia *"
                placeholder="123456789"
                value={form.driverLicenseNumber}
                onChangeText={(v) => setField('driverLicenseNumber', v)}
                containerClassName="mb-4"
              />
              <DocumentUploadCard
                title="Licencia frontal *"
                description="Foto del frente de la licencia de conducción."
                icon={<CreditCard size={24} color={Colors.primary[600]} />}
                preview={docs.driverLicenseFront?.uri}
                onPick={docs.handlers.pickDriverLicenseFront}
                onRemove={docs.driverLicenseFront ? docs.handlers.clearLicenseFront : undefined}
              />
              <DocumentUploadCard
                title="Licencia posterior *"
                description="Foto del respaldo de la licencia de conducción."
                icon={<CreditCard size={24} color={Colors.primary[600]} />}
                preview={docs.driverLicenseBack?.uri}
                onPick={docs.handlers.pickDriverLicenseBack}
                onRemove={docs.driverLicenseBack ? docs.handlers.clearLicenseBack : undefined}
              />
            </>
          )}

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <Button
            onPress={handlers.handleSubmit}
            loading={submitting || uploading || loadingLicenses}
            disabled={loadingLicenses}
            size="lg"
            className="w-full"
          >
            {uploading ? 'Subiendo archivos...' : 'Registrar vehículo'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <CapturePhotoModal
        visible={!!docs.pendingCameraCapture}
        target={docs.pendingCameraCapture ? 'documentFront' : null}
        customConfig={docs.pendingCameraCapture?.config}
        onClose={docs.closeCameraOverlay}
        onCapture={(photo: CapturedPhoto) => {
          if (docs.pendingCameraCapture) {
            docs.pendingCameraCapture.onCaptured({ uri: photo.uri });
          }
          docs.closeCameraOverlay();
        }}
      />

      {showLicenseDropdown && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowLicenseDropdown(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/35 justify-end"
            activeOpacity={1}
            onPress={() => setShowLicenseDropdown(false)}
          >
            <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
              <Text className="text-base font-semibold text-neutral-900 mb-4">
                Seleccionar licencia
              </Text>
              <TouchableOpacity
                onPress={() => handlers.handleSelectLicense(null)}
                activeOpacity={0.8}
                className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 ${selectedLicenseId === null ? 'bg-primary-50' : 'bg-neutral-50'}`}
              >
                <Text className={`flex-1 text-sm ${selectedLicenseId === null ? 'font-semibold text-primary-700' : 'text-neutral-700'}`}>
                  Sin licencia
                </Text>
              </TouchableOpacity>
              {existingLicenses.map((license, index) => (
                <TouchableOpacity
                  key={license.id}
                  onPress={() => handlers.handleSelectLicense(license.id)}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 ${selectedLicenseId === license.id ? 'bg-primary-50' : 'bg-neutral-50'}`}
                >
                  <View className="flex-1">
                    <Text className={`text-sm ${selectedLicenseId === license.id ? 'font-semibold text-primary-700' : 'text-neutral-700'}`}>
                      {licenseOptionLabel(license, index)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Screen>
  );
}
