import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { IconMedallion } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export function QueryBoundary({
  isLoading,
  isError,
  errorText,
  onRetry,
  children,
  loadingFallback,
}: {
  isLoading: boolean;
  isError: boolean;
  errorText: string;
  onRetry: () => void;
  children: ReactNode;
  /** Optional layout-matched skeleton shown instead of a bare spinner. */
  loadingFallback?: ReactNode;
}) {
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <View className="items-center py-12">
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="items-center gap-4 py-12">
        <IconMedallion
          icon={TriangleAlert}
          tint={colors.destructive.foreground}
          wash="bg-destructive/10"
        />
        <AppText variant="body" className="text-center text-neutral-500">
          {errorText}
        </AppText>
        <Button label={t('common.retry')} variant="outline" fullWidth={false} onPress={onRetry} />
      </View>
    );
  }
  return <>{children}</>;
}
