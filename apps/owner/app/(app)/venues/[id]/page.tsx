'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListResourcesQueryKey,
  getListResourceTypesQueryKey,
  getListVenueActivitiesQueryKey,
  useAddVenueActivity,
  useCreateResource,
  useCreateResourceType,
  useDeleteResource,
  useGetVenue,
  useListResources,
  useListResourceTypes,
  useListVenueActivities,
  useRemoveVenueActivity,
  useUpdateResource,
} from '@iziwellpass/api/generated';
import type { BookingMode, Resource, ResourceType, VenueActivity } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Combobox } from '@iziwellpass/ui/components/combobox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Textarea } from '@iziwellpass/ui/components/textarea';
import { BackLink, WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import {
  ACTIVITY_TYPE_VALUES,
  useActivityTypeLabel,
  useActivityTypeOptions,
} from '@/lib/activity-type';
import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { ProfileSection } from './profile-section';

const BOOKING_MODE_VALUES = [
  'class',
  'appointment',
  'court_booking',
  'open_access',
] as const satisfies readonly BookingMode[];

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
                        className="font-numeric"
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
                        className="font-numeric"
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
                onCreated={(resourceType) =>
                  form.setValue('resource_type_id', resourceType.id, { shouldValidate: true })
                }
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
                className="font-numeric"
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
          <DialogDescription>{t('detail.resources.editDialog.description')}</DialogDescription>
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
    <Card>
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
                  <TableCell className="font-numeric">{resource.capacity}</TableCell>
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
// Activities section
// ---------------------------------------------------------------------------

function ActivitiesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const activityLabel = useActivityTypeLabel();
  const allOptions = useActivityTypeOptions();

  const activitiesQuery = useListVenueActivities(venueId, { query: { select: unwrap } });
  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const present = useMemo(
    () => new Set(activities.map((a: VenueActivity) => a.activity_type)),
    [activities],
  );
  const options = useMemo(
    () => allOptions.filter((o) => !present.has(o.value as (typeof ACTIVITY_TYPE_VALUES)[number])),
    [allOptions, present],
  );

  const addActivity = useAddVenueActivity();
  const removeActivity = useRemoveVenueActivity();
  const [removing, setRemoving] = useState<VenueActivity | null>(null);

  // Adding/removing an activity seeds/deactivates resource types on the backend.
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: getListVenueActivitiesQueryKey(venueId) });
    void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
    void queryClient.invalidateQueries({ queryKey: getListResourceTypesQueryKey() });
  };

  const handleAdd = (value: string) => {
    addActivity.mutate(
      { id: venueId, data: { activity_type: value as (typeof ACTIVITY_TYPE_VALUES)[number] } },
      {
        onSuccess: invalidateAll,
        onError: (err) => toast.error(apiErrorMessage(err, t('detail.activities.addError'))),
      },
    );
  };

  const handleRemove = () => {
    if (!removing) return;
    removeActivity.mutate(
      { id: venueId, activity: removing.activity_type },
      {
        onSuccess: () => {
          invalidateAll();
          setRemoving(null);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.activities.removeConfirm.error'))),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.activities.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('detail.activities.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {activitiesQuery.isLoading ? (
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        ) : activitiesQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(activitiesQuery.error, t('detail.activities.loadError'))}
            </AlertDescription>
          </Alert>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detail.activities.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activities.map((activity: VenueActivity) => (
              <Badge key={activity.id} variant="secondary" className="gap-1.5 py-1 pr-1 pl-3">
                {activityLabel(activity.activity_type)}
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={t('detail.activities.removeConfirm.title')}
                    onClick={() => setRemoving(activity)}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <XIcon className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        )}

        {canEdit && !activitiesQuery.isLoading && !activitiesQuery.isError ? (
          options.length > 0 ? (
            <div className="max-w-xs">
              <Combobox
                options={options}
                value=""
                onValueChange={handleAdd}
                placeholder={t('detail.activities.add')}
                searchPlaceholder={t('detail.activities.searchPlaceholder')}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('detail.activities.allAdded')}</p>
          )
        ) : null}
      </CardContent>

      <Dialog open={removing !== null} onOpenChange={(next) => !next && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.activities.removeConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('detail.activities.removeConfirm.description', {
                activity: removing ? activityLabel(removing.activity_type) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeActivity.isPending}
            >
              {removeActivity.isPending
                ? t('detail.activities.removeConfirm.confirming')
                : t('detail.activities.removeConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function VenueDetailContent() {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';
  const { setSelectedVenueId } = useVenueContext();

  // Unified venue context: opening a venue's detail page makes it the current
  // venue, so the shell switcher reflects the route (route -> context).
  useEffect(() => {
    if (venueId) {
      setSelectedVenueId(venueId);
    }
  }, [venueId, setSelectedVenueId]);

  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });

  const backLink = (
    <BackLink href="/venues" linkComponent={Link}>
      {t('detail.back')}
    </BackLink>
  );

  if (venueQuery.isLoading) {
    return (
      <WorkingPage>
        {backLink}
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkingPage>
    );
  }

  if (venueQuery.isError) {
    return (
      <WorkingPage>
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(venueQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </WorkingPage>
    );
  }

  const venue = venueQuery.data;
  if (!venue) {
    return (
      <WorkingPage>
        {backLink}
        <p className="text-base text-muted-foreground">{t('detail.notFound')}</p>
      </WorkingPage>
    );
  }

  const subtitle = [venue.address_line, venue.city].filter(Boolean).join(', ') || t('noAddress');

  return (
    <WorkingPage>
      {backLink}
      <WorkingHeader
        title={venue.name}
        subtitle={subtitle}
        badges={
          <>
            <Badge variant={venue.is_active ? 'success' : 'default'}>
              {venue.is_active ? t('status.active') : t('status.inactive')}
            </Badge>
            <Badge>{activityLabel(venue.venue_type)}</Badge>
          </>
        }
      />
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <ProfileSection venue={venue} canEdit={canEdit} />
        <div className="flex flex-col gap-10">
          <ActivitiesSection venueId={venue.id} canEdit={canEdit} />
          <ResourcesSection venueId={venue.id} canEdit={canEdit} />
        </div>
      </div>
    </WorkingPage>
  );
}

export default function VenueDetailPage() {
  return (
    <RequirePageAccess href="/venues">
      <VenueDetailContent />
    </RequirePageAccess>
  );
}
