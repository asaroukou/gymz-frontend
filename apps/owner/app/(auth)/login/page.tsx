'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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

import { PasswordChecklist } from '@/components/password-checklist';
import { makePasswordSchema } from '@/lib/password';

type CredentialsValues = { email: string; password: string };
type NewPasswordValues = { newPassword: string; confirmPassword: string };

type Challenge = {
  complete: (newPassword: string) => Promise<{ idToken: string }>;
};

/** Only allow same-origin, non-protocol-relative paths as a post-login redirect target. */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  return next;
}

function NewPasswordCard({
  onComplete,
  onBack,
}: {
  onComplete: (newPassword: string) => Promise<void>;
  onBack: () => void;
}) {
  const t = useTranslations('auth');

  const schema = useMemo(
    () =>
      z
        .object({
          newPassword: makePasswordSchema({
            length: t('errors.passwordMin'),
            uppercase: t('errors.passwordUppercase'),
            lowercase: t('errors.passwordLowercase'),
            digit: t('errors.passwordDigit'),
          }),
          confirmPassword: z.string().min(1, t('errors.confirmRequired')),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t('errors.passwordsMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const passwordValue = form.watch('newPassword');

  const onSubmit = async (values: NewPasswordValues) => {
    try {
      await onComplete(values.newPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('newPassword.error');
      form.setError('root', { message });
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('newPassword.title')}</CardTitle>
        <CardDescription>{t('newPassword.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newPassword.newPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
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
                  <FormLabel>{t('newPassword.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root ? (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? t('newPassword.submitting') : t('newPassword.submit')}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
              {t('newPassword.back')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function CredentialsCard({
  next,
  onboarded,
  onChallenge,
}: {
  next: string;
  onboarded: boolean;
  onChallenge: (challenge: Challenge) => void;
}) {
  const router = useRouter();
  const { signIn } = useAuth();
  const t = useTranslations('auth');

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('errors.emailInvalid')),
        password: z.string().min(1, t('errors.passwordRequired')),
      }),
    [t],
  );

  const form = useForm<CredentialsValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: CredentialsValues) => {
    try {
      const result = await signIn(values.email, values.password);
      if (result.kind === 'success') {
        router.replace(next);
        return;
      }
      onChallenge({ complete: result.complete });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.error');
      form.setError('root', { message });
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
        <CardDescription>{t('login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            {onboarded ? (
              <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
                {t('login.onboardedNotice')}
              </p>
            ) : null}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
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
                  <FormLabel>{t('login.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root ? (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('login.createAccount')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

function LoginView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const next = sanitizeNext(searchParams.get('next'));
  const onboarded = searchParams.get('onboarded') === '1';
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  if (challenge) {
    return (
      <NewPasswordCard
        onBack={() => setChallenge(null)}
        onComplete={async (newPassword) => {
          await challenge.complete(newPassword);
          await refresh();
          router.replace(next);
        }}
      />
    );
  }

  return <CredentialsCard next={next} onboarded={onboarded} onChallenge={setChallenge} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}
