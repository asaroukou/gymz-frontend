import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './text';
import { t } from '@/lib/i18n';

/** Bottom sheet over a scrim (canvas Y1K4c). `children` are the stacked actions. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          className="absolute inset-0 bg-ink/25"
        />
        <View
          accessibilityViewIsModal
          className="gap-5 rounded-t-panel bg-background px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="h-1 w-10 self-center rounded-pill bg-border" />
          <View className="gap-2">
            <AppText variant="heading">{title}</AppText>
            {description ? <AppText variant="body" tone="muted">{description}</AppText> : null}
          </View>
          <View className="gap-3">{children}</View>
        </View>
      </View>
    </Modal>
  );
}
