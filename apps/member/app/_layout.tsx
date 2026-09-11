import '../polyfills';
import '../global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Providers } from '@/components/providers';
import { useAuth } from '@/lib/auth/context';
import { redirectTarget } from '@/lib/nav';

function Gate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = String(segments[0]) === '(auth)';
    const target = redirectTarget(status, inAuthGroup);
    if (target) router.replace(target);
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#0c3d22" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
