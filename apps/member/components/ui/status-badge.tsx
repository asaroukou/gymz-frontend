import { Text, View } from 'react-native';

import type { BadgeVariant } from './status-badge.logic';

export type { BadgeVariant } from './status-badge.logic';
export { statusBadgeVariant } from './status-badge.logic';

const BG: Record<BadgeVariant, string> = {
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  destructive: 'bg-destructive/10',
  neutral: 'bg-neutral-100',
};

const TEXT: Record<BadgeVariant, string> = {
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
  neutral: 'text-neutral-600',
};

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View className={`self-start rounded-pill px-2.5 py-1 ${BG[variant]}`}>
      <Text className={`text-xs font-medium ${TEXT[variant]}`}>{label}</Text>
    </View>
  );
}
