import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { t } from '@/lib/i18n';

export default function Qr() {
  return (
    <Screen>
      <AppText variant="title">{t('qr.title')}</AppText>
    </Screen>
  );
}
