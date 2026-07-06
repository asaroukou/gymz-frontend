'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListMembersQueryKey,
  useListMembers,
  useRegisterMember,
} from '@iziwellpass/api/generated';
import type { Member } from '@iziwellpass/api/schemas';
import { MembershipType } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
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

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

function labelize(value: string): string {
  return value.replace(/_/g, ' ');
}

function membershipStatusBadgeVariant(
  status: Member['membership_status'],
): 'default' | 'destructive' | 'secondary' {
  if (status === 'active') return 'default';
  if (status === 'suspended') return 'destructive';
  return 'secondary';
}

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

// ---------------------------------------------------------------------------
// Add member dialog
// ---------------------------------------------------------------------------

const createMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.email('Enter a valid email address').or(z.literal('')),
  phone: z.string(),
  membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
  membership_start: z.string().min(1, 'Start date is required'),
  notes: z.string(),
});

type CreateMemberValues = z.infer<typeof createMemberSchema>;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const registerMember = useRegisterMember();

  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      membership_type: 'monthly',
      membership_start: todayIsoDate(),
      notes: '',
    },
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
          toast.success('Member added');
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          form.reset({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            membership_type: 'monthly',
            membership_start: todayIsoDate(),
            notes: '',
          });
          setOpen(false);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, 'Failed to add member'));
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
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Add member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>Enroll a new member at this tenant.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
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
                    <FormLabel>Last name</FormLabel>
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
                  <FormLabel>Email</FormLabel>
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <FormLabel>Membership type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEMBERSHIP_TYPE_VALUES.map((type) => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {labelize(type)}
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
                    <FormLabel>Membership start</FormLabel>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={registerMember.isPending}>
                {registerMember.isPending ? 'Adding…' : 'Add member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Members table
// ---------------------------------------------------------------------------

function MembersTable({ members }: { members: Member[] }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = memberName(member).toLowerCase();
      const email = (member.email ?? '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [members, filter]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter by name or email…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No members match &quot;{filter}&quot;.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Membership type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => (
              <TableRow key={member.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/members/${member.id}`} className="hover:underline">
                    {memberName(member)}
                  </Link>
                </TableCell>
                <TableCell>{member.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {labelize(member.membership_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={membershipStatusBadgeVariant(member.membership_status)}
                    className="capitalize"
                  >
                    {labelize(member.membership_status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function MembersSection({ canCreate }: { canCreate: boolean }) {
  const membersQuery = useListMembers({ query: { select: unwrap } });

  if (membersQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (membersQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {apiErrorMessage(membersQuery.error, 'Failed to load members')}
      </p>
    );
  }

  const members = membersQuery.data ?? [];

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">No members yet.</p>
        {canCreate ? <AddMemberDialog /> : null}
      </div>
    );
  }

  return <MembersTable members={members} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function MembersContent() {
  const role = useRole();
  const canCreate = role === 'owner' || role === 'admin' || role === 'receptionist';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Members enrolled at your tenant and their subscriptions.
          </p>
        </div>
        {canCreate ? <AddMemberDialog /> : null}
      </div>
      <MembersSection canCreate={canCreate} />
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
