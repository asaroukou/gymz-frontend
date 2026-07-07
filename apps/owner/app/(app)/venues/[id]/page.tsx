'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
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
import type { BookingMode, Resource, ResourceType, Venue } from '@iziwellpass/api/schemas';
import { VenueType } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
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
  Empty,
  EmptyContent,
  EmptyDescription,
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
import { Switch } from '@iziwellpass/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Textarea } from '@iziwellpass/ui/components/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

const VENUE_TYPE_VALUES = Object.values(VenueType) as [VenueType, ...VenueType[]];
const BOOKING_MODE_VALUES = [
  'class',
  'appointment',
  'court_booking',
  'open_access',
] as const satisfies readonly BookingMode[];

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

function ProfileSection({ venue, canEdit }: { venue: Venue; canEdit: boolean }) {
  const t = useTranslations('venues');
  const queryClient = useQueryClient();
  const updateVenue = useUpdateVenue();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('detail.profile.nameRequired')),
        venue_type: z.enum(VENUE_TYPE_VALUES),
        description: z.string(),
        address_line: z.string(),
        city: z.string(),
        country: z.string(),
        phone: z.string(),
        timezone: z.string().min(1, t('detail.profile.timezoneRequired')),
        is_active: z.boolean(),
      }),
    [t],
  );

  type ProfileValues = z.infer<typeof schema>;

  const toDefaults = (v: Venue): ProfileValues => ({
    name: v.name,
    venue_type: v.venue_type,
    description: v.description ?? '',
    address_line: v.address_line ?? '',
    city: v.city,
    country: v.country,
    phone: v.phone ?? '',
    timezone: v.timezone,
    is_active: v.is_active,
  });

  const form = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(venue),
  });

  // Re-sync the form when the underlying venue data changes (e.g. after a
  // successful save re-fetches getVenue).
  useEffect(() => {
    form.reset(toDefaults(venue));
  }, [venue, form]);

  const onSubmit = (values: ProfileValues) => {
    // `UpdateVenueRequest` accepts only these fields — `email` and `settings`
    // (locale/timezone_override) are read-only in the contract and are
    // deliberately not sent here.
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
          is_active: values.is_active,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('detail.profile.success'));
          void queryClient.invalidateQueries({ queryKey: getGetVenueQueryKey(venue.id) });
          void queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.profile.error')));
          }
        },
      },
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{t('detail.profile.title')}</CardTitle>
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
                  <FormLabel>{t('detail.profile.name')}</FormLabel>
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
                  <FormLabel>{t('detail.profile.type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VENUE_TYPE_VALUES.map((type) => (
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
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t('detail.profile.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={!canEdit} />
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
                  <FormLabel>{t('detail.profile.address')}</FormLabel>
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
                  <FormLabel>{t('detail.profile.city')}</FormLabel>
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
                  <FormLabel>{t('detail.profile.country')}</FormLabel>
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
                  <FormLabel>{t('detail.profile.phone')}</FormLabel>
                  <FormControl>
                    <Input inputMode="tel" {...field} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/*
              Email is read-only: `UpdateVenueRequest` has no `email` field, so
              there is no contract to persist an edited value against. Rendered
              disabled with a "editable soon" tooltip rather than an editable
              input that would silently discard edits.
            */}
            <FormItem>
              <FormLabel>{t('detail.profile.email')}</FormLabel>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block">
                    <Input
                      type="email"
                      value={venue.email ?? ''}
                      disabled
                      readOnly
                      className="pointer-events-none"
                      aria-label={t('detail.profile.email')}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('detail.profile.emailReadOnly')}</TooltipContent>
              </Tooltip>
            </FormItem>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t('detail.profile.timezone')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={!canEdit}
                      placeholder={t('detail.profile.timezonePlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/*
              `VenueSettings` (locale, timezone_override) is a nested object on
              `Venue` but is not part of `UpdateVenueRequest` — settings are
              read-only in the current contract, so no editor is rendered here.
            */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border p-4 sm:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel>{t('detail.profile.active')}</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {t('detail.profile.activeHint')}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canEdit}
                      aria-label={t('detail.profile.active')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {canEdit ? (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={updateVenue.isPending}>
                  {updateVenue.isPending ? t('detail.profile.saving') : t('detail.profile.save')}
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

function NewResourceTypeDialog({ onCreated }: { onCreated: (resourceType: ResourceType) => void }) {
  const t = useTranslations('venues');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createResourceType = useCreateResourceType();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('detail.resources.typeDialog.nameRequired')),
        booking_mode: z.enum(BOOKING_MODE_VALUES),
        default_capacity: z
          .number(t('detail.resources.typeDialog.number'))
          .int()
          .min(1, t('detail.resources.typeDialog.min')),
        default_duration_minutes: z
          .number(t('detail.resources.typeDialog.number'))
          .int()
          .min(1, t('detail.resources.typeDialog.min')),
      }),
    [t],
  );

  type ResourceTypeValues = z.infer<typeof schema>;

  const defaults: ResourceTypeValues = {
    name: '',
    booking_mode: 'class',
    default_capacity: 1,
    default_duration_minutes: 60,
  };

  const form = useForm<ResourceTypeValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const onSubmit = (values: ResourceTypeValues) => {
    createResourceType.mutate(
      { data: values },
      {
        onSuccess: (response) => {
          const resourceType = unwrap(response);
          toast.success(t('detail.resources.typeDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListResourceTypesQueryKey() });
          onCreated(resourceType);
          form.reset(defaults);
          setOpen(false);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.resources.typeDialog.error')));
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
        <Button type="button" variant="outline" size="sm">
          {t('detail.resources.typeDialog.add')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.resources.typeDialog.title')}</DialogTitle>
          <DialogDescription>{t('detail.resources.typeDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('detail.resources.typeDialog.name')}</FormLabel>
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
                  <FormLabel>{t('detail.resources.typeDialog.bookingMode')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BOOKING_MODE_VALUES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {t(`detail.resources.typeDialog.mode.${mode}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="default_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('detail.resources.typeDialog.defaultCapacity')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="font-mono"
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
                    <FormLabel>{t('detail.resources.typeDialog.defaultDuration')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="font-mono"
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
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createResourceType.isPending}>
                {createResourceType.isPending
                  ? t('detail.resources.typeDialog.submitting')
                  : t('detail.resources.typeDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add / edit resource dialogs
// ---------------------------------------------------------------------------

function useResourceSchema() {
  const t = useTranslations('venues');
  return useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('detail.resources.form.nameRequired')),
        resource_type_id: z.string().min(1, t('detail.resources.form.typeRequired')),
        capacity: z
          .number(t('detail.resources.form.number'))
          .int()
          .min(1, t('detail.resources.form.min')),
        description: z.string(),
      }),
    [t],
  );
}

type ResourceValues = {
  name: string;
  resource_type_id: string;
  capacity: number;
  description: string;
};

function ResourceFormFields({
  form,
  resourceTypes,
}: {
  form: UseFormReturn<ResourceValues>;
  resourceTypes: ResourceType[];
}) {
  const t = useTranslations('venues');
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.resources.form.name')}</FormLabel>
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
            <div className="flex items-center justify-between gap-2">
              <FormLabel>{t('detail.resources.form.type')}</FormLabel>
              <NewResourceTypeDialog
                onCreated={(resourceType) => form.setValue('resource_type_id', resourceType.id)}
              />
            </div>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('detail.resources.form.typePlaceholder')} />
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
            <FormLabel>{t('detail.resources.form.capacity')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                className="font-mono"
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
            <FormLabel>{t('detail.resources.form.description')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
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
  const t = useTranslations('venues');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createResource = useCreateResource();
  const schema = useResourceSchema();

  const defaults: ResourceValues = { name: '', resource_type_id: '', capacity: 1, description: '' };

  const form = useForm<ResourceValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
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
          toast.success(t('detail.resources.addDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
          form.reset(defaults);
          setOpen(false);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.resources.addDialog.error')));
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
        <Button>
          <PlusIcon />
          {t('detail.resources.add')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.resources.addDialog.title')}</DialogTitle>
          <DialogDescription>{t('detail.resources.addDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <ResourceFormFields form={form} resourceTypes={resourceTypes} />
            <DialogFooter>
              <Button type="submit" disabled={createResource.isPending}>
                {createResource.isPending
                  ? t('detail.resources.addDialog.submitting')
                  : t('detail.resources.addDialog.submit')}
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
  const t = useTranslations('venues');
  const queryClient = useQueryClient();
  const updateResource = useUpdateResource();
  const schema = useResourceSchema();

  const toDefaults = (r: Resource): ResourceValues => ({
    name: r.name,
    resource_type_id: r.resource_type_id,
    capacity: r.capacity,
    description: r.description ?? '',
  });

  const form = useForm<ResourceValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(resource),
  });

  useEffect(() => {
    form.reset(toDefaults(resource));
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
          toast.success(t('detail.resources.editDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.resources.editDialog.error')));
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.resources.editDialog.title')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <ResourceFormFields form={form} resourceTypes={resourceTypes} />
            <DialogFooter>
              <Button type="submit" disabled={updateResource.isPending}>
                {updateResource.isPending
                  ? t('detail.resources.editDialog.saving')
                  : t('detail.resources.editDialog.save')}
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
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const deleteResource = useDeleteResource();

  const handleDelete = () => {
    deleteResource.mutate(
      { vid: venueId, rid: resource.id },
      {
        onSuccess: () => {
          toast.success(t('detail.resources.deleteDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('detail.resources.deleteDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.resources.deleteDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.resources.deleteDialog.description', { name: resource.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteResource.isPending}>
            {deleteResource.isPending
              ? t('detail.resources.deleteDialog.confirming')
              : t('detail.resources.deleteDialog.confirm')}
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
  const t = useTranslations('venues');
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const resourceTypesQuery = useListResourceTypes({ query: { select: unwrap } });
  const resourceTypes = useMemo(() => resourceTypesQuery.data ?? [], [resourceTypesQuery.data]);
  const resourceTypeById = useMemo(
    () => new Map(resourceTypes.map((type) => [type.id, type])),
    [resourceTypes],
  );
  const resources = resourcesQuery.data ?? [];

  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t('detail.resources.title')}</CardTitle>
        {canEdit && resources.length > 0 ? (
          <AddResourceDialog venueId={venueId} resourceTypes={resourceTypes} />
        ) : null}
      </CardHeader>
      <CardContent>
        {resourcesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : resourcesQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(resourcesQuery.error, t('detail.resources.loadError'))}
            </AlertDescription>
          </Alert>
        ) : resources.length === 0 ? (
          <Empty>
            <EmptyTitle>{t('detail.resources.empty.title')}</EmptyTitle>
            <EmptyDescription>{t('detail.resources.empty.body')}</EmptyDescription>
            {canEdit ? (
              <EmptyContent>
                <AddResourceDialog venueId={venueId} resourceTypes={resourceTypes} />
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detail.resources.columns.name')}</TableHead>
                <TableHead>{t('detail.resources.columns.type')}</TableHead>
                <TableHead>{t('detail.resources.columns.capacity')}</TableHead>
                {canEdit ? (
                  <TableHead className="w-0 text-right">
                    <span className="sr-only">{t('detail.resources.columns.actions')}</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {resourceTypeById.get(resource.resource_type_id)?.name ??
                      t('detail.resources.unknownType')}
                  </TableCell>
                  <TableCell className="font-mono">{resource.capacity}</TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('detail.resources.row.menu')}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingResource(resource)}>
                            <PencilIcon />
                            {t('detail.resources.row.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeletingResource(resource)}
                          >
                            <Trash2Icon />
                            {t('detail.resources.row.delete')}
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
          open={editingResource !== null}
          onOpenChange={(next) => {
            if (!next) setEditingResource(null);
          }}
        />
      ) : null}
      {deletingResource ? (
        <DeleteResourceDialog
          venueId={venueId}
          resource={deletingResource}
          open={deletingResource !== null}
          onOpenChange={(next) => {
            if (!next) setDeletingResource(null);
          }}
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function VenueDetailContent() {
  const t = useTranslations('venues');
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';

  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });

  const backLink = (
    <Link
      href="/venues"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      {t('detail.back')}
    </Link>
  );

  if (venueQuery.isLoading) {
    return (
      <div className="space-y-6">
        {backLink}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (venueQuery.isError) {
    return (
      <div className="space-y-6">
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(venueQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const venue = venueQuery.data;
  if (!venue) {
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{venue.name}</h1>
        <Badge variant="outline">{t(`type.${venue.venue_type}`)}</Badge>
        <Badge variant={venue.is_active ? 'success' : 'secondary'}>
          {venue.is_active ? t('status.active') : t('status.inactive')}
        </Badge>
      </div>
      <ProfileSection venue={venue} canEdit={canEdit} />
      <ResourcesSection venueId={venue.id} canEdit={canEdit} />
    </div>
  );
}

export default function VenueDetailPage() {
  return (
    <RequirePageAccess href="/venues">
      <VenueDetailContent />
    </RequirePageAccess>
  );
}
