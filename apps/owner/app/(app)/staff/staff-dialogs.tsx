'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontalIcon, Trash2Icon, UserCogIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  getListStaffQueryKey,
  useChangeRole,
  useInviteStaff,
  useRemoveStaff,
  useSetStaffVenues,
} from '@iziwellpass/api/generated';
import type { Staff } from '@iziwellpass/api/schemas';
import { Role } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
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

import { VenueChecklist } from '@/components/venue-checklist';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { staffName } from '@/lib/staff-name';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Roles assignable to staff via invite/change-role. Excludes `platform_admin`
 * (platform-level, not tenant staff), `consumer` (marketplace end-user, not
 * staff), and `owner` — the backend domain validation rejects inviting or
 * assigning owner via staff invite ("Cannot invite owner or platform_admin
 * via staff invite").
 */
const ASSIGNABLE_ROLES = [Role.admin, Role.trainer, Role.receptionist] as const;

/**
 * Roles whose access is scoped to specific venues. The invite dialog shows a
 * venue checklist (required, ≥1) for these and sends `venue_ids`; owner/admin
 * are org-wide and get no checklist (their `venue_ids` is omitted).
 */
const VENUE_SCOPED_ROLES = [Role.trainer, Role.receptionist] as const;
const isVenueScopedRole = (role: string): boolean =>
  (VENUE_SCOPED_ROLES as readonly string[]).includes(role);

/**
 * A staff row's current role may be `owner` (not assignable/editable here —
 * see ASSIGNABLE_ROLES). Fall back to `admin` as the dialog's default in that
 * case so the form always starts on a value the select actually offers.
 */
function assignableRoleOrFallback(role: Staff['role']): (typeof ASSIGNABLE_ROLES)[number] {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role)
    ? (role as (typeof ASSIGNABLE_ROLES)[number])
    : Role.admin;
}

// ---------------------------------------------------------------------------
// Invite staff dialog
// ---------------------------------------------------------------------------

export function InviteStaffDialog({ variant = 'default' }: { variant?: 'default' | 'secondary' }) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const inviteStaff = useInviteStaff();

  const schema = useMemo(
    () =>
      z
        .object({
          first_name: z.string().min(1, t('inviteDialog.firstNameRequired')),
          last_name: z.string().min(1, t('inviteDialog.lastNameRequired')),
          email: z.email(t('inviteDialog.emailInvalid')),
          role: z.enum(ASSIGNABLE_ROLES),
          venue_ids: z.array(z.string()),
        })
        .superRefine((val, ctx) => {
          if (isVenueScopedRole(val.role) && val.venue_ids.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['venue_ids'],
              message: t('inviteDialog.venuesRequired'),
            });
          }
        }),
    [t],
  );

  type InviteStaffValues = z.infer<typeof schema>;

  const defaults: InviteStaffValues = {
    first_name: '',
    last_name: '',
    email: '',
    role: Role.trainer,
    venue_ids: [],
  };

  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const onSubmit = (values: InviteStaffValues) => {
    inviteStaff.mutate(
      {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          role: values.role,
          venue_ids: isVenueScopedRole(values.role) ? values.venue_ids : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('inviteDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          form.reset(defaults);
          setOpen(false);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('inviteDialog.error')));
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
          <UserPlusIcon />
          {t('invite')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('inviteDialog.title')}</DialogTitle>
          <DialogDescription>{t('inviteDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-[18px]">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inviteDialog.firstName')}</FormLabel>
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
                      <FormLabel>{t('inviteDialog.lastName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inviteDialog.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inviteDialog.role')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`role.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isVenueScopedRole(form.watch('role')) ? (
                <FormField
                  control={form.control}
                  name="venue_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inviteDialog.venues')}</FormLabel>
                      <VenueChecklist value={field.value} onChange={field.onChange} />
                      <p className="text-sm text-muted-foreground">
                        {t('inviteDialog.venuesHint')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <p className="text-md text-muted-foreground">{t('inviteDialog.expectation')}</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={inviteStaff.isPending}>
                {inviteStaff.isPending ? t('inviteDialog.submitting') : t('inviteDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Change role dialog
// ---------------------------------------------------------------------------

function ChangeRoleDialog({
  staff,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const changeRole = useChangeRole();

  const schema = useMemo(() => z.object({ role: z.enum(ASSIGNABLE_ROLES) }), []);
  type ChangeRoleValues = z.infer<typeof schema>;

  const form = useForm<ChangeRoleValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: assignableRoleOrFallback(staff.role) },
  });

  // Re-sync the form when the row's staff data refetches (e.g. the role
  // changes underneath an open dialog), mirroring EditResourceDialog.
  useEffect(() => {
    form.reset({ role: assignableRoleOrFallback(staff.role) });
  }, [staff.role, form]);

  const onSubmit = (values: ChangeRoleValues) => {
    changeRole.mutate(
      { sid: staff.id, data: values },
      {
        onSuccess: () => {
          toast.success(t('roleDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('roleDialog.error')));
          }
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          form.reset({ role: assignableRoleOrFallback(staff.role) });
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('roleDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('roleDialog.description', { name: staffName(staff) })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-[18px]">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roleDialog.role')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`role.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-sm text-muted-foreground">{t('roleDialog.hint')}</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={changeRole.isPending}>
                {changeRole.isPending ? t('roleDialog.saving') : t('roleDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Manage venues dialog
// ---------------------------------------------------------------------------

function ManageVenuesDialog({
  staff,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const setVenues = useSetStaffVenues();
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [venuesError, setVenuesError] = useState(false);

  // Blind replace: staff venue assignments aren't readable, so every open
  // starts from an empty selection.
  useEffect(() => {
    if (open) {
      setVenueIds([]);
      setVenuesError(false);
    }
  }, [open]);

  const handleSave = () => {
    if (venueIds.length === 0) {
      setVenuesError(true);
      return;
    }
    setVenues.mutate(
      { sid: staff.id, data: { venue_ids: venueIds } },
      {
        onSuccess: () => {
          toast.success(t('venuesDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('venuesDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-[520px]"
        restoreFocusTo={restoreFocusTo}
      >
        <DialogHeader>
          <DialogTitle>{t('venuesDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-[18px]">
          <p className="text-sm text-muted-foreground">{t('venuesDialog.replaceWarning')}</p>
          <VenueChecklist
            value={venueIds}
            onChange={(next) => {
              setVenueIds(next);
              if (next.length > 0) setVenuesError(false);
            }}
          />
          {venuesError ? (
            <p className="text-sm text-destructive-foreground">
              {t('venuesDialog.venuesRequired')}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              {tCommon('cancel')}
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={setVenues.isPending}>
            {setVenues.isPending ? t('venuesDialog.submitting') : t('venuesDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Remove staff confirm dialog
// ---------------------------------------------------------------------------

function RemoveStaffDialog({
  staff,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const removeStaff = useRemoveStaff();

  const handleRemove = () => {
    removeStaff.mutate(
      { sid: staff.id },
      {
        onSuccess: () => {
          toast.success(t('removeDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('removeDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('removeDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('removeDialog.description', { name: staffName(staff) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleRemove} disabled={removeStaff.isPending}>
            {removeStaff.isPending ? t('removeDialog.confirming') : t('removeDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export function StaffRowActions({
  staff,
  isSelf,
  size = 'icon-sm',
}: {
  staff: Staff;
  isSelf: boolean;
  size?: 'icon' | 'icon-sm';
}) {
  const t = useTranslations('staff');
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [manageVenuesOpen, setManageVenuesOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={menuRef} variant="ghost" size={size} aria-label={t('row.menu')}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setChangeRoleOpen(true)}>
            <UserCogIcon />
            {t('row.changeRole')}
          </DropdownMenuItem>
          {isVenueScopedRole(staff.role) ? (
            <DropdownMenuItem onSelect={() => setManageVenuesOpen(true)}>
              {t('venuesDialog.manage')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onSelect={() => {
              if (isSelf) return;
              setRemoveOpen(true);
            }}
          >
            <Trash2Icon />
            {t('row.remove')}
          </DropdownMenuItem>
          {isSelf ? (
            <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">{t('row.selfHint')}</p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangeRoleDialog
        staff={staff}
        open={changeRoleOpen}
        onOpenChange={setChangeRoleOpen}
        restoreFocusTo={() => menuRef.current}
      />
      <ManageVenuesDialog
        staff={staff}
        open={manageVenuesOpen}
        onOpenChange={setManageVenuesOpen}
        restoreFocusTo={() => menuRef.current}
      />
      <RemoveStaffDialog
        staff={staff}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        restoreFocusTo={() => menuRef.current}
      />
    </>
  );
}
