import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'md' | 'lg';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-primary active:bg-primary-hover',
  ghost: 'bg-transparent active:bg-neutral-100',
  outline: 'bg-background border border-border active:bg-neutral-100',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-primary-foreground',
  ghost: 'text-primary',
  outline: 'text-foreground',
};

// Icon/spinner tint per variant (RN SVG needs an explicit color, not a class).
const INK: Record<Variant, string> = {
  primary: colors.primary.foreground,
  ghost: colors.primary.DEFAULT,
  outline: colors.foreground,
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  fullWidth?: boolean;
}) {
  const height = size === 'lg' ? 'h-14' : 'h-12';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`${height} ${fullWidth ? 'w-full' : 'self-start px-6'} flex-row items-center justify-center gap-2 rounded-pill px-5 ${CONTAINER[variant]} ${
        disabled || loading ? 'opacity-40' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color={INK[variant]} />
      ) : (
        <>
          {Icon ? <Icon color={INK[variant]} size={18} strokeWidth={2} /> : null}
          <Text className={`font-sans-semibold text-[15px] ${LABEL[variant]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Icon-only pressable for quiet trailing actions (e.g. regenerate, cancel). */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  tint = colors.neutral[500],
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
      className="h-11 w-11 items-center justify-center rounded-pill active:bg-neutral-100"
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <Icon color={tint} size={20} strokeWidth={2} />
      )}
    </Pressable>
  );
}

/** Small helper so a View can host a centered Lucide icon with a tinted wash. */
export function IconMedallion({
  icon: Icon,
  tint = colors.neutral[400],
  wash = 'bg-neutral-100',
}: {
  icon: LucideIcon;
  tint?: string;
  wash?: string;
}) {
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-pill ${wash}`}>
      <Icon color={tint} size={26} strokeWidth={1.75} />
    </View>
  );
}
