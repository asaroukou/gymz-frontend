'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { getListMembersQueryKey, useRegisterMember } from '@iziwellpass/api/generated';
import { MembershipType } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
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
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { VenueChecklist } from '@/components/venue-checklist';
import { ACCESS_SCOPE_VALUES } from '@/lib/access-scope';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

function todayIsoDate(): string {
  // Local calendar date (not `toISOString`, which is UTC) so the pre-filled
  // membership_start matches the user's day near midnight in non-UTC zones.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Enroll (add member) dialog
// ---------------------------------------------------------------------------

export function AddMemberDialog({ variant = 'default' }: { variant?: 'default' | 'secondary' }) {
  const t = useTranslations('members');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const registerMember = useRegisterMember();

  const schema = useMemo(
    () =>
      z
        .object({
          first_name: z.string().min(1, t('validation.firstNameRequired')),
          last_name: z.string().min(1, t('validation.lastNameRequired')),
          // Optional again per the Aug 22 contract: roster-mode members have no login
          // and may omit email. The tenant's login mode is write-only (no read side),
          // so the server enforces per mode; a login-mode 400 maps onto this field
          // via applyFieldErrors.
          email: z.email(t('validation.emailInvalid')).or(z.literal('')),
          phone: z.string(),
          membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
          membership_start: z.string().min(1, t('validation.startRequired')),
          access_scope: z.enum(ACCESS_SCOPE_VALUES),
          venue_ids: z.array(z.string()),
          notes: z.string(),
        })
        .superRefine((val, ctx) => {
          if (val.access_scope === 'venue_scoped' && val.venue_ids.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['venue_ids'],
              message: t('addDialog.venuesRequired'),
            });
          }
        }),
    [t],
  );

  type CreateMemberValues = z.infer<typeof schema>;

  const defaults: CreateMemberValues = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    membership_type: 'monthly',
    membership_start: todayIsoDate(),
    access_scope: 'venue_scoped',
    venue_ids: [],
    notes: '',
  };

  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // `addAnother` keeps the dialog open and resets the form after a successful
  // save, so the front desk can enroll a queue of walk-ins without reopening
  // the dialog each time (a rapid-repeat flow per PRODUCT.md).
  const onSubmit = (values: CreateMemberValues, addAnother: boolean) => {
    registerMember.mutate(
      {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          membership_type: values.membership_type,
          membership_start: values.membership_start,
          access_scope: values.access_scope,
          venue_ids: values.access_scope === 'venue_scoped' ? values.venue_ids : undefined,
          notes: values.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('addDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          form.reset(defaults);
          if (addAnother) {
            form.setFocus('first_name');
          } else {
            setOpen(false);
          }
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('addDialog.error')));
          }
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset(defaults);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant}>
          <PlusIcon />
          {t('add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('addDialog.title')}</DialogTitle>
          <DialogDescription>{t('addDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit((v) => onSubmit(v, false))(e)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-[18px]">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.firstName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.lastName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.phone')}</FormLabel>
                      <FormControl>
                        <Input inputMode="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="membership_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.type')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MEMBERSHIP_TYPE_VALUES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`type.${type}`)}
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
                  name="membership_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.start')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="access_scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDialog.accessScope')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="chain_wide">{t('addDialog.scopeChainWide')}</SelectItem>
                        <SelectItem value="venue_scoped">
                          {t('addDialog.scopeVenueScoped')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('access_scope') === 'venue_scoped' ? (
                <FormField
                  control={form.control}
                  name="venue_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addDialog.venues')}</FormLabel>
                      <VenueChecklist value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDialog.notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-24" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={registerMember.isPending}
                onClick={() => void form.handleSubmit((v) => onSubmit(v, true))()}
              >
                {t('addDialog.submitAndAnother')}
              </Button>
              <Button type="submit" disabled={registerMember.isPending}>
                {registerMember.isPending ? t('addDialog.submitting') : t('addDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
