'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useUpdateMember,
} from '@iziwellpass/api/generated';
import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { MembershipType } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
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
import { classifyMemberError } from '@/lib/member-errors';
import { buildMemberUpdate } from '@/lib/member-update';

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

// ---------------------------------------------------------------------------
// Edit form (existing update contract)
// ---------------------------------------------------------------------------

export function EditMemberForm({
  member,
  canEdit,
}: {
  member: StaffMemberProfile;
  canEdit: boolean;
}) {
  const t = useTranslations('members');
  const queryClient = useQueryClient();
  const updateMember = useUpdateMember();

  const loginMode = member.account.mode === 'login';
  const [conflict, setConflict] = useState(false);
  // After a VERSION_MISMATCH the member is refetched; keep what the user typed
  // instead of resetting the form to the refetched values (H5).
  const keepInputRef = useRef(false);

  const schema = useMemo(
    () =>
      z.object({
        first_name: z.string().min(1, t('validation.firstNameRequired')),
        last_name: z.string().min(1, t('validation.lastNameRequired')),
        // A login member's e-mail is read-only and never sent (H4); validating
        // its format would block saving every other field if the stored value
        // happens to be malformed.
        email: loginMode ? z.string() : z.email(t('validation.emailInvalid')).or(z.literal('')),
        phone: z.string(),
        membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
        membership_end: z.string(),
        notes: z.string(),
      }),
    [t, loginMode],
  );

  type EditMemberValues = z.infer<typeof schema>;

  const toDefaults = (m: StaffMemberProfile): EditMemberValues => ({
    first_name: m.first_name,
    last_name: m.last_name,
    email: m.email ?? '',
    phone: m.phone ?? '',
    membership_type: m.membership_type,
    membership_end: m.membership_end ?? '',
    notes: m.notes ?? '',
  });

  const form = useForm<EditMemberValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(member),
  });

  useEffect(() => {
    if (keepInputRef.current) return;
    form.reset(toDefaults(member));
  }, [member, form]);

  const onSubmit = (values: EditMemberValues) => {
    // Read the version at submit time: after a conflict this is the refetched one.
    const { data, params } = buildMemberUpdate(values, {
      mode: member.account.mode,
      version: member.version,
    });
    updateMember.mutate(
      { mid: member.id, data, params },
      {
        onSuccess: () => {
          keepInputRef.current = false;
          setConflict(false);
          toast.success(t('detail.edit.success'));
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
        onError: (err) => {
          const error = classifyMemberError(err);
          if (error.kind === 'versionMismatch') {
            keepInputRef.current = true;
            setConflict(true);
            void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
            return;
          }
          if (error.kind === 'loginEmailLocked') {
            form.setError('email', { type: 'server', message: t('detail.edit.emailLockedHint') });
            return;
          }
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
          {conflict ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertDescription>{t('detail.versionConflict')}</AlertDescription>
            </Alert>
          ) : null}
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
                    <Input type="email" {...field} disabled={!canEdit || loginMode} />
                  </FormControl>
                  {loginMode ? (
                    <FormDescription>{t('detail.edit.emailLockedHint')}</FormDescription>
                  ) : null}
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
