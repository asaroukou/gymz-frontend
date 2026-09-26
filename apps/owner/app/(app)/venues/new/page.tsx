'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import { getListVenuesQueryKey, useCreateVenue } from '@iziwellpass/api/generated';
import { Button } from '@iziwellpass/ui/components/button';
import { Form } from '@iziwellpass/ui/components/form';
import { BackLink, WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequireCapability } from '@/components/capabilities/require-capability';
import { useToastApiError } from '@/components/capabilities/use-upgrade-toast';
import { RequirePageAccess } from '@/components/page-access';
import { VenueFormFields } from '@/components/venue-form-fields';
import { ACTIVITY_TYPE_VALUES } from '@/lib/activity-type';
import { applyFieldErrors } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

function CreateVenueContent() {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const tCap = useTranslations('capabilities');
  const router = useRouter();
  const queryClient = useQueryClient();
  const createVenue = useCreateVenue();
  const toastApiError = useToastApiError();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('detail.profile.nameRequired')),
        venue_type: z.enum(ACTIVITY_TYPE_VALUES),
        description: z.string(),
        address_line: z.string(),
        city: z.string().min(1, t('create.cityRequired')),
        country: z.string().min(1, t('create.countryRequired')),
        timezone: z.string().min(1, t('detail.profile.timezoneRequired')),
        phone: z.string(),
      }),
    [t],
  );

  type CreateValues = z.infer<typeof schema>;

  const form = useForm<CreateValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      venue_type: 'gym',
      description: '',
      address_line: '',
      city: '',
      country: '',
      timezone: '',
      phone: '',
    },
  });

  const onSubmit = (values: CreateValues) => {
    createVenue.mutate(
      {
        data: {
          name: values.name,
          venue_type: values.venue_type,
          description: values.description || null,
          address_line: values.address_line || null,
          city: values.city,
          country: values.country,
          timezone: values.timezone,
          phone: values.phone || null,
        },
      },
      {
        onSuccess: (response) => {
          const venue = unwrap(response);
          toast.success(t('create.success'));
          void queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() });
          router.push(`/venues/${venue.id}`);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toastApiError(err, {
              fallback: t('create.error'),
              capability: 'multi_venue',
              action: tCap('action.venueCreate'),
            });
          }
        },
      },
    );
  };

  return (
    <WorkingPage>
      <BackLink href="/venues" linkComponent={Link}>
        {t('detail.back')}
      </BackLink>
      <WorkingHeader title={t('create.title')} />
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex w-full max-w-[680px] flex-col gap-[18px]"
        >
          <VenueFormFields form={form} layout="rows" />
          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/venues">{tCommon('cancel')}</Link>
            </Button>
            <Button type="submit" disabled={createVenue.isPending}>
              {createVenue.isPending ? t('create.submitting') : t('create.submit')}
            </Button>
          </div>
        </form>
      </Form>
    </WorkingPage>
  );
}

export default function CreateVenuePage() {
  const t = useTranslations('venues');
  const { venues } = useVenueContext();
  return (
    <RequirePageAccess href="/venues">
      <RequireCapability
        capability="multi_venue"
        title={t('create.title')}
        when={venues.length > 0}
      >
        <CreateVenueContent />
      </RequireCapability>
    </RequirePageAccess>
  );
}
