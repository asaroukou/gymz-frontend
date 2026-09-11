import { Text, View } from 'react-native';

import type { BadgeVariant } from './status-badge.logic';

export type { BadgeVariant } from './status-badge.logic';
export { statusBadgeVariant } from './status-badge.logic';

const STYLES: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success-foreground',
  warning: 'bg-warning/10 text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive-foreground',
  neutral: 'bg-neutral-100 text-neutral-600',
};

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View className={`self-start rounded-pill px-2.5 py-1 ${STYLES[variant].split(' ')[0]}`}>
      <Text className={`text-xs font-medium ${STYLES[variant].split(' ')[1]}`}>{label}</Text>
    </View>
  );
}
