'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
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

import { AuthCard } from '@/components/auth-card';
import { PasswordChecklist } from '@/components/password-checklist';
import { PasswordInput } from '@/components/password-input';
import { useAuthError } from '@/lib/auth-errors';
import { makePasswordSchema } from '@/lib/password';

type SignupValues = { email: string; password: string; confirmPassword: string };

export default function SignupPage() {
  const router = useRouter();
  const { client } = useAuth();
  const t = useTranslations('auth');
  const resolveError = useAuthError();

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.email(t('errors.emailInvalid')),
          password: makePasswordSchema({
            length: t('errors.passwordMin'),
            uppercase: t('errors.passwordUppercase'),
            lowercase: t('errors.passwordLowercase'),
            digit: t('errors.passwordDigit'),
          }),
          confirmPassword: z.string().min(1, t('errors.confirmRequired')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('errors.passwordsMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const form = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const passwordValue = form.watch('password');

  // Hold the pending state across the redirect to /confirm so the button
  // doesn't flash re-enabled before this page unmounts.
  const [redirecting, setRedirecting] = useState(false);
  const pending = form.formState.isSubmitting || redirecting;

  const onSubmit = async (values: SignupValues) => {
    try {
      await client.signUp(values.email, values.password);
      setRedirecting(true);
      router.push(`/confirm?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const { message } = resolveError(err, t('signup.error'));
      form.setError('root', { message });
    }
  };

  return (
    <AuthCard
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
      footer={
        <p className="text-sm text-muted-foreground">
          {t('signup.haveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('signup.signin')}
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.email')}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.password')}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" className="h-11" {...field} />
                </FormControl>
                <PasswordChecklist value={passwordValue} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.confirmPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" className="h-11" {...field} />
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
          <Button type="submit" disabled={pending} className="h-11 w-full">
            {pending ? t('signup.submitting') : t('signup.submit')}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
