'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListTenants } from '@iziwellpass/api/generated';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Empty, EmptyDescription, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { apiErrorMessage } from '@/lib/api-error';
import {
  isForbidden,
  planBadgeVariant,
  STATUS_FILTERS,
  statusBadgeVariant,
  statusParam,
  TENANTS_PAGE_SIZE,
  type StatusFilter,
} from '@/lib/tenants';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export default function TenantsPage() {
  const t = useTranslations('tenants');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const query = useListTenants(
    { status: statusParam(filter), limit: TENANTS_PAGE_SIZE, offset: page * TENANTS_PAGE_SIZE },
    { query: { select: unwrap } },
  );
  const tenants = query.data ?? [];

  const selectFilter = (next: StatusFilter) => {
    setFilter(next);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-[750] tracking-[-0.035em]">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => selectFilter(v as StatusFilter)}>
        <TabsList aria-label={t('title')}>
          {STATUS_FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>
              {t(`filter.${f}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : query.isError ? (
        isForbidden(query.error) ? (
          <Alert variant="destructive">
            <AlertTitle>{t('forbiddenTitle')}</AlertTitle>
            <AlertDescription>{t('forbiddenBody')}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{apiErrorMessage(query.error, t('errorBody'))}</AlertDescription>
          </Alert>
        )
      ) : tenants.length === 0 ? (
        <Empty>
          <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('emptyBody')}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colName')}</TableHead>
              <TableHead>{t('colSlug')}</TableHead>
              <TableHead>{t('colPlan')}</TableHead>
              <TableHead>{t('colStatus')}</TableHead>
              <TableHead>{t('colCreated')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow
                key={tenant.id}
                className={tenant.status === 'purged' ? 'opacity-50' : undefined}
              >
                <TableCell className="font-medium">
                  <Link href={`/tenants/${tenant.id}`} className="rounded-md">
                    {tenant.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                <TableCell>
                  <Badge variant={planBadgeVariant(tenant.plan)}>{t(`plan.${tenant.plan}`)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(tenant.status)}>
                    {t(`status.${tenant.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>{dateFmt.format(new Date(tenant.created_at))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || query.isLoading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          {t('prevPage')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={tenants.length < TENANTS_PAGE_SIZE || query.isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          {t('nextPage')}
        </Button>
      </div>
    </div>
  );
}
