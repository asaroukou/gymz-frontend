'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getListPlansQueryKey, useCreatePlan, useUpdatePlan } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
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
import { Switch } from '@iziwellpass/ui/components/switch';

import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import type { PlanFormValues } from '@/lib/plan-form';
import {
  buildPlanSchema,
  CURRENCY_VALUES,
  PLAN_KIND_VALUES,
  planToFormValues,
  toCreatePlanRequest,
  toUpdatePlanRequest,
} from '@/lib/plan-form';

const emptyPlan: PlanFormValues = {
  name: '',
  kind: 'subscription',
  price_major: '',
  price_currency: 'XOF',
  duration_days: '',
  entry_count: '',
  all_activities: true,
  activities: [],
};

/** A value the API cannot update: label above, current value as plain text. */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-base text-muted-foreground">{value}</p>
    </div>
  );
}

/**
 * One dialog, two modes. `UpdatePlanRequest` carries only name, price,
 * activities and is_active, so in edit mode `kind`, `duration_days` and
 * `entry_count` render as static text: an editable input whose value
 * `toUpdatePlanRequest` silently drops — behind a « Offre modifiée » toast —
 * would let an owner believe they had repriced a 60-day plan that is still 30.
 * All three stay editable in create mode, where the API does accept them.
 */
export function PlanDialog({
  venueId,
  venueActivities,
  plan,
}: {
  venueId: string;
  venueActivities: string[];
  plan?: ActivityPlan;
}) {
  const t = useTranslations('plans');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const activityLabel = useActivityTypeLabel();
  const isEdit = plan !== undefined;

  const schema = useMemo(
    () =>
      buildPlanSchema({
        nameRequired: t('validation.nameRequired'),
        priceInvalid: t('validation.priceInvalid'),
        durationRequired: t('validation.durationRequired'),
        entriesRequired: t('validation.entriesRequired'),
        activitiesRequired: t('validation.activitiesRequired'),
      }),
    [t],
  );

  const defaults = useMemo(() => (plan ? planToFormValues(plan) : emptyPlan), [plan]);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const kind = form.watch('kind');
  const durationDays = form.watch('duration_days');
  const entryCount = form.watch('entry_count');
  const allActivities = form.watch('all_activities');
  const pending = createPlan.isPending || updatePlan.isPending;

  const onDone = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: getListPlansQueryKey(venueId) });
    setOpen(false);
  };

  const onError = (err: unknown, fallback: string) => {
    if (!applyFieldErrors(form, err)) {
      toast.error(apiErrorMessage(err, fallback));
    }
  };

  const onSubmit = (values: PlanFormValues) => {
    if (plan) {
      updatePlan.mutate(
        { id: venueId, planId: plan.id, data: toUpdatePlanRequest(values) },
        {
          onSuccess: () => onDone(t('dialog.editSuccess')),
          onError: (err) => onError(err, t('dialog.editError')),
        },
      );
      return;
    }
    createPlan.mutate(
      { id: venueId, data: toCreatePlanRequest(values) },
      {
        onSuccess: () => onDone(t('dialog.createSuccess')),
        onError: (err) => onError(err, t('dialog.createError')),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset on both transitions: on open, so a stale form (from a prior
        // edit whose invalidation hadn't resolved yet when the dialog closed)
        // picks up the latest `plan` prop; on close, to discard unsaved input.
        form.reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={isEdit ? 'ghost' : 'default'} size={isEdit ? 'sm' : 'default'}>
          {isEdit ? null : <PlusIcon />}
          {isEdit ? t('edit') : t('add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('dialog.editTitle') : t('dialog.createTitle')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-[18px]">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEdit ? (
                <ReadOnlyField label={t('dialog.kind')} value={t(`kind.${kind}`)} />
              ) : (
                <FormField
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.kind')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLAN_KIND_VALUES.map((k) => (
                            <SelectItem key={k} value={k}>
                              {t(`kind.${k}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price_major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.price')}</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.currency')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCY_VALUES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* An entry_pack may also carry a duration as an expiry, so the
                  duration stays visible for both kinds. Both are read-only in
                  edit mode — the update endpoint does not accept them. */}
              {kind === 'entry_pack' ? (
                isEdit ? (
                  <ReadOnlyField label={t('dialog.entries')} value={entryCount || '—'} />
                ) : (
                  <FormField
                    control={form.control}
                    name="entry_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dialog.entries')}</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )
              ) : null}

              {isEdit ? (
                <ReadOnlyField label={t('dialog.duration')} value={durationDays || '—'} />
              ) : (
                <FormField
                  control={form.control}
                  name="duration_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.duration')}</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="all_activities"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <FormLabel className="text-base font-medium">
                        {t('dialog.allActivities')}
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t('dialog.allActivitiesHint')}
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {allActivities ? null : (
                <FormField
                  control={form.control}
                  name="activities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dialog.activities')}</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {venueActivities.map((activity) => {
                          const selected = field.value.includes(activity);
                          return (
                            <Button
                              key={activity}
                              type="button"
                              size="sm"
                              variant={selected ? 'default' : 'outline'}
                              onClick={() =>
                                field.onChange(
                                  selected
                                    ? field.value.filter((a) => a !== activity)
                                    : [...field.value, activity],
                                )
                              }
                            >
                              {activityLabel(activity)}
                            </Button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? t('dialog.submitting') : t('dialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
