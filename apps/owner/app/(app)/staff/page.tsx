'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontalIcon,
  SearchIcon,
  Trash2Icon,
  UserCogIcon,
  UsersRoundIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListStaffQueryKey,
  useChangeRole,
  useInviteStaff,
  useListStaff,
  useRemoveStaff,
} from '@iziwellpass/api/generated';
import type { Staff } from '@iziwellpass/api/schemas';
import { Role } from '@iziwellpass/api/schemas';
import { useSession } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card } from '@iziwellpass/ui/components/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

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

function staffName(staff: Staff): string {
  return `${staff.first_name} ${staff.last_name}`.trim();
}

function initials(staff: Staff): string {
  const first = staff.first_name.charAt(0);
  const last = staff.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

/** Role badge color: owner = ink, admin = info, coach/reception = secondary. */
function roleBadgeVariant(role: Staff['role']): 'default' | 'info' | 'secondary' {
  if (role === Role.owner) return 'default';
  if (role === Role.admin) return 'info';
  return 'secondary';
}

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

function InviteStaffDialog() {
  const t = useTranslations('staff');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const inviteStaff = useInviteStaff();

  const schema = useMemo(
    () =>
      z.object({
        first_name: z.string().min(1, t('inviteDialog.firstNameRequired')),
        last_name: z.string().min(1, t('inviteDialog.lastNameRequired')),
        email: z.email(t('inviteDialog.emailInvalid')),
        role: z.enum(ASSIGNABLE_ROLES),
      }),
    [t],
  );

  type InviteStaffValues = z.infer<typeof schema>;

  const defaults: InviteStaffValues = {
    first_name: '',
    last_name: '',
    email: '',
    role: Role.trainer,
  };

  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const onSubmit = (values: InviteStaffValues) => {
    inviteStaff.mutate(
      { data: values },
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
        <Button>{t('invite')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteDialog.title')}</DialogTitle>
          <DialogDescription>{t('inviteDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
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
            <p className="text-sm text-muted-foreground">{t('inviteDialog.expectation')}</p>
            <DialogFooter>
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
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('staff');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('roleDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('roleDialog.description', { name: staffName(staff) })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
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
            <DialogFooter>
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
// Remove staff confirm dialog
// ---------------------------------------------------------------------------

function RemoveStaffDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('removeDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('removeDialog.description', { name: staffName(staff) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
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

function StaffRowActions({ staff, isSelf }: { staff: Staff; isSelf: boolean }) {
  const t = useTranslations('staff');
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('row.menu')}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setChangeRoleOpen(true)}>
            <UserCogIcon />
            {t('row.changeRole')}
          </DropdownMenuItem>
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
      <ChangeRoleDialog staff={staff} open={changeRoleOpen} onOpenChange={setChangeRoleOpen} />
      <RemoveStaffDialog staff={staff} open={removeOpen} onOpenChange={setRemoveOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Staff table
// ---------------------------------------------------------------------------

function StaffTable({ staff, selfUserId }: { staff: Staff[]; selfUserId: string | null }) {
  const t = useTranslations('staff');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((member) => {
      const name = staffName(member).toLowerCase();
      const email = member.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [staff, query]);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
            className="pl-9"
          />
        </div>
        <InviteStaffDialog />
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyTitle>{t('noResults.title')}</EmptyTitle>
          <EmptyDescription>{t('noResults.body')}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.member')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.role')}</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => {
              const isSelf = selfUserId !== null && member.user_id === selfUserId;
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback aria-hidden>{initials(member)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{staffName(member)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(member.role)}>
                      {t(`role.${member.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <StaffRowActions staff={member} isSelf={isSelf} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function StaffTableSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

function StaffContent() {
  const t = useTranslations('staff');
  const session = useSession();
  const selfUserId = session.status === 'signed-in' ? session.claims.sub : null;

  const staffQuery = useListStaff({ query: { select: unwrap } });
  const staff = staffQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        {staffQuery.isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : staffQuery.isError ? null : (
          <p className="text-sm text-muted-foreground">{t('subtitle', { count: staff.length })}</p>
        )}
      </div>

      {staffQuery.isLoading ? (
        <StaffTableSkeleton />
      ) : staffQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(staffQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : staff.length === 0 ? (
        <Card>
          <Empty>
            <EmptyMedia>
              <UsersRoundIcon />
            </EmptyMedia>
            <EmptyTitle>{t('empty.title')}</EmptyTitle>
            <EmptyDescription>{t('empty.body')}</EmptyDescription>
            <EmptyContent>
              <InviteStaffDialog />
            </EmptyContent>
          </Empty>
        </Card>
      ) : (
        <StaffTable staff={staff} selfUserId={selfUserId} />
      )}
    </div>
  );
}

export default function StaffPage() {
  return (
    <RequirePageAccess href="/staff">
      <StaffContent />
    </RequirePageAccess>
  );
}
