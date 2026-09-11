import '../polyfills';
import '../global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Providers } from '@/components/providers';
import { useAuth } from '@/lib/auth/context';
import { redirectTarget } from '@/lib/nav';
import { colors } from '@/lib/theme';

function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.primary.DEFAULT} />
    </View>
  );
}

function Gate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = String(segments[0]) === '(auth)';
    const target = redirectTarget(status, inAuthGroup);
    if (target) router.replace(target);
  }, [status, segments, router]);

  if (status === 'loading') return <Splash />;
  return <Slot />;
}

export default function RootLayout() {
  // Gate the whole app on the brand fonts so nothing renders in a system font
  // and reflows. `fontError` still lets the app through (system fallback) so a
  // font CDN hiccup never bricks login.
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  if (!fontsLoaded && !fontError) return <Splash />;

  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
