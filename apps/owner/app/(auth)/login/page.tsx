'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';

import { passwordSchema, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/password';

const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

const newPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type NewPasswordValues = z.infer<typeof newPasswordSchema>;

/** Only allow same-origin, non-protocol-relative paths as a post-login redirect target. */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  return next;
}

function NewPasswordForm({
  onComplete,
  onBack,
}: {
  onComplete: (newPassword: string) => Promise<void>;
  onBack: () => void;
}) {
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: NewPasswordValues) => {
    try {
      await onComplete(values.newPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not set new password';
      form.setError('root', { message });
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>{PASSWORD_REQUIREMENTS_TEXT}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
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
          {form.formState.isSubmitting ? 'Setting password…' : 'Set new password'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </form>
    </Form>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get('next'));
  const onboarded = searchParams.get('onboarded') === '1';
  const { signIn, refresh } = useAuth();
  const [challenge, setChallenge] = useState<{
    complete: (newPassword: string) => Promise<{ idToken: string }>;
  } | null>(null);

  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: CredentialsValues) => {
    try {
      const result = await signIn(values.email, values.password);
      if (result.kind === 'success') {
        router.replace(next);
        return;
      }
      setChallenge({ complete: result.complete });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      form.setError('root', { message });
      toast.error(message);
    }
  };

  if (challenge) {
    return (
      <NewPasswordForm
        onBack={() => setChallenge(null)}
        onComplete={async (newPassword) => {
          await challenge.complete(newPassword);
          await refresh();
          router.replace(next);
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        {onboarded ? (
          <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">
            Your venue is ready — sign in to continue.
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
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
              <FormLabel>Password</FormLabel>
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
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your email and password to access your venue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
