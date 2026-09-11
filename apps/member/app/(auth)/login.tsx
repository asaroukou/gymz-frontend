import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/field';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { authErrorMessageKey } from '@/lib/auth/errors';
import {
  credentialsSchema,
  newPasswordSchema,
  type CredentialsValues,
  type NewPasswordValues,
} from '@/lib/login-schema';

type Challenge = { complete: (pw: string) => Promise<{ idToken: string }> };

export default function Login() {
  const { signIn, onSignedIn } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const creds = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const pw = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onCredentials = creds.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      const result = await signIn(email, password);
      if (result.kind === 'success') onSignedIn(result.idToken);
      else setChallenge({ complete: result.complete });
    } catch (err) {
      setFormError(t(authErrorMessageKey(err)));
    }
  });

  const onNewPassword = pw.handleSubmit(async ({ newPassword }) => {
    if (!challenge) return;
    setFormError(null);
    try {
      const { idToken } = await challenge.complete(newPassword);
      onSignedIn(idToken);
    } catch (err) {
      setFormError(t(authErrorMessageKey(err)));
    }
  });

  if (challenge) {
    return (
      <Screen>
        <AppText variant="title">{t('login.newPasswordTitle')}</AppText>
        <View className="gap-4">
          <TextField
            control={pw.control}
            name="newPassword"
            label={t('login.newPassword')}
            secure
            errorText={pw.formState.errors.newPassword ? t('auth.error.generic') : undefined}
          />
          <TextField
            control={pw.control}
            name="confirmPassword"
            label={t('login.confirmPassword')}
            secure
            errorText={pw.formState.errors.confirmPassword ? t('auth.error.generic') : undefined}
          />
          {formError ? <AppText className="text-destructive">{formError}</AppText> : null}
          <Button
            label={t('login.newPasswordSubmit')}
            onPress={onNewPassword}
            loading={pw.formState.isSubmitting}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">{t('login.title')}</AppText>
      <View className="gap-4">
        <TextField
          control={creds.control}
          name="email"
          label={t('login.email')}
          keyboardType="email-address"
          errorText={creds.formState.errors.email ? t('auth.error.invalidCredentials') : undefined}
        />
        <TextField
          control={creds.control}
          name="password"
          label={t('login.password')}
          secure
          errorText={creds.formState.errors.password ? t('login.passwordRequired') : undefined}
        />
        {formError ? <AppText className="text-destructive">{formError}</AppText> : null}
        <Button
          label={t('login.submit')}
          onPress={onCredentials}
          loading={creds.formState.isSubmitting}
        />
      </View>
    </Screen>
  );
}
