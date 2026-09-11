import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

export default function Index() {
  return (
    <Screen>
      <AppText variant="title">IziWellPass</AppText>
      <Card>
        <AppText variant="label">Aperçu</AppText>
        <AppText>Carte membre</AppText>
      </Card>
    </Screen>
  );
}
