'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListSubscriptionsQueryKey,
  useAssignSubscription,
  useListPlans,
} from '@iziwellpass/api/generated';
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
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Switch } from '@iziwellpass/ui/components/switch';

import { apiErrorMessage } from '@/lib/api-error';
import { venueToday } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { useVenueContext } from '@/lib/venue-context';

/**
 * Assign a venue's plan to a member.
 *
 * The venue picker offers every venue the caller can see, not just the ones
 * this member may enter: `Member` carries no `venue_ids` and there is no read
 * endpoint for member entitlements. The API rejects a mismatch with
 * `403 "the member is not entitled to the plan's venue"`, which surfaces as a
 * toast — see the backend asks in docs/backend-issues.md.
 */
export function AssignSubscriptionDialog({ memberId }: { memberId: string }) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const assign = useAssignSubscription();

  const { venues, selectedVenueId } = useVenueContext();
  const [venueId, setVenueId] = useState<string>(selectedVenueId ?? '');
  const [planId, setPlanId] = useState<string>('');
  const [paid, setPaid] = useState(true);

  const venue = venues.find((v) => v.id === venueId);
  const [startsOn, setStartsOn] = useState<string>(() => venueToday(undefined));

  // Only active plans can be sold; archived ones stay visible on existing rows.
  const plansQuery = useListPlans(
    venueId,
    { include_archived: false },
    { query: { select: unwrap, enabled: venueId !== '' } },
  );
  const plans = plansQuery.data ?? [];

  // Changing venue invalidates the chosen plan, and re-anchors the start date
  // to the new venue's local today.
  useEffect(() => {
    setPlanId('');
    if (venue) {
      setStartsOn(venueToday(venue.timezone));
    }
  }, [venueId, venue]);

  const onSubmit = () => {
    assign.mutate(
      {
        mid: memberId,
        data: {
          plan_id: planId,
          // The date input can be cleared; `starts_on` is optional and the API
          // defaults it to today, so omit it rather than posting "" into a 400.
          starts_on: startsOn || undefined,
          payment_status: paid ? 'paid' : 'unpaid',
        },
      },
      {
        onSuccess: () => {
          toast.success(t('detail.subscriptions.assignDialog.success'));
          void queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(memberId),
          });
          setPlanId('');
          setOpen(false);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.subscriptions.assignDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <PlusIcon />
          {t('detail.subscriptions.assign')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('detail.subscriptions.assignDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.subscriptions.assignDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="assign-venue">{t('detail.subscriptions.assignDialog.venue')}</Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger id="assign-venue" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assign-plan">{t('detail.subscriptions.assignDialog.plan')}</Label>
            {venueId !== '' && !plansQuery.isLoading && plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('detail.subscriptions.assignDialog.noPlans')}
              </p>
            ) : (
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="assign-plan" className="w-full">
                  <SelectValue
                    placeholder={t('detail.subscriptions.assignDialog.planPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} —{' '}
                      {formatMoney(plan.price_amount_minor, plan.price_currency, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assign-start">{t('detail.subscriptions.assignDialog.startsOn')}</Label>
            <Input
              id="assign-start"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-paid" className="text-base font-medium">
                {t('detail.subscriptions.assignDialog.paid')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('detail.subscriptions.assignDialog.paidHint')}
              </p>
            </div>
            <Switch id="assign-paid" checked={paid} onCheckedChange={setPaid} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button onClick={onSubmit} disabled={planId === '' || assign.isPending}>
            {assign.isPending
              ? t('detail.subscriptions.assignDialog.submitting')
              : t('detail.subscriptions.assignDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
