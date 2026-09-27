import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type LegacyVariant = Variant | 'outline'; // Legacy alias (plan R3) — removed in Task 9.
type Size = 'md' | 'sm';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-ink active:bg-ink-hover',
  secondary: 'border border-border bg-background active:bg-side',
  ghost: 'bg-transparent active:bg-side',
  destructive: 'bg-destructive active:opacity-80',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  ghost: 'text-ink',
  destructive: 'text-destructive-foreground',
};

const INK: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.ink,
  ghost: colors.ink,
  destructive: colors.destructive.foreground,
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant: rawVariant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: LegacyVariant;
  size?: Size;
  icon?: LucideIcon;
  fullWidth?: boolean;
}) {
  const variant: Variant = rawVariant === 'outline' ? 'secondary' : rawVariant;
  const height = size === 'sm' ? 'h-11' : 'h-[52px]';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      className={`${height} ${fullWidth ? 'w-full' : 'self-start'} flex-row items-center justify-center gap-2 rounded-pill px-6 ${CONTAINER[variant]} ${
        disabled && !loading ? 'opacity-40' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color={INK[variant]} />
      ) : (
        <>
          {Icon ? <Icon color={INK[variant]} size={18} strokeWidth={1.5} /> : null}
          <Text className={`font-sans-semibold text-[15px] ${LABEL[variant]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Icon-only pressable for quiet trailing actions. */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  tint = colors.muted,
  loading,
}: {
  icon: LucideIcon;
  onPress: () => void;
  label: string;
  tint?: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-pill active:bg-side"
    >
      {loading ? <ActivityIndicator color={tint} /> : <Icon color={tint} size={20} strokeWidth={1.5} />}
    </Pressable>
  );
}

/** A centered Lucide icon on a round chip (empty states). */
export function IconMedallion({
  icon: Icon,
  tint = colors.muted,
  wash = 'bg-secondary',
}: {
  icon: LucideIcon;
  tint?: string;
  wash?: string;
}) {
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-pill ${wash}`}>
      <Icon color={tint} size={24} strokeWidth={1.5} />
    </View>
  );
}
