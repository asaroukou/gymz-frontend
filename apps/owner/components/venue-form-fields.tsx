'use client';

import { useTranslations } from 'next-intl';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
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
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { useActivityTypeOptions } from '@/lib/activity-type';
import { COUNTRIES, TIMEZONES, withCurrentValue } from '@/lib/locations';

/** The venue fields shared by the create and edit forms. */
export interface VenueFieldValues {
  name: string;
  venue_type: string;
  description: string;
  address_line: string;
  city: string;
  country: string;
  timezone: string;
  phone: string;
}

export function VenueFormFields<T extends VenueFieldValues & FieldValues>({
  form,
  disabled = false,
  layout = 'stack',
}: {
  form: UseFormReturn<T>;
  disabled?: boolean;
  /** `rows`: the canvas two-column rows (Nom · Type / Description / Adresse / Ville · Pays / Fuseau · Téléphone). */
  layout?: 'stack' | 'rows';
}) {
  const t = useTranslations('venues');
  const typeOptions = useActivityTypeOptions();
  // Field names are literal keys of VenueFieldValues, valid paths of T.
  const name = (k: keyof VenueFieldValues) => k as FieldPath<T>;

  const nameField = (
    <FormField
      control={form.control}
      name={name('name')}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('detail.profile.name')}</FormLabel>
          <FormControl>
            <Input {...field} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const typeField = (
    <FormField
      control={form.control}
      name={name('venue_type')}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('detail.profile.type')}</FormLabel>
          {/* No FormControl: Combobox is a component, not a forwardRef DOM node,
              so wrapping it in FormControl's Radix Slot would warn on ref. */}
          <Combobox
            options={typeOptions}
            value={field.value as string}
            onValueChange={field.onChange}
            disabled={disabled}
            placeholder={t('detail.profile.typePlaceholder')}
            searchPlaceholder={t('detail.profile.typeSearch')}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const descriptionField = (
    <FormField
      control={form.control}
      name={name('description')}
      render={({ field }) => (
        <FormItem className={layout === 'stack' ? 'sm:col-span-2' : undefined}>
          <FormLabel>{t('detail.profile.description')}</FormLabel>
          <FormControl>
            <Textarea {...field} disabled={disabled} className="min-h-24" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const addressField = (
    <FormField
      control={form.control}
      name={name('address_line')}
      render={({ field }) => (
        <FormItem className={layout === 'stack' ? 'sm:col-span-2' : undefined}>
          <FormLabel>{t('detail.profile.address')}</FormLabel>
          <FormControl>
            <Input {...field} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const cityField = (
    <FormField
      control={form.control}
      name={name('city')}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('detail.profile.city')}</FormLabel>
          <FormControl>
            <Input {...field} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const countryField = (
    <FormField
      control={form.control}
      name={name('country')}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('detail.profile.country')}</FormLabel>
          <Select value={field.value as string} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('detail.profile.countryPlaceholder')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {withCurrentValue(COUNTRIES, field.value as string).map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const timezoneField = (
    <FormField
      control={form.control}
      name={name('timezone')}
      render={({ field }) => (
        <FormItem className={layout === 'stack' ? 'sm:col-span-2' : undefined}>
          <FormLabel>{t('detail.profile.timezone')}</FormLabel>
          <Select value={field.value as string} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('detail.profile.timezonePlaceholder')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {withCurrentValue(TIMEZONES, field.value as string).map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const phoneField = (
    <FormField
      control={form.control}
      name={name('phone')}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('detail.profile.phone')}</FormLabel>
          <FormControl>
            <Input inputMode="tel" {...field} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  if (layout === 'stack') {
    return (
      <>
        {nameField}
        {typeField}
        {descriptionField}
        {addressField}
        {cityField}
        {countryField}
        {timezoneField}
        {phoneField}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {nameField}
        {typeField}
      </div>
      {descriptionField}
      {addressField}
      <div className="grid gap-4 sm:grid-cols-2">
        {cityField}
        {countryField}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {timezoneField}
        {phoneField}
      </div>
    </div>
  );
}
