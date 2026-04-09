import React from 'react';
import { View, Text } from 'react-native';
import { Info, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export function ChatDisclaimers() {
  return (
    <View className="flex-1 justify-center px-5 gap-4">
      {/* Community guidelines */}
      <View className="flex-row gap-3 bg-primary-50 rounded-xl p-4">
        <Info size={20} color={Colors.primary[600]} style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-primary-800 mb-1">
            Normas de convivencia
          </Text>
          <Text className="text-xs leading-4 text-primary-700">
            Mantén siempre un trato respetuoso. Los mensajes pueden ser revisados
            para garantizar la seguridad de la comunidad. El acoso o la
            discriminación pueden resultar en la suspensión de tu cuenta.
          </Text>
        </View>
      </View>

      {/* Payment scam warning */}
      <View
        className="flex-row gap-3 rounded-xl p-4"
        style={{ backgroundColor: Colors.semantic.warningLight }}
      >
        <AlertTriangle
          size={20}
          color={Colors.semantic.warning}
          style={{ marginTop: 2 }}
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-800 mb-1">
            Precaución con pagos
          </Text>
          <Text className="text-xs leading-4 text-neutral-700">
            No compartas datos bancarios ni hagas transferencias a través de
            enlaces enviados por chat. Realiza los pagos únicamente por los
            medios oficiales de la plataforma.
          </Text>
        </View>
      </View>

      <Text className="text-xs text-neutral-400 text-center mt-1">
        Envía un mensaje para iniciar la conversación
      </Text>
    </View>
  );
}
