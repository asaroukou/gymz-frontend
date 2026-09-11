import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { t } from '@/lib/i18n';

export default function Bookings() {
  return (
    <Screen>
      <AppText variant="title">{t('bookings.title')}</AppText>
    </Screen>
  );
}
