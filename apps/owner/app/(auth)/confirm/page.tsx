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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';
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

type ConfirmValues = { email: string; code: string };

const RESEND_COOLDOWN_SECONDS = 30;

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useAuth();
  const t = useTranslations('auth');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
      toast.success(t('confirm.success'));
      router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('confirm.error');
      form.setError('root', { message });
      toast.error(message);
    }
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
      const message = err instanceof Error ? err.message : t('confirm.resendError');
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
                <Input type="email" autoComplete="email" {...field} />
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
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? t('confirm.submitting') : t('confirm.submit')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full tabular-nums"
          disabled={resending || cooldown > 0}
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
    <Card>
      <CardHeader>
        <CardTitle>{t('confirm.title')}</CardTitle>
        <CardDescription>{t('confirm.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <ConfirmForm />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('confirm.back')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
