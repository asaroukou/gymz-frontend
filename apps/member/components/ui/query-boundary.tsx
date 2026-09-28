import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Notice } from '@/components/ui/notice';
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
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="py-6">
        <Notice variant="destructive" message={errorText} action={{ label: t('common.retry'), onPress: onRetry }} />
      </View>
    );
  }
  return <>{children}</>;
}
