import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import { Check, ChevronLeft, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/form/field';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { authErrorMessageKey } from '@/lib/auth/errors';
import { passwordChecks } from '@/lib/password-rules';
import { colors } from '@/lib/theme';
import {
  credentialsSchema,
  newPasswordSchema,
  type CredentialsValues,
  type NewPasswordValues,
} from '@/lib/login-schema';

type Challenge = { complete: (pw: string) => Promise<{ idToken: string }> };

function Wordmark() {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-6 w-6 rounded-[7px] bg-ink" />
      <AppText variant="heading">IziWellPass</AppText>
    </View>
  );
}

function Checklist({ value }: { value: string }) {
  return (
    <View className="gap-1.5" accessibilityRole="list">
      {passwordChecks(value).map(({ key, met }) => (
        <View
          key={key}
          className="flex-row items-center gap-2"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: met }}
        >
          {met ? (
            <Check color={colors.success.foreground} size={16} strokeWidth={1.5} />
          ) : (
            <Circle color={colors.muted} size={8} fill={colors.muted} strokeWidth={0} />
          )}
          <AppText variant="label" tone={met ? 'success' : 'muted'}>
            {t(`login.rules.${key}`)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export default function Login() {
  const { signIn, onSignedIn, sessionEnded } = useAuth();
  const insets = useSafeAreaInsets();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const creds = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const pw = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });
  const newPassword = useWatch({ control: pw.control, name: 'newPassword' }) ?? '';
  const confirmPassword = useWatch({ control: pw.control, name: 'confirmPassword' }) ?? '';

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

  const onNewPassword = pw.handleSubmit(async ({ newPassword: value }) => {
    if (!challenge) return;
    setFormError(null);
    try {
      const { idToken } = await challenge.complete(value);
      onSignedIn(idToken);
    } catch (err) {
      setFormError(t(authErrorMessageKey(err)));
    }
  });

  if (challenge) {
    const policyMet = passwordChecks(newPassword).every((c) => c.met);
    const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
    return (
      <Screen contentClassName="gap-6">
        <View className="-ml-2 self-start">
          <Button
            label={t('login.back')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            icon={ChevronLeft}
            onPress={() => {
              setChallenge(null);
              setFormError(null);
              pw.reset();
            }}
          />
        </View>
        <View className="gap-2">
          <AppText variant="title">{t('login.newPasswordTitle')}</AppText>
          <AppText variant="body" tone="muted">
            {t('login.newPasswordHint')}
          </AppText>
        </View>
        {formError ? <Notice variant="destructive" message={formError} /> : null}
        <TextField control={pw.control} name="newPassword" label={t('login.newPassword')} secure autoComplete="new-password" />
        <Checklist value={newPassword} />
        <TextField
          control={pw.control}
          name="confirmPassword"
          label={t('login.confirmPassword')}
          secure
          autoComplete="new-password"
          errorText={mismatch ? t('login.passwordMismatch') : undefined}
        />
        <Button
          label={t('login.newPasswordSubmit')}
          onPress={onNewPassword}
          loading={pw.formState.isSubmitting}
          disabled={!policyMet || mismatch || confirmPassword.length === 0}
        />
      </Screen>
    );
  }

  return (
    <Screen wash contentClassName="min-h-full">
      <View className="flex-1 justify-center gap-8 pt-10">
        <View className="items-center gap-4">
          <Wordmark />
          <AppText variant="display" className="text-center">
            {t('login.title')}
          </AppText>
          <AppText variant="body" tone="muted" className="text-center">
            {t('login.welcome')}
          </AppText>
        </View>
        {formError ? <Notice variant="destructive" message={formError} /> : null}
        {sessionEnded && !formError ? (
          <Notice variant="neutral" message={t('login.sessionEnded')} />
        ) : null}
        <View className="gap-4">
          <TextField
            control={creds.control}
            name="email"
            label={t('login.email')}
            keyboardType="email-address"
            autoComplete="email"
            errorText={creds.formState.errors.email ? t('login.emailInvalid') : undefined}
          />
          <TextField
            control={creds.control}
            name="password"
            label={t('login.password')}
            secure
            autoComplete="password"
            errorText={creds.formState.errors.password ? t('login.passwordRequired') : undefined}
          />
        </View>
        <Button label={t('login.submit')} onPress={onCredentials} loading={creds.formState.isSubmitting} />
      </View>
      {formError ? null : (
        <AppText variant="caption" className="mt-10 text-center" style={{ marginBottom: insets.bottom }}>
          {t('login.footer')}
        </AppText>
      )}
    </Screen>
  );
}
