'use client';

import { Suspense } from 'react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';

const confirmSchema = z.object({
  email: z.email('Enter a valid email address'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});

type ConfirmValues = z.infer<typeof confirmSchema>;

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useAuth();

  const form = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { email: searchParams.get('email') ?? '', code: '' },
  });

  const onSubmit = async (values: ConfirmValues) => {
    try {
      await client.confirmSignUp(values.email, values.code);
      toast.success('Account confirmed — sign in');
      router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not confirm account';
      form.setError('root', { message });
      toast.error(message);
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmation code</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root ? (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Confirming…' : 'Confirm account'}
        </Button>
      </form>
    </Form>
  );
}

export default function ConfirmPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm your account</CardTitle>
        <CardDescription>Enter the 6-digit code we emailed you.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <ConfirmForm />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
