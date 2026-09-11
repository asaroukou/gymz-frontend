import { Tabs } from 'expo-router';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.neutral[500],
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.card') }} />
      <Tabs.Screen name="qr" options={{ title: t('tabs.qr') }} />
      <Tabs.Screen name="bookings" options={{ title: t('tabs.bookings') }} />
    </Tabs>
  );
}
