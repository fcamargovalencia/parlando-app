import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Shield, Users, ChevronRight } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const features = [
  {
    icon: <MapPin size={22} color="#007380" />,
    title: 'Viajes seguros',
    description: 'Viajes verificados entre ciudades colombianas',
  },
  {
    icon: <Shield size={22} color="#FF7F60" />,
    title: 'Identidad verificada',
    description: 'Todos verifican su cédula y teléfono',
  },
  {
    icon: <Users size={22} color="#007380" />,
    title: 'Comunidad confiable',
    description: 'Calificaciones y reputación bidireccional',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(auth)/register');
  };

  const handleLogin = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Full-bleed gradient hero */}
      <LinearGradient
        colors={['#1a1a1a', '#3a3a3a', '#5a5a5a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 32 }]}
      >
        <Image
          source={require('../../assets/parlando-icon.png')}
          style={styles.logoBadge}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Pin de Conexión{'\n'}Viajes compartidos para Colombia 🇨🇴
        </Text>
      </LinearGradient>

      {/* Curved overlay card */}
      <View style={styles.card}>
        {/* Features */}
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                {feature.icon}
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={{ paddingBottom: insets.bottom + 8 }}>
          <Button
            onPress={handleGetStarted}
            size="lg"
            className="w-full my-2"
            icon={<ChevronRight size={20} color="#FFFFFF" />}
          >
            Crear cuenta
          </Button>
          <Button
            onPress={handleLogin}
            variant="ghost"
            size="md"
            className="w-full mt-3"
          >
            Ya tengo cuenta
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
    paddingHorizontal: 32,
  },
  logoBadge: {
    width: 460,
    height: 460,
    borderRadius: 20,
    marginBottom: -160,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingTop: 32,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  features: {
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  featureDesc: {
    fontSize: 13,
    color: '#737373',
    marginTop: 2,
  },
});
