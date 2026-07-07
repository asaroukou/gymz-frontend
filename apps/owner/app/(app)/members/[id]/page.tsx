'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, BanIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useGetMember,
  useSuspendMember,
  useUpdateMember,
} from '@iziwellpass/api/generated';
import type { Member, MembershipStatus } from '@iziwellpass/api/schemas';
import { MembershipType } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from '@iziwellpass/ui/components/separator';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Textarea } from '@iziwellpass/ui/components/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

function initials(member: Member): string {
  const first = member.first_name.charAt(0);
  const last = member.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

function statusBadgeVariant(status: MembershipStatus): 'success' | 'destructive' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'suspended') return 'destructive';
  return 'secondary';
}

// ---------------------------------------------------------------------------
// Identity card
// ---------------------------------------------------------------------------

function IdentityCard({ member }: { member: Member }) {
  const t = useTranslations('members');
  const locale = useLocale();

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-14">
            <AvatarFallback aria-hidden className="text-lg">
              {initials(member)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{memberName(member)}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`type.${member.membership_type}`)}</Badge>
              <Badge variant={statusBadgeVariant(member.membership_status)}>
                {t(`status.${member.membership_status}`)}
              </Badge>
            </div>
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:text-right">
          <div>
            <dt className="text-muted-foreground">{t('columns.contact')}</dt>
            <dd className="font-medium">{member.email ?? t('detail.noEmail')}</dd>
            <dd className="font-mono text-xs text-muted-foreground">
              {member.phone ?? t('detail.noPhone')}
            </dd>
          </div>
          <div className="text-xs text-muted-foreground">
            {/*
              `created_at` is a date-time instant, but members are org-scoped
              with no single venue timezone to convert against, and the
              instant formatters in lib/datetime.ts are locale-fixed to en-GB.
              We format the leading calendar date in the active (fr) locale —
              a deliberate simplification that can be off by a day right at
              UTC midnight; acceptable for a "member since" line.
            */}
            {t('detail.memberSince', { date: formatCalendarDate(member.created_at, locale) })}
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Subscription summary card
// ---------------------------------------------------------------------------

function SubscriptionCard({ member }: { member: Member }) {
  const t = useTranslations('members');
  const locale = useLocale();

  const rows: { label: string; value: ReactNode }[] = [
    { label: t('detail.subscription.type'), value: t(`type.${member.membership_type}`) },
    {
      label: t('detail.subscription.start'),
      value: formatCalendarDate(member.membership_start, locale),
    },
    {
      label: t('detail.subscription.end'),
      value: member.membership_end ? formatCalendarDate(member.membership_end, locale) : t('noEnd'),
    },
    {
      label: t('detail.subscription.status'),
      value: (
        <Badge variant={statusBadgeVariant(member.membership_status)}>
          {t(`status.${member.membership_status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.subscription.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rows.map((row, i) => (
          <div key={row.label}>
            {i > 0 ? <Separator className="mb-3" /> : null}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          </div>
        ))}
        <Separator />
        <div className="space-y-1">
          <span className="text-muted-foreground">{t('detail.subscription.notes')}</span>
          <p className="whitespace-pre-wrap">
            {member.notes ?? (
              <span className="text-muted-foreground">{t('detail.subscription.noNotes')}</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit form (existing update contract)
// ---------------------------------------------------------------------------

function EditMemberForm({ member, canEdit }: { member: Member; canEdit: boolean }) {
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
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.edit.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="grid gap-4 sm:grid-cols-2"
          >
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t('detail.edit.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canEdit ? (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={updateMember.isPending}>
                  {updateMember.isPending ? t('detail.edit.saving') : t('detail.edit.save')}
                </Button>
              </div>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Suspend confirm dialog
// ---------------------------------------------------------------------------

function SuspendMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const suspendMember = useSuspendMember();

  const handleSuspend = () => {
    suspendMember.mutate(
      { mid: member.id },
      {
        onSuccess: () => {
          toast.success(t('detail.suspendDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('detail.suspendDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.suspendDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.suspendDialog.description', { name: memberName(member) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleSuspend} disabled={suspendMember.isPending}>
            {suspendMember.isPending
              ? t('detail.suspendDialog.confirming')
              : t('detail.suspendDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Danger zone
// ---------------------------------------------------------------------------

function DangerZone({ member }: { member: Member }) {
  const t = useTranslations('members');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isSuspended = member.membership_status === 'suspended';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.danger.title')}</CardTitle>
        <CardDescription>{t('detail.danger.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={isSuspended}>
          <BanIcon />
          {isSuspended ? t('detail.danger.suspended') : t('detail.danger.suspend')}
        </Button>
        {/*
          No unsuspend / reactivate endpoint exists in the API (only
          `suspendMember`). The affordance is rendered disabled with a
          "coming soon" tooltip rather than wired to a nonexistent path.
        */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" disabled aria-disabled className="pointer-events-none">
                {t('detail.danger.reactivate')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('detail.danger.reactivateSoon')}</TooltipContent>
        </Tooltip>
      </CardContent>
      <SuspendMemberDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function MemberDetailContent() {
  const t = useTranslations('members');
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin' || role === 'receptionist';

  const memberQuery = useGetMember(memberId, { query: { select: unwrap } });

  const backLink = (
    <Link
      href="/members"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      {t('detail.back')}
    </Link>
  );

  if (memberQuery.isLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-1" />
          <Skeleton className="h-64 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (memberQuery.isError) {
    return (
      <div className="space-y-6">
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(memberQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const member = memberQuery.data;
  if (!member) {
    return (
      <div className="space-y-6">
        {backLink}
        <p className="text-sm text-muted-foreground">{t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {backLink}
      <IdentityCard member={member} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SubscriptionCard member={member} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <EditMemberForm member={member} canEdit={canEdit} />
          {canEdit ? <DangerZone member={member} /> : null}
        </div>
      </div>
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <RequirePageAccess href="/members">
      <MemberDetailContent />
    </RequirePageAccess>
  );
}
