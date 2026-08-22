'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useRegisterOwner } from '@iziwellpass/api/generated';
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
import { apiErrorMessage } from '@/lib/api-error';

type SignupValues = { email: string; first_name: string; last_name: string };

/**
 * Owner self-signup, reworked for the control-plane flow: the server creates
 * the Cognito identity (AdminCreateUser) and emails a temporary password;
 * the owner's real password is set at first login via the newPasswordRequired
 * challenge. No password is collected here, and there is no confirm-code step.
 */
export default function SignupPage() {
  const t = useTranslations('auth');
  const registerOwner = useRegisterOwner();
  // Held locally (not derived from the mutation) so the sent state survives
  // the mutation object identity changing across renders.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('errors.emailInvalid')),
        first_name: z.string().min(1, t('errors.firstNameRequired')),
        last_name: z.string().min(1, t('errors.lastNameRequired')),
      }),
    [t],
  );

  const form = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', first_name: '', last_name: '' },
  });

  const onSubmit = (values: SignupValues) => {
    registerOwner.mutate(
      { data: values },
      {
        // ENUMERATION SAFETY: the API returns 202 whether or not the email
        // already exists, and this UI must not undo that — the sent state and
        // its copy are identical in both cases. Never branch on "already
        // registered" here.
        onSuccess: () => setSentTo(values.email),
        onError: (err) => {
          form.setError('root', { message: apiErrorMessage(err, t('signup.error')) });
        },
      },
    );
  };

  const footer = (
    <p className="text-sm text-muted-foreground">
      {t('signup.haveAccount')}{' '}
      <Link
        href="/login"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t('signup.signin')}
      </Link>
    </p>
  );

  if (sentTo) {
    return (
      <AuthCard
        title={t('signup.sentTitle')}
        subtitle={t('signup.sentBody', { email: sentTo })}
        footer={footer}
      >
        <Button asChild className="h-11 w-full">
          <Link href="/login">{t('signup.signin')}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('signup.title')} subtitle={t('signup.subtitle')} footer={footer}>
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('signup.firstName')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('signup.lastName')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
          {form.formState.errors.root ? (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full" disabled={registerOwner.isPending}>
            {registerOwner.isPending ? t('signup.submitting') : t('signup.submit')}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
