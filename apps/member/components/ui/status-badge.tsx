import { Text, View } from 'react-native';

import type { BadgeVariant } from './status-badge.logic';

export type { BadgeVariant } from './status-badge.logic';
export { statusBadgeVariant } from './status-badge.logic';

const BG: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-secondary',
};

const TEXT: Record<BadgeVariant, string> = {
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
  info: 'text-info-foreground',
  neutral: 'text-muted-strong',
};

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View className={`self-start rounded-pill px-3 py-1 ${BG[variant]}`}>
      <Text className={`font-sans-medium text-[13px] leading-[18px] ${TEXT[variant]}`}>{label}</Text>
    </View>
  );
}
