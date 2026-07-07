'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  BanIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SearchIcon,
  UsersRoundIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useListMembers,
  useRegisterMember,
  useSuspendMember,
} from '@iziwellpass/api/generated';
import type { Member, MembershipStatus } from '@iziwellpass/api/schemas';
import { MembershipType } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
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
import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { daysUntilCalendarDate, formatCalendarDate } from '@/lib/datetime';

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

/** Number of days before the membership end date we flag it "expiring soon". */
const EXPIRING_SOON_DAYS = 7;

type StatusFilter = 'all' | 'active' | 'expired' | 'suspended';

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
  // expired + cancelled read as muted.
  return 'secondary';
}

/** Active membership whose end date is within the next `EXPIRING_SOON_DAYS`. */
function isExpiringSoon(member: Member): boolean {
  if (member.membership_status !== 'active') return false;
  const days = daysUntilCalendarDate(member.membership_end);
  return days !== null && days >= 0 && days <= EXPIRING_SOON_DAYS;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Enroll (add member) dialog
// ---------------------------------------------------------------------------

function AddMemberDialog() {
  const t = useTranslations('members');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const registerMember = useRegisterMember();

  const schema = useMemo(
    () =>
      z.object({
        first_name: z.string().min(1, t('validation.firstNameRequired')),
        last_name: z.string().min(1, t('validation.lastNameRequired')),
        email: z.email(t('validation.emailInvalid')).or(z.literal('')),
        phone: z.string(),
        membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
        membership_start: z.string().min(1, t('validation.startRequired')),
        notes: z.string(),
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
    notes: '',
  };

  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const onSubmit = (values: CreateMemberValues) => {
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
        },
      },
      {
        onSuccess: () => {
          toast.success(t('addDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          form.reset(defaults);
          setOpen(false);
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
        <Button>{t('add')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addDialog.title')}</DialogTitle>
          <DialogDescription>{t('addDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDialog.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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

// ---------------------------------------------------------------------------
// Suspend confirm dialog (driven from the row menu)
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
// Directory (toolbar + table)
// ---------------------------------------------------------------------------

function MemberRow({
  member,
  canManage,
  onSuspend,
}: {
  member: Member;
  canManage: boolean;
  onSuspend: (member: Member) => void;
}) {
  const t = useTranslations('members');
  const locale = useLocale();
  const expiringSoon = isExpiringSoon(member);
  const canSuspend = canManage && member.membership_status !== 'suspended';

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/members/${member.id}`}
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15"
        >
          <Avatar size="sm">
            <AvatarFallback aria-hidden>{initials(member)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{memberName(member)}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex flex-col">
          <span>{member.email ?? '—'}</span>
          {member.phone ? (
            <span className="font-mono text-xs text-muted-foreground">{member.phone}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{t(`type.${member.membership_type}`)}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(member.membership_status)}>
          {t(`status.${member.membership_status}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className={member.membership_end ? undefined : 'text-muted-foreground'}>
            {member.membership_end ? formatCalendarDate(member.membership_end, locale) : t('noEnd')}
          </span>
          {expiringSoon ? (
            <Badge variant="warning" className="w-fit">
              {t('expiringSoon')}
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('row.menu')}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/members/${member.id}`}>
                <EyeIcon />
                {t('row.view')}
              </Link>
            </DropdownMenuItem>
            {canManage ? (
              <DropdownMenuItem asChild>
                <Link href={`/members/${member.id}`}>
                  <PencilIcon />
                  {t('row.edit')}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {canSuspend ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onSuspend(member)}>
                  <BanIcon />
                  {t('row.suspend')}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function MembersDirectory({ members, canManage }: { members: Member[]; canManage: boolean }) {
  const t = useTranslations('members');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [suspendTarget, setSuspendTarget] = useState<Member | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (status !== 'all' && member.membership_status !== status) return false;
      if (!q) return true;
      const name = memberName(member).toLowerCase();
      const email = (member.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query, status]);

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'active', label: t('filters.active') },
    { value: 'expired', label: t('filters.expired') },
    { value: 'suspended', label: t('filters.suspended') },
  ];

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <TabsList aria-label={t('columns.status')}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
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
          {canManage ? <AddMemberDialog /> : null}
        </div>
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
              <TableHead>{t('columns.contact')}</TableHead>
              <TableHead>{t('columns.type')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.end')}</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManage={canManage}
                onSuspend={setSuspendTarget}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {suspendTarget ? (
        <SuspendMemberDialog
          member={suspendTarget}
          open={suspendTarget !== null}
          onOpenChange={(next) => {
            if (!next) setSuspendTarget(null);
          }}
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading / states
// ---------------------------------------------------------------------------

function DirectorySkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-9 w-64 rounded-full" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

function MembersContent() {
  const t = useTranslations('members');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin' || role === 'receptionist';

  const membersQuery = useListMembers({ query: { select: unwrap } });
  const members = membersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        {membersQuery.isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : membersQuery.isError ? null : (
          <p className="text-sm text-muted-foreground">
            {t('subtitle', { count: members.length })}
          </p>
        )}
      </div>

      {membersQuery.isLoading ? (
        <DirectorySkeleton />
      ) : membersQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(membersQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : members.length === 0 ? (
        <Card>
          <Empty>
            <EmptyMedia>
              <UsersRoundIcon />
            </EmptyMedia>
            <EmptyTitle>{t('empty.title')}</EmptyTitle>
            <EmptyDescription>{t('empty.body')}</EmptyDescription>
            {canManage ? (
              <EmptyContent>
                <AddMemberDialog />
              </EmptyContent>
            ) : null}
          </Empty>
        </Card>
      ) : (
        <MembersDirectory members={members} canManage={canManage} />
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <RequirePageAccess href="/members">
      <MembersContent />
    </RequirePageAccess>
  );
}
