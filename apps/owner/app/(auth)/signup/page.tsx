'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

type SignupValues = { email: string; password: string; confirmPassword: string };

export default function SignupPage() {
  const router = useRouter();
  const { client } = useAuth();
  const t = useTranslations('auth');

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.email(t('errors.emailInvalid')),
          password: makePasswordSchema({
            min: t('errors.passwordMin'),
            lowercase: t('errors.passwordLowercase'),
            uppercase: t('errors.passwordUppercase'),
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

  const onSubmit = async (values: SignupValues) => {
    try {
      await client.signUp(values.email, values.password);
      router.push(`/confirm?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('signup.error');
      form.setError('root', { message });
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('signup.title')}</CardTitle>
        <CardDescription>{t('signup.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('signup.email')}</FormLabel>
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
                  <FormLabel>{t('signup.password')}</FormLabel>
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
                  <FormLabel>{t('signup.confirmPassword')}</FormLabel>
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
              {form.formState.isSubmitting ? t('signup.submitting') : t('signup.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('signup.haveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('signup.signin')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
