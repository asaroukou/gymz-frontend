'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import {
  getListStaffQueryKey,
  useChangeRole,
  useInviteStaff,
  useListStaff,
  useRemoveStaff,
} from '@iziwellpass/api/generated';
import type { Staff } from '@iziwellpass/api/schemas';
import { Role } from '@iziwellpass/api/schemas';
import { useRole, useSession } from '@iziwellpass/auth/provider';
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
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

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

function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? `${fallback} (${err.code})` : fallback;
}

function labelize(value: string): string {
  return value.replace(/_/g, ' ');
}

function staffName(staff: Staff): string {
  return `${staff.first_name} ${staff.last_name}`.trim();
}

function roleBadgeVariant(role: Staff['role']): 'default' | 'secondary' | 'outline' {
  if (role === 'owner' || role === 'admin') return 'default';
  return 'outline';
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

const inviteStaffSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.email('Enter a valid email address'),
  role: z.enum(ASSIGNABLE_ROLES),
});

type InviteStaffValues = z.infer<typeof inviteStaffSchema>;

function InviteStaffDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const inviteStaff = useInviteStaff();

  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: Role.trainer,
    },
  });

  const onSubmit = (values: InviteStaffValues) => {
    inviteStaff.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success('Staff member invited');
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          form.reset({ first_name: '', last_name: '', email: '', role: Role.trainer });
          setOpen(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to invite staff member'));
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
        <Button>Invite staff</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            Send an invitation to join your tenant as a staff member.
          </DialogDescription>
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {labelize(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={inviteStaff.isPending}>
                {inviteStaff.isPending ? 'Inviting…' : 'Invite staff'}
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

const changeRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});

type ChangeRoleValues = z.infer<typeof changeRoleSchema>;

function ChangeRoleDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const changeRole = useChangeRole();

  const form = useForm<ChangeRoleValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { role: assignableRoleOrFallback(staff.role) },
  });

  const onSubmit = (values: ChangeRoleValues) => {
    changeRole.mutate(
      { sid: staff.id, data: values },
      {
        onSuccess: () => {
          toast.success('Role updated');
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to change role'));
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
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Update &quot;{staffName(staff)}&quot;&apos;s role at this tenant.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {labelize(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={changeRole.isPending}>
                {changeRole.isPending ? 'Saving…' : 'Save changes'}
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
  const queryClient = useQueryClient();
  const removeStaff = useRemoveStaff();

  const handleRemove = () => {
    removeStaff.mutate(
      { sid: staff.id },
      {
        onSuccess: () => {
          toast.success('Staff member removed');
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to remove staff member'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove staff member</DialogTitle>
          <DialogDescription>
            This will remove &quot;{staffName(staff)}&quot; from your tenant and disable their
            account. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={removeStaff.isPending}>
            {removeStaff.isPending ? 'Removing…' : 'Remove'}
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
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setChangeRoleOpen(true)}>Change role</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onSelect={() => {
              if (isSelf) return;
              setRemoveOpen(true);
            }}
          >
            Remove
          </DropdownMenuItem>
          {isSelf ? (
            <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">
              You can&apos;t remove your own staff account.
            </p>
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
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return staff;
    return staff.filter((member) => {
      const name = staffName(member).toLowerCase();
      const email = member.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [staff, filter]);

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
          No staff match &quot;{filter}&quot;.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => {
              const isSelf = selfUserId !== null && member.user_id === selfUserId;
              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{staffName(member)}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
                      {labelize(member.role)}
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
    </div>
  );
}

function StaffSection({ selfUserId }: { selfUserId: string | null }) {
  const staffQuery = useListStaff({ query: { select: unwrap } });

  if (staffQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (staffQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {apiErrorMessage(staffQuery.error, 'Failed to load staff')}
      </p>
    );
  }

  const staff = staffQuery.data ?? [];

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">No staff yet — Invite staff</p>
        <InviteStaffDialog />
      </div>
    );
  }

  return <StaffTable staff={staff} selfUserId={selfUserId} />;
}

// ---------------------------------------------------------------------------
// No-access notice (inline belt-and-braces; nav already hides this route)
// ---------------------------------------------------------------------------

function NoAccessCard() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>No access</CardTitle>
        <CardDescription>Only owners and admins can manage staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Ask an owner or admin at your tenant for help with staff changes.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StaffPage() {
  const role = useRole();
  const session = useSession();
  const canManage = role === 'owner' || role === 'admin' || role === 'platform_admin';

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Staff members at your tenant and their roles.
          </p>
        </div>
        <NoAccessCard />
      </div>
    );
  }

  const selfUserId = session.status === 'signed-in' ? session.claims.sub : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Staff members at your tenant and their roles.
          </p>
        </div>
        <InviteStaffDialog />
      </div>
      <StaffSection selfUserId={selfUserId} />
    </div>
  );
}
