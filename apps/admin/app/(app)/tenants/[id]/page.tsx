'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import { useGetTenant, useTenantBilling, useTenantUsage } from '@iziwellpass/api/generated';
import type { TenantSummary } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';

import { apiErrorMessage } from '@/lib/api-error';
import { isForbidden, planBadgeVariant, statusBadgeVariant } from '@/lib/tenants';
import { defaultUsageRange } from '@/lib/usage-range';

import { TenantActions } from './tenant-actions';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('tenant');
  const tTenants = useTranslations('tenants');
  const [range, setRange] = useState(() => defaultUsageRange());
  const [draft, setDraft] = useState(range);

  const tenantQuery = useGetTenant(id, { query: { select: unwrap } });
  const usageQuery = useTenantUsage(id, range, { query: { select: unwrap } });
  const billingQuery = useTenantBilling(id, { query: { select: unwrap } });

  if (tenantQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isForbidden(tenantQuery.error)) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>{tTenants('forbiddenTitle')}</AlertTitle>
          <AlertDescription>{tTenants('forbiddenBody')}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/">{t('backToList')}</Link>
        </Button>
      </div>
    );
  }

  if (tenantQuery.isError || !tenantQuery.data) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>{t('notFoundTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(tenantQuery.error, t('notFoundBody'))}
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/">{t('backToList')}</Link>
        </Button>
      </div>
    );
  }

  // Explicit TenantSummary boundary for Task 5's <TenantActions tenant={tenant} />.
  const tenant: TenantSummary = tenantQuery.data;

  const copyTenantId = () => {
    // `navigator.clipboard` is undefined in insecure contexts (http on a LAN
    // IP); calling writeText() there throws synchronously and would send the
    // page to the error boundary on a click, so guard its existence first.
    if (!navigator.clipboard) {
      toast.error(t('copyIdError'));
      return;
    }
    navigator.clipboard.writeText(tenant.id).then(
      () => toast.success(t('copyIdSuccess')),
      () => toast.error(t('copyIdError')),
    );
  };

  const usage = usageQuery.isError ? undefined : usageQuery.data;
  // `billing` is a nullable field on a *successful* response (a tenant can have
  // no billing record yet), distinct from a real fetch error — both degrade to
  // the same "no billing" message per the brief.
  const billing =
    billingQuery.isError || !billingQuery.data
      ? undefined
      : (billingQuery.data.billing ?? undefined);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-normal">{tenant.name}</h1>
          <Badge variant={planBadgeVariant(tenant.plan)}>{t(`plan.${tenant.plan}`)}</Badge>
          <Badge variant={statusBadgeVariant(tenant.status)}>{t(`status.${tenant.status}`)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {tenant.slug} ·{' '}
          <button
            type="button"
            className="underline decoration-dotted underline-offset-2"
            onClick={copyTenantId}
            title={t('copyId')}
          >
            {tenant.id}
          </button>{' '}
          · {t('createdOn', { date: dateFmt.format(new Date(tenant.created_at)) })}
        </p>
      </div>

      {tenant.status === 'purged' ? (
        <Alert>
          <AlertTitle>{t('purgedTitle')}</AlertTitle>
          <AlertDescription>{t('purgedBody')}</AlertDescription>
        </Alert>
      ) : null}

      <TenantActions tenant={tenant} />

      <Card>
        <CardHeader>
          <CardTitle>{t('usageTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setRange(draft);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="usage-from">{t('usageFrom')}</Label>
              <Input
                id="usage-from"
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="usage-to">{t('usageTo')}</Label>
              <Input
                id="usage-to"
                type="date"
                value={draft.to}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              />
            </div>
            <Button type="submit" variant="outline" disabled={!draft.from || !draft.to}>
              {t('usageApply')}
            </Button>
          </form>

          {usageQuery.isError ? (
            <p className="text-sm text-destructive">
              {apiErrorMessage(usageQuery.error, t('usageError'))}
            </p>
          ) : (
            <StatPanel className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label={t('usageVenues')}
                isLoading={usageQuery.isLoading}
                value={usage ? String(usage.active_venues) : null}
              />
              <Stat
                label={t('usageCheckins')}
                isLoading={usageQuery.isLoading}
                value={usage ? String(usage.checkins) : null}
              />
              <Stat
                label={t('usageBookingsCreated')}
                isLoading={usageQuery.isLoading}
                value={usage ? String(usage.bookings_created) : null}
              />
              <Stat
                label={t('usageBookingsCancelled')}
                isLoading={usageQuery.isLoading}
                value={usage ? String(usage.bookings_cancelled) : null}
              />
              <Stat
                label={t('usagePassBookings')}
                isLoading={usageQuery.isLoading}
                value={usage ? String(usage.pass_bookings) : null}
              />
              <Stat
                label={t('usageCredits')}
                isLoading={usageQuery.isLoading}
                value={usage ? String(usage.credits_earned) : null}
              />
            </StatPanel>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('billingTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {billingQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !billing ? (
            <p className="text-sm text-muted-foreground">{t('billingNone')}</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('billingProvider')}</dt>
                <dd>{billing.provider}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('billingStatus')}</dt>
                <dd>{billing.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('billingCustomer')}</dt>
                <dd className="font-numeric text-xs">{billing.external_customer_id ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('billingSubscription')}</dt>
                <dd className="font-numeric text-xs">{billing.external_subscription_id ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('billingPeriod')}</dt>
                <dd>
                  {billing.current_period_start ?? '—'} → {billing.current_period_end ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('billingGrace')}</dt>
                <dd>{billing.grace_deadline ?? '—'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
