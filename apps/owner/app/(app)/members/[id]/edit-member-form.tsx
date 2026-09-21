'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useUpdateMember,
} from '@iziwellpass/api/generated';
import type { Member } from '@iziwellpass/api/schemas';
import { MembershipType } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
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
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

// ---------------------------------------------------------------------------
// Edit form (existing update contract)
// ---------------------------------------------------------------------------

export function EditMemberForm({ member, canEdit }: { member: Member; canEdit: boolean }) {
  const t = useTranslations('members');
  const queryClient = useQueryClient();
  const updateMember = useUpdateMember();

  const schema = useMemo(
    () =>
      z.object({
        first_name: z.string().min(1, t('validation.firstNameRequired')),
        last_name: z.string().min(1, t('validation.lastNameRequired')),
        email: z.email(t('validation.emailInvalid')).or(z.literal('')),
        phone: z.string(),
        membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
        membership_end: z.string(),
        is_active: z.enum(['active', 'inactive']),
        notes: z.string(),
      }),
    [t],
  );

  type EditMemberValues = z.infer<typeof schema>;

  const toDefaults = (m: Member): EditMemberValues => ({
    first_name: m.first_name,
    last_name: m.last_name,
    email: m.email ?? '',
    phone: m.phone ?? '',
    membership_type: m.membership_type,
    membership_end: m.membership_end ?? '',
    is_active: m.is_active ? 'active' : 'inactive',
    notes: m.notes ?? '',
  });

  const form = useForm<EditMemberValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(member),
  });

  useEffect(() => {
    form.reset(toDefaults(member));
  }, [member, form]);

  const onSubmit = (values: EditMemberValues) => {
    updateMember.mutate(
      {
        mid: member.id,
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          membership_type: values.membership_type,
          membership_end: values.membership_end || null,
          is_active: values.is_active === 'active',
          notes: values.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('detail.edit.success'));
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.edit.error')));
          }
        },
      },
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.edit.title')} />
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-[18px]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('detail.edit.firstName')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
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
                  <FormLabel>{t('detail.edit.lastName')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
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
                  <FormLabel>{t('detail.edit.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={!canEdit} />
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
                  <FormLabel>{t('detail.edit.phone')}</FormLabel>
                  <FormControl>
                    <Input inputMode="tel" {...field} disabled={!canEdit} />
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
                  <FormLabel>{t('detail.edit.type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
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
              name="membership_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('detail.edit.end')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/*
            `UpdateMemberRequest` exposes `is_active` (boolean), not the
            `membership_status` enum — so this select is the only editable
            account-status proxy here. The authoritative status transition
            is the dedicated `suspendMember` endpoint in the danger zone
            below; this toggle only flips the `is_active` flag.
          */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('detail.edit.active')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">{t('detail.edit.activeOption')}</SelectItem>
                    <SelectItem value="inactive">{t('detail.edit.inactiveOption')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{t('detail.edit.activeHint')}</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('detail.edit.notes')}</FormLabel>
                <FormControl>
                  <Textarea {...field} className="min-h-24" disabled={!canEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {canEdit ? (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending ? t('detail.edit.saving') : t('detail.edit.save')}
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    </section>
  );
}
