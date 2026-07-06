'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import { useOnboardVenue } from '@iziwellpass/api/generated';
import { VenueType } from '@iziwellpass/api/schemas';
import { parseClaims } from '@iziwellpass/auth/claims';
import { useAuth, useSession } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { navForRole } from '@/lib/nav';

const VENUE_TYPE_VALUES = Object.values(VenueType) as [VenueType, ...VenueType[]];

function venueTypeLabel(venueType: string): string {
  return venueType.replace(/_/g, ' ');
}

function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? `${fallback} (${err.code})` : fallback;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

const onboardingSchema = z.object({
  venue_name: z.string().min(2, 'At least 2 characters'),
  venue_type: z.enum(VENUE_TYPE_VALUES),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required').max(60, 'Too long'),
  address_line: z.string(),
  phone: z.string(),
  timezone: z.string(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

function LoadingShell() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const { client, refresh, signOut } = useAuth();
  const onboardVenue = useOnboardVenue();

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      venue_name: '',
      venue_type: 'gym',
      city: '',
      country: '',
      address_line: '',
      phone: '',
      timezone: detectTimezone(),
    },
  });

  const onSubmit = (values: OnboardingValues) => {
    onboardVenue.mutate(
      {
        data: {
          venue_name: values.venue_name,
          venue_type: values.venue_type,
          city: values.city,
          country: values.country,
          address_line: values.address_line || undefined,
          phone: values.phone || undefined,
          timezone: values.timezone || undefined,
        },
      },
      {
        onSuccess: async (response) => {
          const result = unwrap(response);
          // `refresh({ force: true })` re-mints the ID token via the refresh
          // token (the pretoken lambda enriches claims on every mint) and
          // updates provider context state, but that state update lands on
          // the next render — not synchronously here. Rather than plumb a
          // "submitted" flag through an effect to observe the eventual
          // re-render, read the freshly-minted token directly off the client
          // and parse its claims in place: it's the same JWT the provider
          // just stored, so this decides the redirect immediately and
          // deterministically instead of waiting on React's render cycle.
          await refresh({ force: true });
          const token = await client.getIdToken();
          const role = token ? parseClaims(token).role : null;

          if (role) {
            toast.success(`Welcome to ${result.venue.name}!`);
            router.replace('/');
            return;
          }

          // Pretoken-lag edge case: claims still lack a role even after a
          // forced refresh. Fall back to a clean re-login, which forces a
          // brand-new sign-in and therefore a brand-new token mint.
          signOut();
          router.replace('/login?onboarded=1');
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Could not create your venue'));
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="venue_name"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Venue name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="venue_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VENUE_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {venueTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input placeholder="TG" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input placeholder="Africa/Lome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address_line"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Address (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={onboardVenue.isPending} className="w-full">
            {onboardVenue.isPending ? 'Creating your venue…' : 'Create venue'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace('/login?next=/onboarding');
      return;
    }
    if (session.status === 'signed-in' && navForRole(session.claims.role).length > 0) {
      router.replace('/');
    }
  }, [session, router]);

  if (session.status === 'loading') {
    return <LoadingShell />;
  }

  if (session.status === 'signed-out') {
    return null;
  }

  if (navForRole(session.claims.role).length > 0) {
    // Already onboarded — the effect above is redirecting away.
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your venue</CardTitle>
        <CardDescription>
          This creates your organization — you&apos;ll be the owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm />
      </CardContent>
    </Card>
  );
}
