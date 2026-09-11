import { Tabs } from 'expo-router';
import { CalendarCheck, QrCode, Wallet } from 'lucide-react-native';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.card'),
          tabBarIcon: ({ color, size }) => (
            <Wallet color={color as string} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: t('tabs.qr'),
          tabBarIcon: ({ color, size }) => (
            <QrCode color={color as string} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck color={color as string} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
