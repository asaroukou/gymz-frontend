'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useGetMember,
  useSuspendMember,
  useUpdateMember,
} from '@iziwellpass/api/generated';
import type { Member } from '@iziwellpass/api/schemas';
import { MembershipType } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
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
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

const MEMBERSHIP_TYPE_VALUES = Object.values(MembershipType) as [
  MembershipType,
  ...MembershipType[],
];

function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? `${fallback} (${err.code})` : fallback;
}

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
// Edit form (the subscription-management surface: membership type + is_active)
// ---------------------------------------------------------------------------

const editMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.email('Enter a valid email address').or(z.literal('')),
  phone: z.string(),
  membership_type: z.enum(MEMBERSHIP_TYPE_VALUES),
  membership_end: z.string(),
  is_active: z.enum(['active', 'inactive']),
  notes: z.string(),
});

type EditMemberValues = z.infer<typeof editMemberSchema>;

function memberToDefaults(member: Member): EditMemberValues {
  return {
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email ?? '',
    phone: member.phone ?? '',
    membership_type: member.membership_type,
    membership_end: member.membership_end ?? '',
    is_active: member.is_active ? 'active' : 'inactive',
    notes: member.notes ?? '',
  };
}

function EditMemberForm({ member, canEdit }: { member: Member; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const updateMember = useUpdateMember();

  const form = useForm<EditMemberValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: memberToDefaults(member),
  });

  useEffect(() => {
    form.reset(memberToDefaults(member));
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
          toast.success('Member updated');
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to update member'));
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit member</CardTitle>
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
                  <FormLabel>First name</FormLabel>
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
                  <FormLabel>Last name</FormLabel>
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
                  <FormLabel>Email</FormLabel>
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
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
                  <FormLabel>Membership type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
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
              name="membership_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership end</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/*
              `UpdateMemberRequest` only exposes `is_active` (boolean), not a
              `membership_status` enum field — so this select is the closest
              editable proxy for status. Suspension via the dedicated
              `suspendMember` endpoint is the authoritative status transition
              below; this toggle only flips the `is_active` flag.
            */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canEdit ? (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={updateMember.isPending}>
                  {updateMember.isPending ? 'Saving…' : 'Save changes'}
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
  const queryClient = useQueryClient();
  const suspendMember = useSuspendMember();

  const handleSuspend = () => {
    suspendMember.mutate(
      { mid: member.id },
      {
        onSuccess: () => {
          toast.success('Member suspended');
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to suspend member'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend member</DialogTitle>
          <DialogDescription>
            This will suspend &quot;{memberName(member)}&quot;&apos;s membership. They will not be
            able to check in or book until reactivated.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSuspend} disabled={suspendMember.isPending}>
            {suspendMember.isPending ? 'Suspending…' : 'Suspend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

function ProfileCard({ member, canEdit }: { member: Member; canEdit: boolean }) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const canSuspend = canEdit && member.membership_status !== 'suspended';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{memberName(member)}</CardTitle>
          <p className="text-sm text-muted-foreground">{member.email ?? 'No email on file'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {labelize(member.membership_type)}
          </Badge>
          <Badge
            variant={membershipStatusBadgeVariant(member.membership_status)}
            className="capitalize"
          >
            {labelize(member.membership_status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{member.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Membership start</dt>
            <dd>{member.membership_start}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Membership end</dt>
            <dd>{member.membership_end ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Notes</dt>
            <dd>{member.notes ?? '—'}</dd>
          </div>
        </dl>
        {canSuspend ? (
          <Button variant="destructive" onClick={() => setSuspendOpen(true)}>
            Suspend member
          </Button>
        ) : null}
      </CardContent>
      <SuspendMemberDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin' || role === 'receptionist';

  const memberQuery = useGetMember(memberId, { query: { select: unwrap } });

  if (memberQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (memberQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {apiErrorMessage(memberQuery.error, 'Failed to load member')}
      </p>
    );
  }

  const member = memberQuery.data;
  if (!member) {
    return <p className="text-sm text-muted-foreground">Member not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{memberName(member)}</h1>
        <p className="text-sm text-muted-foreground">Member profile and subscription details.</p>
      </div>
      <ProfileCard member={member} canEdit={canEdit} />
      <EditMemberForm member={member} canEdit={canEdit} />
    </div>
  );
}
