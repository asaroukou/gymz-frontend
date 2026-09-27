import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { CalendarCheck, QrCode, Wallet, type LucideIcon } from 'lucide-react-native';
import { t } from '@/lib/i18n';
import { colors, fonts } from '@/lib/theme';

// The canvas pill wraps the icon AND the label together (NgWGe/d14X6), so the
// built-in tab label is hidden and re-drawn here, stacked inside the pill.
function TabIcon({
  icon: Icon,
  label,
  focused,
  color,
}: {
  icon: LucideIcon;
  label: string;
  focused: boolean;
  color: string;
}): ReactNode {
  return (
    <View
      className={`items-center justify-center gap-1 rounded-pill px-4 py-1.5 ${focused ? 'bg-secondary' : ''}`}
    >
      <Icon color={color} size={20} strokeWidth={1.5} />
      <Text style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 12, color }}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.card'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Wallet} label={t('tabs.card')} focused={focused} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: t('tabs.qr'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={QrCode} label={t('tabs.qr')} focused={focused} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={CalendarCheck} label={t('tabs.bookings')} focused={focused} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
