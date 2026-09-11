import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useAuth } from '@/lib/auth/context';

export default function Login() {
  const { signIn, onSignedIn } = useAuth();
  return (
    <Screen>
      <AppText variant="title">Connexion</AppText>
      <Button
        label="Se connecter (stub)"
        onPress={async () => {
          const r = await signIn('', '');
          if (r.kind === 'success') onSignedIn(r.idToken);
        }}
      />
    </Screen>
  );
}
