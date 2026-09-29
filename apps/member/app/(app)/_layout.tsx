import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, QrCode, Wallet, type LucideIcon } from 'lucide-react-native';
import { t } from '@/lib/i18n';
import { TAB_BAR_CONTENT_HEIGHT } from '@/lib/layout';
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
      className={`items-center justify-center gap-1 rounded-pill px-4 py-1 ${focused ? 'bg-secondary' : ''}`}
    >
      <Icon color={color} size={20} strokeWidth={1.5} />
      <Text style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 12, color }}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
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
          // React Navigation applies `paddingBottom: insets.bottom` on top of
          // a numeric height, so the inset is added here too or the pill's
          // content zone shrinks to `height - insets.bottom` on notched
          // devices (plan fix round 1). `paddingTop: 4` (not 8) so the
          // content zone (50 - 4 = 46) fits the pill (`py-1` here, ≈ 46:
          // 4 + 20 icon + 4 gap + ~14 label + 4) at inset 0 (finding 3).
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
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
      {/* Reached from the Carte banner: a full-screen step (gTXh4…F95Y7E), no tab and no tab bar. */}
      <Tabs.Screen name="email-change" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
