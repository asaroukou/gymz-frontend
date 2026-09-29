import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Check, ChevronLeft, Hourglass } from 'lucide-react-native';
import { confirmMyEmailChange, getMeProfileQueryKey } from '@iziwellpass/api/generated';
import { ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button, IconButton, IconMedallion } from '@/components/ui/button';
import { CodeInput } from '@/components/form/code-input';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { formatCountdown } from '@/lib/format';
import { classifyCodeError, codeErrorKey, CODE_LENGTH, RESEND_COOLDOWN_S } from '@/lib/email-change';
import { colors } from '@/lib/theme';

type Phase = 'entry' | 'unavailable' | 'expired' | 'done';

export default function EmailChangeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { verifyEmailCode, resendEmailCode, signOut } = useAuth();

  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<Phase>('entry');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownEnds, setCooldownEnds] = useState(() => Date.now() + RESEND_COOLDOWN_S * 1000);
  const [now, setNow] = useState(() => Date.now());

  // Only the entry phase shows a live countdown; no point ticking elsewhere.
  useEffect(() => {
    if (phase !== 'entry') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = Math.max(0, Math.ceil((cooldownEnds - now) / 1000));

  const goBack = () => router.back();

  const onConfirm = async () => {
    if (code.length !== CODE_LENGTH || pending) return;
    setPending(true);
    setErrorKey(null);
    try {
      await verifyEmailCode(code);
    } catch (err) {
      const kind = classifyCodeError(err);
      if (kind === 'aliasExists') {
        setPhase('unavailable');
      } else {
        setErrorKey(codeErrorKey(kind));
      }
      setPending(false);
      void qc.invalidateQueries({ queryKey: getMeProfileQueryKey() });
      return;
    }
    try {
      await confirmMyEmailChange();
      setPhase('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'NO_EMAIL_CHANGE_PENDING') {
        setPhase('expired');
      } else {
        // Anything else, including EMAIL_NOT_VERIFIED, is not actionable here.
        setErrorKey('emailChange.errors.network');
      }
    } finally {
      setPending(false);
      void qc.invalidateQueries({ queryKey: getMeProfileQueryKey() });
    }
  };

  const onResend = async () => {
    if (remaining > 0 || resending) return;
    setResending(true);
    try {
      await resendEmailCode();
      setCooldownEnds(Date.now() + RESEND_COOLDOWN_S * 1000);
      setErrorKey(null);
    } catch (err) {
      setErrorKey(codeErrorKey(classifyCodeError(err)));
    } finally {
      setResending(false);
    }
  };

  const onRelogin = () => {
    signOut();
    router.replace('/login');
  };

  if (phase === 'expired') {
    return (
      <Screen scroll={false}>
        <View className="-ml-2 self-start">
          <IconButton icon={ChevronLeft} label={t('emailChange.back')} onPress={goBack} />
        </View>
        <View className="flex-1 items-center justify-center gap-4">
          <IconMedallion icon={Hourglass} />
          <AppText variant="body" className="max-w-[280px] text-center">
            {t('emailChange.expired')}
          </AppText>
        </View>
        <Button label={t('emailChange.back')} variant="secondary" onPress={goBack} />
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center gap-4">
          <IconMedallion icon={Check} tint={colors.success.foreground} wash="bg-success" />
          <AppText variant="title" className="text-center">
            {t('emailChange.doneTitle')}
          </AppText>
          <AppText variant="body" tone="muted" className="max-w-[300px] text-center">
            {t('emailChange.doneBody')}
          </AppText>
        </View>
        <Button label={t('emailChange.relogin')} onPress={onRelogin} />
      </Screen>
    );
  }

  // 'entry' and 'unavailable' share the same header, code boxes and foot.
  const errorText = phase === 'unavailable' ? t('emailChange.errors.aliasExists') : errorKey ? t(errorKey) : null;

  return (
    <Screen scroll={false}>
      <View className="-ml-2 self-start">
        <IconButton icon={ChevronLeft} label={t('emailChange.back')} onPress={goBack} />
      </View>

      <AppText variant="title" className="mt-4">
        {t('emailChange.title')}
      </AppText>
      <AppText variant="body" tone="muted" className="mt-2">
        {t('emailChange.body')}
      </AppText>

      <View className="mt-8 gap-2">
        <AppText variant="label">{t('emailChange.codeLabel')}</AppText>
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (errorKey) setErrorKey(null);
          }}
          error={!!errorText}
          accessibilityLabel={t('emailChange.codeLabel')}
        />
        {errorText ? (
          <View className="flex-row items-center gap-1.5">
            <CircleAlert color={colors.destructive.foreground} size={14} strokeWidth={1.5} />
            <AppText variant="label" tone="destructive" style={{ fontSize: 14, lineHeight: 20 }}>
              {errorText}
            </AppText>
          </View>
        ) : null}
      </View>

      {phase === 'entry' ? (
        <View className="mt-6 gap-3">
          <Button
            label={t('emailChange.confirm')}
            onPress={() => void onConfirm()}
            disabled={code.length !== CODE_LENGTH}
            loading={pending}
          />
          <Button
            label={remaining > 0 ? t('emailChange.resendIn', { time: formatCountdown(remaining) }) : t('emailChange.resend')}
            variant="ghost"
            onPress={() => void onResend()}
            disabled={remaining > 0}
            loading={resending}
          />
          <Button label={t('emailChange.later')} variant="ghost" onPress={goBack} />
        </View>
      ) : (
        <View className="mt-6">
          <Button label={t('emailChange.back')} variant="secondary" onPress={goBack} />
        </View>
      )}

      <View className="flex-1" />
      <AppText variant="caption" tone="muted" className="pb-2 text-center">
        {t('emailChange.foot')}
      </AppText>
    </Screen>
  );
}
