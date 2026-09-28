'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, CircleCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { AuthCard } from '@/components/auth-card';
import { AuthCardSkeleton } from '@/components/auth-card-skeleton';
import { PasswordChecklist } from '@/components/password-checklist';
import { PasswordInput } from '@/components/password-input';
import { useAuthError } from '@/lib/auth-errors';
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
  const resolveError = useAuthError();

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

  // Hold the pending state through onComplete's post-challenge redirect so the
  // button doesn't flash re-enabled before this card unmounts.
  const [redirecting, setRedirecting] = useState(false);
  const pending = form.formState.isSubmitting || redirecting;

  const onSubmit = async (values: NewPasswordValues) => {
    try {
      await onComplete(values.newPassword);
      setRedirecting(true);
    } catch (err) {
      const { message } = resolveError(err, t('newPassword.error'));
      form.setError('root', { message });
    }
  };

  return (
    <AuthCard title={t('newPassword.title')} subtitle={t('newPassword.subtitle')}>
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-[18px]">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('newPassword.newPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
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
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root ? (
            <p role="alert" className="text-sm text-destructive-foreground">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t('newPassword.submitting') : t('newPassword.submit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
            disabled={pending}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {t('newPassword.back')}
          </Button>
        </form>
      </Form>
    </AuthCard>
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
  const resolveError = useAuthError();

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

  // Hold the pending state across the post-login navigation: router.replace
  // fires but this card stays mounted while the next route streams, and
  // isSubmitting has already flipped back to false. Without this the button
  // flashes re-enabled ("Se connecter") for a beat before unmount.
  const [redirecting, setRedirecting] = useState(false);
  const pending = form.formState.isSubmitting || redirecting;

  // Autofocus the email on pointer-capable widescreens only; on a phone at the
  // counter, forcing the keyboard open on arrival is disruptive.
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia?.('(min-width: 768px) and (pointer: fine)').matches) {
      emailRef.current?.focus();
    }
  }, []);

  const onSubmit = async (values: CredentialsValues) => {
    try {
      const result = await signIn(values.email, values.password);
      if (result.kind === 'success') {
        setRedirecting(true);
        router.replace(next);
        return;
      }
      if (result.kind === 'new-password-required') {
        onChallenge({ complete: result.complete });
        return;
      }
      // The TOTP code step arrives in the next task; until then say so.
      form.setError('root', { message: t('login.error') });
    } catch (err) {
      const { message } = resolveError(err, t('login.error'));
      form.setError('root', { message });
    }
  };

  return (
    <AuthCard
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <p>
          {t('login.noAccount')}{' '}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('login.createAccount')}
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-[18px]">
          {onboarded ? (
            <Alert variant="success">
              <CircleCheckIcon aria-hidden="true" />
              <AlertDescription>{t('login.onboardedNotice')}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('login.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      emailRef.current = el;
                    }}
                  />
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
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/*
              Self-service reset isn't wired yet (no Cognito ForgotPassword
              flow). Per "flag known gaps as disabled affordances," render it
              disabled with a "coming soon" tooltip rather than hide it, so the
              path is visibly acknowledged. Matches the Réactiver pattern in
              members/[id].
            */}
          <div className="-mt-1 flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <button
                    type="button"
                    disabled
                    aria-disabled
                    className="pointer-events-none text-sm text-muted-foreground underline-offset-4"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('login.forgotPasswordSoon')}</TooltipContent>
            </Tooltip>
          </div>
          {form.formState.errors.root ? (
            <p role="alert" className="text-sm text-destructive-foreground">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </Form>
    </AuthCard>
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
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginView />
    </Suspense>
  );
}
