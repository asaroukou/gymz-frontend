import { View } from 'react-native';
import { AppText } from './text';

/** Initials on a tint, 40 pt. */
export function Avatar({ name, tint = 'bg-tint-vert' }: { name: string; tint?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';
  return (
    <View className={`h-10 w-10 items-center justify-center rounded-pill ${tint}`}>
      <AppText variant="label" tone="ink" className="font-sans-semibold">
        {initials}
      </AppText>
    </View>
  );
}
