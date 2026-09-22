'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListResourcesQueryKey,
  getListResourceTypesQueryKey,
  useCreateResource,
  useCreateResourceType,
  useDeleteResource,
  useUpdateResource,
} from '@iziwellpass/api/generated';
import type { BookingMode, Resource, ResourceType, Schedule } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
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
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { usePlanningLabels } from '@/app/(app)/schedules/planning-utils';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { activeSchedulesUsing, isResourceInUse } from '@/lib/resource-in-use';

export const BOOKING_MODE_VALUES = [
  'class',
  'appointment',
  'court_booking',
  'open_access',
] as const satisfies readonly BookingMode[];

// ---------------------------------------------------------------------------
// Resource type inline creation
// ---------------------------------------------------------------------------

export function NewResourceTypeDialog({
  onCreated,
}: {
  onCreated?: (resourceType: ResourceType) => void;
}) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
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
          onCreated?.(resourceType);
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
        <Button type="button" variant="ghost" size="sm">
          {t('detail.resources.typeDialog.add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('detail.resources.typeDialog.title')}</DialogTitle>
          <DialogDescription>{t('detail.resources.typeDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-[18px]"
          >
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
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
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

export function useResourceSchema() {
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

export type ResourceValues = {
  name: string;
  resource_type_id: string;
  capacity: number;
  description: string;
};

export function ResourceFormFields({
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
            <FormLabel>{t('detail.resources.form.type')}</FormLabel>
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
              <Textarea className="min-h-24" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function AddResourceDialog({
  venueId,
  resourceTypes,
  variant = 'default',
  size = 'sm',
  className,
}: {
  venueId: string;
  resourceTypes: ResourceType[];
  variant?: 'default' | 'secondary';
  size?: 'default' | 'sm';
  className?: string;
}) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
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
        <Button variant={variant} size={size} className={className}>
          <PlusIcon />
          {t('detail.resources.add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('detail.resources.addDialog.title')}</DialogTitle>
          <DialogDescription>{t('detail.resources.addDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-[18px]"
          >
            <ResourceFormFields form={form} resourceTypes={resourceTypes} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
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

export function EditResourceDialog({
  venueId,
  resource,
  resourceTypes,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  venueId: string;
  resource: Resource;
  resourceTypes: ResourceType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset(toDefaults(resource));
      }}
    >
      <DialogContent className="sm:max-w-[520px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('detail.resources.editDialog.title')}</DialogTitle>
          <DialogDescription>{t('detail.resources.editDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-[18px]"
          >
            <ResourceFormFields form={form} resourceTypes={resourceTypes} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
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

export function DeleteResourceDialog({
  venueId,
  resource,
  schedules,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  venueId: string;
  resource: Resource;
  schedules: Schedule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const deleteResource = useDeleteResource();
  const [blocked, setBlocked] = useState(false);
  const { formatRecurrence } = usePlanningLabels();
  const inUse = useMemo(
    () => activeSchedulesUsing(schedules, resource.id),
    [schedules, resource.id],
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) setBlocked(false);
    onOpenChange(next);
  };

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
          if (isResourceInUse(err)) {
            setBlocked(true);
            return;
          }
          toast.error(apiErrorMessage(err, t('detail.resources.deleteDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('detail.resources.deleteDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.resources.deleteDialog.description', { name: resource.name })}
          </DialogDescription>
        </DialogHeader>
        {blocked ? (
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertDescription>
              <p>{t('detail.resources.deleteDialog.inUse.message')}</p>
              {inUse.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {inUse.map((s) => (
                    <li key={s.id}>
                      · {s.title} · {formatRecurrence(s.recurrence_rule)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          {blocked ? (
            <>
              <DialogClose asChild>
                <Button variant="ghost">{t('detail.resources.deleteDialog.inUse.close')}</Button>
              </DialogClose>
              <Button asChild variant="outline">
                <Link href="/schedules">
                  {t('detail.resources.deleteDialog.inUse.viewCourses')}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="ghost">{tCommon('cancel')}</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteResource.isPending}
              >
                {deleteResource.isPending
                  ? t('detail.resources.deleteDialog.confirming')
                  : t('detail.resources.deleteDialog.confirm')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
