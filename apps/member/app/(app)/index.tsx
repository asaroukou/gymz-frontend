import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { t } from '@/lib/i18n';

export default function Card() {
  return (
    <Screen>
      <AppText variant="title">{t('tabs.card')}</AppText>
    </Screen>
  );
}
