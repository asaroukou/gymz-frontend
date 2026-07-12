'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { z } from 'zod';

import { useAuth } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@iziwellpass/ui/components/input-otp';

import { AuthCard } from '@/components/auth-card';
import { AuthFormSkeleton } from '@/components/auth-card-skeleton';
import { useAuthError } from '@/lib/auth-errors';

import { usePendingSignup } from '../pending-credentials';

type ConfirmValues = { email: string; code: string };

const RESEND_COOLDOWN_SECONDS = 30;

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, signIn } = useAuth();
  const t = useTranslations('auth');
  const resolveError = useAuthError();
  const pendingSignup = usePendingSignup();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Hold the pending state across the success redirect (to /onboarding, or
  // /login as a fallback) so the button doesn't flash re-enabled before this
  // page unmounts.
  const [redirecting, setRedirecting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('errors.emailInvalid')),
        code: z.string().regex(/^\d{6}$/, t('errors.codeInvalid')),
      }),
    [t],
  );

  const form = useForm<ConfirmValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: searchParams.get('email') ?? '', code: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (values: ConfirmValues) => {
    try {
      await client.confirmSignUp(values.email, values.code);
    } catch (err) {
      const { message } = resolveError(err, t('confirm.error'));
      form.setError('root', { message });
      return;
    }

    // Try to auto-sign-in with the credentials captured at signup so the user
    // goes straight to onboarding. If they're gone (page was refreshed, which
    // wipes the in-memory ref) or the sign-in doesn't succeed, fall back to the
    // manual login flow. Note: on a confirmSignUp *error* above we return
    // before consuming, so a retry with the right code can still auto-sign-in.
    const creds = pendingSignup.consume();
    if (creds && creds.email === values.email) {
      try {
        const result = await signIn(creds.email, creds.password);
        // Any non-success kind (e.g. a new-password challenge — only reachable
        // for admin-invited staff, not self-signup) falls through to /login.
        if (result.kind === 'success') {
          toast.success(t('confirm.created'));
          setRedirecting(true);
          router.replace('/onboarding');
          return;
        }
      } catch {
        // fall through to the login fallback below
      }
    }

    toast.success(t('confirm.success'));
    setRedirecting(true);
    router.push('/login?next=/onboarding');
  };

  const onResend = async () => {
    const email = form.getValues('email');
    const parsed = z.email().safeParse(email);
    if (!parsed.success) {
      form.setError('email', { message: t('errors.emailInvalid') });
      return;
    }
    setResending(true);
    try {
      await client.resendConfirmationCode(email);
      toast.success(t('confirm.codeSent'));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const { message } = resolveError(err, t('confirm.resendError'));
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirm.email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirm.code')}</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || redirecting}
          className="h-11 w-full"
        >
          {form.formState.isSubmitting || redirecting
            ? t('confirm.submitting')
            : t('confirm.submit')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full tabular-nums"
          disabled={resending || cooldown > 0 || redirecting}
          onClick={() => void onResend()}
        >
          {cooldown > 0
            ? t('confirm.resendCooldown', { seconds: cooldown })
            : resending
              ? t('confirm.resending')
              : t('confirm.resend')}
        </Button>
      </form>
    </Form>
  );
}

export default function ConfirmPage() {
  const t = useTranslations('auth');

  return (
    <AuthCard
      title={t('confirm.title')}
      subtitle={t('confirm.subtitle')}
      footer={
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('confirm.back')}
          </Link>
        </p>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <ConfirmForm />
      </Suspense>
    </AuthCard>
  );
}
