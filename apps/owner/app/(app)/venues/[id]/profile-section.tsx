'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  getGetVenueQueryKey,
  getListVenuesQueryKey,
  useUpdateVenue,
} from '@iziwellpass/api/generated';
import type { Venue } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { Switch } from '@iziwellpass/ui/components/switch';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { VenueFormFields } from '@/components/venue-form-fields';
import { ACTIVITY_TYPE_VALUES } from '@/lib/activity-type';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

export function ProfileSection({ venue, canEdit }: { venue: Venue; canEdit: boolean }) {
  const t = useTranslations('venues');
  const queryClient = useQueryClient();
  const updateVenue = useUpdateVenue();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('detail.profile.nameRequired')),
        venue_type: z.enum(ACTIVITY_TYPE_VALUES),
        description: z.string(),
        address_line: z.string(),
        city: z.string(),
        country: z.string(),
        phone: z.string(),
        timezone: z.string().min(1, t('detail.profile.timezoneRequired')),
        is_active: z.boolean(),
      }),
    [t],
  );

  type ProfileValues = z.infer<typeof schema>;

  const toDefaults = (v: Venue): ProfileValues => ({
    name: v.name,
    venue_type: v.venue_type,
    description: v.description ?? '',
    address_line: v.address_line ?? '',
    city: v.city,
    country: v.country,
    phone: v.phone ?? '',
    timezone: v.timezone,
    is_active: v.is_active,
  });

  const form = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(venue),
  });

  // Re-sync the form when the underlying venue data changes (e.g. after a
  // successful save re-fetches getVenue).
  useEffect(() => {
    form.reset(toDefaults(venue));
  }, [venue, form]);

  const onSubmit = (values: ProfileValues) => {
    // `UpdateVenueRequest` accepts only these fields — `email` and `settings`
    // (locale/timezone_override) are read-only in the contract and are
    // deliberately not sent here.
    updateVenue.mutate(
      {
        id: venue.id,
        data: {
          name: values.name,
          venue_type: values.venue_type,
          description: values.description || null,
          address_line: values.address_line || null,
          city: values.city || null,
          country: values.country || null,
          phone: values.phone || null,
          timezone: values.timezone,
          is_active: values.is_active,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('detail.profile.success'));
          void queryClient.invalidateQueries({ queryKey: getGetVenueQueryKey(venue.id) });
          void queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.profile.error')));
          }
        },
      },
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.profile.title')} />
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-[18px]"
        >
          <VenueFormFields form={form} disabled={!canEdit} layout="rows" />
          {/*
            Email is read-only: `UpdateVenueRequest` has no `email` field, so
            there is no contract to persist an edited value against.
          */}
          <FormItem>
            <FormLabel>{t('detail.profile.email')}</FormLabel>
            <Input
              type="email"
              value={venue.email ?? ''}
              disabled
              readOnly
              className="pointer-events-none"
              aria-label={t('detail.profile.email')}
            />
            <p className="text-sm text-muted-foreground">{t('detail.profile.emailReadOnly')}</p>
          </FormItem>
          {/*
            `VenueSettings` (locale, timezone_override) is a nested object on
            `Venue` but is not part of `UpdateVenueRequest` — settings are
            read-only in the current contract, so no editor is rendered here.
          */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FormLabel className="text-base font-medium">
                    {t('detail.profile.active')}
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">{t('detail.profile.activeHint')}</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canEdit}
                    aria-label={t('detail.profile.active')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {canEdit ? (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateVenue.isPending}>
                {updateVenue.isPending ? t('detail.profile.saving') : t('detail.profile.save')}
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    </section>
  );
}
