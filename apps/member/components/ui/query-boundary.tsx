import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export function QueryBoundary({
  isLoading,
  isError,
  errorText,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  errorText: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color="#0c3d22" />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="items-center gap-3 py-10">
        <AppText className="text-neutral-500">{errorText}</AppText>
        <Button label={t('common.retry')} variant="ghost" onPress={onRetry} />
      </View>
    );
  }
  return <>{children}</>;
}
