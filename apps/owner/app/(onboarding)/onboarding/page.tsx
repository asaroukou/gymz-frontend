'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BoxIcon,
  CheckIcon,
  DumbbellIcon,
  Flower2Icon,
  MoreHorizontalIcon,
  MusicIcon,
  SparklesIcon,
  SwordsIcon,
  TrophyIcon,
  WavesIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
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
  useFormField,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { navForRole } from '@/lib/nav';

const VENUE_TYPE_VALUES = Object.values(VenueType) as [VenueType, ...VenueType[]];

const VENUE_TYPE_ICONS: Record<VenueType, LucideIcon> = {
  gym: DumbbellIcon,
  yoga_studio: Flower2Icon,
  spa: SparklesIcon,
  tennis_club: TrophyIcon,
  cross_fit: BoxIcon,
  swimming_pool: WavesIcon,
  martial_arts: SwordsIcon,
  dance: MusicIcon,
  other: MoreHorizontalIcon,
};

type OnboardingValues = {
  venue_name: string;
  venue_type: VenueType;
  city: string;
  country: string;
  address_line: string;
  phone: string;
  timezone: string;
};

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

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

/**
 * Radio-card group for the venue type. Extracted so it can call `useFormField`
 * (only valid inside a `FormItem`) and wire the fieldset itself to the field's
 * error state — `aria-invalid` + `aria-describedby` pointing at the shared
 * `FormMessage`, since the visual control is a custom card grid, not an input.
 */
function VenueTypeFieldset({
  field,
}: {
  field: ControllerRenderProps<OnboardingValues, 'venue_type'>;
}) {
  const t = useTranslations('onboarding');
  const { error, formMessageId } = useFormField();

  return (
    <fieldset
      className="grid gap-2"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? formMessageId : undefined}
    >
      <legend className="mb-2 text-sm font-medium">{t('venueType')}</legend>
      <div className="grid grid-cols-3 gap-2">
        {VENUE_TYPE_VALUES.map((type) => {
          const Icon = VENUE_TYPE_ICONS[type];
          const selected = field.value === type;
          return (
            <label
              key={type}
              className={cn(
                'relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center shadow-xs transition-colors',
                'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/15',
                selected ? 'border-primary' : 'border-input hover:bg-accent',
              )}
            >
              <input
                type="radio"
                name={field.name}
                value={type}
                checked={selected}
                onChange={() => field.onChange(type)}
                onBlur={field.onBlur}
                className="sr-only"
              />
              {selected ? (
                <CheckIcon aria-hidden className="absolute top-1.5 right-1.5 size-4 text-primary" />
              ) : null}
              <Icon
                aria-hidden
                className={cn('size-5', selected ? 'text-foreground' : 'text-muted-foreground')}
              />
              <span className="text-xs leading-tight font-medium">{t(`types.${type}`)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const { client, refresh, signOut } = useAuth();
  const onboardVenue = useOnboardVenue();
  const t = useTranslations('onboarding');

  const schema = useMemo(
    () =>
      z.object({
        venue_name: z.string().min(2, t('errors.venueNameMin')),
        venue_type: z.enum(VENUE_TYPE_VALUES),
        city: z.string().min(1, t('errors.cityRequired')),
        country: z.string().min(1, t('errors.countryRequired')).max(60, t('errors.countryTooLong')),
        address_line: z.string(),
        phone: z.string(),
        timezone: z.string(),
      }),
    [t],
  );

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(schema),
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
            toast.success(t('success', { name: result.venue.name }));
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
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('error')));
          }
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
              <FormLabel>{t('venueName')}</FormLabel>
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
            <FormItem className="sm:col-span-2">
              <VenueTypeFieldset field={field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('city')}</FormLabel>
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
              <FormLabel>{t('country')}</FormLabel>
              <FormControl>
                <Input placeholder={t('countryPlaceholder')} {...field} />
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
              <FormLabel>{t('timezone')}</FormLabel>
              <FormControl>
                <Input placeholder={t('timezonePlaceholder')} {...field} />
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
              <FormLabel>{t('address')}</FormLabel>
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
              <FormLabel>{t('phone')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-2 sm:col-span-2">
          <Button type="submit" disabled={onboardVenue.isPending} className="w-full">
            {onboardVenue.isPending ? t('submitting') : t('submit')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">{t('whatsNext')}</p>
        </div>
      </form>
    </Form>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const session = useSession();
  const t = useTranslations('onboarding');

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
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm />
      </CardContent>
    </Card>
  );
}
