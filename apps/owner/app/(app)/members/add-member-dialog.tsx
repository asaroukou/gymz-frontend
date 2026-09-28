'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Building2Icon, FileTextIcon, LockIcon, PlusIcon, SmartphoneIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListMembersQueryKey,
  useGetTenantSettings,
  useRegisterMember,
} from '@iziwellpass/api/generated';
import { MembershipType } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
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
import { apiErrorMessage, applyFieldErrors, overrideFieldMessages } from '@/lib/api-error';
import { createAccessPayload, createdToastKey, TENANT_SETTINGS_ROLES } from '@/lib/create-member';
import { classifyMemberError } from '@/lib/member-errors';
import { MEMBER_SEARCH_KEY } from '@/lib/member-search-query';
import { useVenueContext } from '@/lib/venue-context';

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
  const role = useRole();
  const { selectedVenueId, selectedVenue } = useVenueContext();

  // Only owner/admin/platform_admin can choose the access scope: the tenant
  // settings endpoint is owner/admin-only (receptionists get 403), and a
  // receptionist's add form has no scope select — the member is always
  // scoped to their one selected venue (see `createAccessPayload`).
  const canChooseScope = role != null && TENANT_SETTINGS_ROLES.includes(role);
  const settings = useGetTenantSettings({ query: { select: unwrap, enabled: canChooseScope && open } });
  // `undefined` while loading and for receptionists (query disabled): both
  // cases render the plain e-mail label with no hint, never a wrong guess.
  const loginMode = settings.data?.member_login.effective_mode;

  const schema = useMemo(
    () =>
      z
        .object({
          first_name: z.string().min(1, t('validation.firstNameRequired')),
          last_name: z.string().min(1, t('validation.lastNameRequired')),
          // The tenant's login mode decides whether e-mail is required: login
          // mode uses it as the app identifier, roster mode has no login and
          // may omit it. A login-mode 400 from the server still maps onto
          // this field via applyFieldErrors as a defensive fallback.
          email:
            loginMode === 'login'
              ? z
                  .string()
                  .refine((v) => v !== '', { message: t('addDialog.emailRequired') })
                  .pipe(z.email(t('validation.emailInvalid')))
              : z.email(t('validation.emailInvalid')).or(z.literal('')),
          phone: z.string(),
          membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
          membership_start: z.string().min(1, t('validation.startRequired')),
          access_scope: z.enum(ACCESS_SCOPE_VALUES),
          venue_ids: z.array(z.string()),
          notes: z.string(),
        })
        .superRefine((val, ctx) => {
          // A receptionist never sees the scope select or the checklist: the
          // access part of the payload is fully derived by `createAccessPayload`
          // from their selected venue, so this validation does not apply.
          if (
            canChooseScope &&
            val.access_scope === 'venue_scoped' &&
            val.venue_ids.length === 0
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['venue_ids'],
              message: t('addDialog.venuesRequired'),
            });
          }
        }),
    [t, loginMode, canChooseScope],
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
    const access = createAccessPayload({
      canChooseScope,
      selectedVenueId,
      access_scope: values.access_scope,
      venue_ids: values.venue_ids,
    });
    registerMember.mutate(
      {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          membership_type: values.membership_type,
          membership_start: values.membership_start,
          notes: values.notes || null,
          ...access,
        },
      },
      {
        onSuccess: (response) => {
          toast.success(t(createdToastKey(response.data.effective_mode)));
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          void queryClient.invalidateQueries({ queryKey: MEMBER_SEARCH_KEY });
          form.reset(defaults);
          if (addAnother) {
            form.setFocus('first_name');
          } else {
            setOpen(false);
          }
        },
        onError: (err) => {
          if (classifyMemberError(err).kind === 'duplicate') {
            form.setError('email', { type: 'server', message: t('addDialog.emailTaken') });
            return;
          }
          if (
            applyFieldErrors(
              form,
              overrideFieldMessages(err, { email: t('addDialog.emailRequired') }),
            )
          ) {
            return;
          }
          toast.error(apiErrorMessage(err, t('addDialog.error')));
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
          {loginMode ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loginMode === 'login' ? (
                <SmartphoneIcon className="size-4 shrink-0" aria-hidden />
              ) : (
                <FileTextIcon className="size-4 shrink-0" aria-hidden />
              )}
              <span>{loginMode === 'login' ? t('addDialog.hintLogin') : t('addDialog.hintRoster')}</span>
            </div>
          ) : null}
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
                      <FormLabel>
                        {loginMode === 'roster' ? t('addDialog.emailOptional') : t('addDialog.email')}
                      </FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      {loginMode === 'login' ? (
                        <FormDescription>{t('addDialog.emailHelpLogin')}</FormDescription>
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
              {canChooseScope ? (
                <>
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
                            <SelectItem value="chain_wide">
                              {t('addDialog.scopeChainWide')}
                            </SelectItem>
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
                          <Label id="add-member-venues-label">{t('addDialog.venues')}</Label>
                          <VenueChecklist
                            value={field.value}
                            onChange={field.onChange}
                            aria-labelledby="add-member-venues-label"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label id="add-member-access-label">{t('addDialog.accessScope')}</Label>
                  <div
                    id="add-member-access"
                    aria-readonly="true"
                    aria-labelledby="add-member-access-label"
                    className="flex min-h-11 items-center gap-2 rounded-full border border-input bg-side px-[18px] text-base text-muted-foreground"
                  >
                    <Building2Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{selectedVenue?.name}</span>
                    <LockIcon className="size-4 shrink-0" aria-hidden />
                  </div>
                </div>
              )}
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
