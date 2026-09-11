import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
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

function Masthead({ line }: { line: string }) {
  return (
    <View className="mt-6 gap-2 rounded-xl bg-primary p-6">
      <AppText variant="display" className="text-neutral-50">
        IziWellPass
      </AppText>
      <AppText variant="body" className="text-neutral-50/80">
        {line}
      </AppText>
    </View>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-destructive/10 px-4 py-3">
      <AppText variant="bodyStrong" className="text-destructive-foreground">
        {message}
      </AppText>
    </View>
  );
}

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
        <Masthead line={t('login.newPasswordHint')} />
        <View className="mt-8 gap-4">
          <AppText variant="section">{t('login.newPasswordTitle')}</AppText>
          <TextField
            control={pw.control}
            name="newPassword"
            label={t('login.newPassword')}
            icon={Lock}
            secure
            errorText={pw.formState.errors.newPassword ? t('login.passwordTooShort') : undefined}
          />
          <TextField
            control={pw.control}
            name="confirmPassword"
            label={t('login.confirmPassword')}
            icon={Lock}
            secure
            errorText={
              pw.formState.errors.confirmPassword
                ? pw.formState.errors.confirmPassword.message === 'mismatch'
                  ? t('login.passwordMismatch')
                  : t('login.passwordTooShort')
                : undefined
            }
          />
          {formError ? <FormError message={formError} /> : null}
          <Button
            label={t('login.newPasswordSubmit')}
            onPress={onNewPassword}
            loading={pw.formState.isSubmitting}
          />
          <Button
            label={t('login.back')}
            variant="ghost"
            icon={ArrowLeft}
            onPress={() => {
              setChallenge(null);
              setFormError(null);
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Masthead line={t('login.welcome')} />
      <View className="mt-8 gap-4">
        <TextField
          control={creds.control}
          name="email"
          label={t('login.email')}
          icon={Mail}
          keyboardType="email-address"
          autoComplete="email"
          errorText={creds.formState.errors.email ? t('login.emailInvalid') : undefined}
        />
        <TextField
          control={creds.control}
          name="password"
          label={t('login.password')}
          icon={Lock}
          secure
          autoComplete="password"
          errorText={creds.formState.errors.password ? t('login.passwordRequired') : undefined}
        />
        {formError ? <FormError message={formError} /> : null}
        <Button
          label={t('login.submit')}
          onPress={onCredentials}
          loading={creds.formState.isSubmitting}
        />
      </View>
    </Screen>
  );
}
