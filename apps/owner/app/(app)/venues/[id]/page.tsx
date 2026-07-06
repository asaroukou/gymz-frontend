'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import {
  getGetVenueQueryKey,
  getListResourcesQueryKey,
  getListResourceTypesQueryKey,
  getListVenuesQueryKey,
  useCreateResource,
  useCreateResourceType,
  useDeleteResource,
  useGetVenue,
  useListResources,
  useListResourceTypes,
  useUpdateResource,
  useUpdateVenue,
} from '@iziwellpass/api/generated';
import type { Resource, ResourceType, Venue } from '@iziwellpass/api/schemas';
import { VenueType } from '@iziwellpass/api/schemas';
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

const VENUE_TYPE_VALUES = Object.values(VenueType) as [VenueType, ...VenueType[]];

function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? `${fallback} (${err.code})` : fallback;
}

function venueTypeLabel(venueType: string): string {
  return venueType.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

const IS_ACTIVE_VALUES = ['active', 'inactive'] as const;

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  venue_type: z.enum(VENUE_TYPE_VALUES),
  description: z.string(),
  address_line: z.string(),
  city: z.string(),
  country: z.string(),
  phone: z.string(),
  timezone: z.string().min(1, 'Timezone is required'),
  is_active: z.enum(IS_ACTIVE_VALUES),
});

type ProfileValues = z.infer<typeof profileSchema>;

function venueToDefaults(venue: Venue): ProfileValues {
  return {
    name: venue.name,
    venue_type: venue.venue_type,
    description: venue.description ?? '',
    address_line: venue.address_line ?? '',
    city: venue.city,
    country: venue.country,
    phone: venue.phone ?? '',
    timezone: venue.timezone,
    is_active: venue.is_active ? 'active' : 'inactive',
  };
}

function ProfileSection({ venue, canEdit }: { venue: Venue; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const updateVenue = useUpdateVenue();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: venueToDefaults(venue),
  });

  // Re-sync the form when the underlying venue data changes (e.g. after a
  // successful save re-fetches getVenue).
  useEffect(() => {
    form.reset(venueToDefaults(venue));
  }, [venue, form]);

  const onSubmit = (values: ProfileValues) => {
    updateVenue.mutate(
      {
        id: venue.id,
        data: {
          name: values.name,
          venue_type: values.venue_type,
          description: values.description || null,
          address_line: values.address_line || null,
          city: values.city || null,
          country: values.country || null,
          phone: values.phone || null,
          timezone: values.timezone,
          is_active: values.is_active === 'active',
        },
      },
      {
        onSuccess: () => {
          toast.success('Venue profile updated');
          void queryClient.invalidateQueries({ queryKey: getGetVenueQueryKey(venue.id) });
          void queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() });
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to update venue'));
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venue_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VENUE_TYPE_VALUES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {venueTypeLabel(type)}
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
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address_line"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} />
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
            {/*
              Email is read-only here: `UpdateVenueRequest` has no `email`
              field, so there is no API contract to persist an edited value
              against (see packages/api/src/generated/endpoints.schemas.ts).
              Rendering it as an editable input would silently discard edits.
            */}
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" value={venue.email ?? ''} disabled readOnly />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEdit} placeholder="Africa/Lome" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/*
              `VenueSettings` (locale, timezone_override) is a nested object on
              `Venue` but is not part of `UpdateVenueRequest` — settings are
              read-only in the current API contract, so no editor is rendered
              here.
            */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
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
            {canEdit ? (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={updateVenue.isPending}>
                  {updateVenue.isPending ? 'Saving…' : 'Save changes'}
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
// Resource type inline creation
// ---------------------------------------------------------------------------

const resourceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  booking_mode: z.enum(['class', 'appointment', 'court_booking', 'open_access']),
  default_capacity: z.number('Must be a number').int().min(1, 'Must be at least 1'),
  default_duration_minutes: z.number('Must be a number').int().min(1, 'Must be at least 1'),
});

type ResourceTypeValues = z.infer<typeof resourceTypeSchema>;

function NewResourceTypeDialog({ onCreated }: { onCreated: (resourceType: ResourceType) => void }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createResourceType = useCreateResourceType();

  const form = useForm<ResourceTypeValues>({
    resolver: zodResolver(resourceTypeSchema),
    defaultValues: {
      name: '',
      booking_mode: 'class',
      default_capacity: 1,
      default_duration_minutes: 60,
    },
  });

  const onSubmit = (values: ResourceTypeValues) => {
    createResourceType.mutate(
      { data: values },
      {
        onSuccess: (response) => {
          const resourceType = unwrap(response);
          toast.success('Resource type created');
          void queryClient.invalidateQueries({ queryKey: getListResourceTypesQueryKey() });
          onCreated(resourceType);
          form.reset();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to create resource type'));
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
        <Button type="button" variant="outline" size="sm">
          New type
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New resource type</DialogTitle>
          <DialogDescription>
            Categories like &quot;Yoga Room&quot; or &quot;Tennis Court&quot; used across your
            tenant.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="booking_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking mode</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="court_booking">Court booking</SelectItem>
                      <SelectItem value="open_access">Open access</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createResourceType.isPending}>
                {createResourceType.isPending ? 'Creating…' : 'Create type'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add / edit resource dialog
// ---------------------------------------------------------------------------

const resourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  resource_type_id: z.string().min(1, 'Resource type is required'),
  capacity: z.number('Must be a number').int().min(1, 'Must be at least 1'),
  description: z.string(),
});

type ResourceValues = z.infer<typeof resourceSchema>;

function ResourceFormFields({
  form,
  resourceTypes,
}: {
  form: UseFormReturn<ResourceValues>;
  resourceTypes: ResourceType[];
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="resource_type_id"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Resource type</FormLabel>
              <NewResourceTypeDialog
                onCreated={(resourceType) => form.setValue('resource_type_id', resourceType.id)}
              />
            </div>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a resource type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {resourceTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
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
        name="capacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Capacity</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={Number.isNaN(field.value) ? '' : field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function AddResourceDialog({
  venueId,
  resourceTypes,
}: {
  venueId: string;
  resourceTypes: ResourceType[];
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createResource = useCreateResource();

  const form = useForm<ResourceValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: { name: '', resource_type_id: '', capacity: 1, description: '' },
  });

  const onSubmit = (values: ResourceValues) => {
    createResource.mutate(
      {
        id: venueId,
        data: {
          venue_id: venueId,
          name: values.name,
          resource_type_id: values.resource_type_id,
          capacity: values.capacity,
          description: values.description || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Resource added');
          void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
          form.reset();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to add resource'));
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
        <Button>Add resource</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
          <DialogDescription>A bookable unit within this venue.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <ResourceFormFields form={form} resourceTypes={resourceTypes} />
            <DialogFooter>
              <Button type="submit" disabled={createResource.isPending}>
                {createResource.isPending ? 'Adding…' : 'Add resource'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditResourceDialog({
  venueId,
  resource,
  resourceTypes,
  open,
  onOpenChange,
}: {
  venueId: string;
  resource: Resource;
  resourceTypes: ResourceType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const updateResource = useUpdateResource();

  const form = useForm<ResourceValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: resource.name,
      resource_type_id: resource.resource_type_id,
      capacity: resource.capacity,
      description: resource.description ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      name: resource.name,
      resource_type_id: resource.resource_type_id,
      capacity: resource.capacity,
      description: resource.description ?? '',
    });
  }, [resource, form]);

  const onSubmit = (values: ResourceValues) => {
    updateResource.mutate(
      {
        vid: venueId,
        rid: resource.id,
        data: {
          name: values.name,
          resource_type_id: values.resource_type_id,
          capacity: values.capacity,
          description: values.description || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Resource updated');
          void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to update resource'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <ResourceFormFields form={form} resourceTypes={resourceTypes} />
            <DialogFooter>
              <Button type="submit" disabled={updateResource.isPending}>
                {updateResource.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteResourceDialog({
  venueId,
  resource,
  open,
  onOpenChange,
}: {
  venueId: string;
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const deleteResource = useDeleteResource();

  const handleDelete = () => {
    deleteResource.mutate(
      { vid: venueId, rid: resource.id },
      {
        onSuccess: () => {
          toast.success('Resource deleted');
          void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to delete resource'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete resource</DialogTitle>
          <DialogDescription>
            This will permanently delete &quot;{resource.name}&quot;. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteResource.isPending}>
            {deleteResource.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Resources section
// ---------------------------------------------------------------------------

function ResourcesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const resourceTypesQuery = useListResourceTypes({ query: { select: unwrap } });
  const resourceTypes = useMemo(() => resourceTypesQuery.data ?? [], [resourceTypesQuery.data]);
  const resourceTypeById = useMemo(
    () => new Map(resourceTypes.map((type) => [type.id, type])),
    [resourceTypes],
  );

  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resources</CardTitle>
        {canEdit ? <AddResourceDialog venueId={venueId} resourceTypes={resourceTypes} /> : null}
      </CardHeader>
      <CardContent>
        {resourcesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : resourcesQuery.isError ? (
          <p className="text-sm text-destructive">
            {apiErrorMessage(resourcesQuery.error, 'Failed to load resources')}
          </p>
        ) : (resourcesQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">No resources yet.</p>
            {canEdit ? <AddResourceDialog venueId={venueId} resourceTypes={resourceTypes} /> : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                {canEdit ? <TableHead className="w-px">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resourcesQuery.data ?? []).map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.name}</TableCell>
                  <TableCell>
                    {resourceTypeById.get(resource.resource_type_id)?.name ?? 'Unknown'}
                  </TableCell>
                  <TableCell>{resource.capacity}</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingResource(resource)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeletingResource(resource)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editingResource ? (
        <EditResourceDialog
          venueId={venueId}
          resource={editingResource}
          resourceTypes={resourceTypes}
          open={!!editingResource}
          onOpenChange={(open) => {
            if (!open) {
              setEditingResource(null);
            }
          }}
        />
      ) : null}
      {deletingResource ? (
        <DeleteResourceDialog
          venueId={venueId}
          resource={deletingResource}
          open={!!deletingResource}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingResource(null);
            }
          }}
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VenueDetailPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';

  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });

  if (venueQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (venueQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {apiErrorMessage(venueQuery.error, 'Failed to load venue')}
      </p>
    );
  }

  const venue = venueQuery.data;
  if (!venue) {
    return <p className="text-sm text-muted-foreground">Venue not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{venue.name}</h1>
        <Badge variant="outline" className="capitalize">
          {venueTypeLabel(venue.venue_type)}
        </Badge>
      </div>
      <ProfileSection venue={venue} canEdit={canEdit} />
      <ResourcesSection venueId={venue.id} canEdit={canEdit} />
    </div>
  );
}
