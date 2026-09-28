import '../polyfills';
import '../global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Providers } from '@/components/providers';
import { useAuth } from '@/lib/auth/context';
import { redirectTarget } from '@/lib/nav';
import { colors } from '@/lib/theme';

function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.ink} />
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
  // Gate the whole app on Inter so nothing renders in a system font
  // and reflows. `fontError` still lets the app through (system fallback) so a
  // font CDN hiccup never bricks login.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return <Splash />;

  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
