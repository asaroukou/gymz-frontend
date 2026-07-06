'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const signupSchema = z
  .object({
    email: z.email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { client } = useAuth();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignupValues) => {
    try {
      await client.signUp(values.email, values.password);
      router.push(`/confirm?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create account';
      form.setError('root', { message });
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Sign up to start managing your venue.</CardDescription>
      </CardHeader>
      <CardContent>
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
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
              {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
