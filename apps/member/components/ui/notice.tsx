import { Pressable, View } from 'react-native';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react-native';
import { AppText } from './text';
import { colors } from '@/lib/theme';

type Variant = 'destructive' | 'warning' | 'info' | 'neutral';

const BG: Record<Variant, string> = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
  neutral: 'bg-secondary',
};
const FG: Record<Variant, string> = {
  destructive: colors.destructive.foreground,
  warning: colors.warning.foreground,
  info: colors.info.foreground,
  neutral: colors.mutedStrong,
};
const ICON = { destructive: CircleAlert, warning: TriangleAlert, info: Info, neutral: Info } as const;

/** Inline tinted notice: icon + (title) + message (+ text action). */
export function Notice({
  variant,
  title,
  message,
  action,
}: {
  variant: Variant;
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  const Icon = ICON[variant];
  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-start gap-3 rounded-card px-4 py-3 ${BG[variant]}`}
    >
      <Icon color={FG[variant]} size={18} strokeWidth={1.5} />
      <View className="flex-1 gap-0.5">
        {title ? (
          <AppText variant="bodyStrong" style={{ color: FG[variant] }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="body" style={{ color: FG[variant] }}>
          {message}
        </AppText>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} className="mt-1 min-h-11 justify-center">
            <AppText variant="bodyStrong" className="underline" style={{ color: FG[variant] }}>
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
