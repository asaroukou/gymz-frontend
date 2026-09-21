'use client';

import { useEffect, useMemo, useState } from 'react';
import { SearchIcon, SearchXIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import { Pagination } from '@iziwellpass/ui/components/pagination';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { useFocusRegistry } from '@/components/focus-registry';
import { memberName } from '@/lib/member-search';
import { paginate } from '@/lib/paginate';

import { MemberRow, MemberStack } from './member-row';
import { SuspendMemberDialog } from './suspend-member-dialog';

/** Spec D2: client-side paging over the full roster. */
export const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'expired' | 'suspended' | 'cancelled';

/**
 * Canvas `xLxJY`: a 380px search pill with the status pills on the right, the
 * hairline table, then « 8 membres sur 128 » and the pagination pills.
 */
export function MembersDirectory({
  members,
  canManage,
}: {
  members: Member[];
  canManage: boolean;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<Member | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const focus = useFocusRegistry();

  const handleSuspend = (member: Member) => {
    setSuspendTarget(member);
    setSuspendOpen(true);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (status !== 'all' && member.membership_status !== status) return false;
      if (!q) return true;
      const name = memberName(member).toLowerCase();
      const email = (member.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query, status]);

  // A new query or filter starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [query, status]);

  const current = paginate(filtered, page, PAGE_SIZE);

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'active', label: t('filters.active') },
    { value: 'expired', label: t('filters.expired') },
    { value: 'suspended', label: t('filters.suspended') },
    { value: 'cancelled', label: t('filters.cancelled') },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full md:w-[380px]">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
            className="pl-11"
          />
        </div>
        <Tabs
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
          className="max-w-full overflow-x-auto"
        >
          <TabsList aria-label={t('columns.status')}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>{t('noResults.title')}</EmptyTitle>
          <EmptyDescription>{t('noResults.body')}</EmptyDescription>
        </Empty>
      ) : (
        <>
          {/* Phone: stacked hairline rows. The table would force horizontal scroll at 375px. */}
          <div className="md:hidden">
            {current.items.map((member, index) => (
              <MemberStack
                key={member.id}
                member={member}
                index={index}
                canManage={canManage}
                onSuspend={handleSuspend}
                menuRef={focus.register(member.id)}
              />
            ))}
          </div>
          {/* Tablet/desktop: the hairline table at the canvas column widths. */}
          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[244px]">{t('columns.member')}</TableHead>
                  <TableHead className="w-[260px]">{t('columns.contact')}</TableHead>
                  <TableHead className="w-[130px]">{t('columns.type')}</TableHead>
                  <TableHead className="w-[130px]">{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.end')}</TableHead>
                  <TableHead className="w-16 text-right">
                    <span className="sr-only">{t('columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.items.map((member, index) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    index={index}
                    canManage={canManage}
                    onSuspend={handleSuspend}
                    menuRef={focus.register(member.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-md text-muted-foreground">
              {t('footer', { shown: current.items.length, total: current.total })}
            </p>
            <Pagination
              page={current.page}
              pageCount={current.pageCount}
              onPageChange={setPage}
              labels={{
                label: tCommon('pagination.label'),
                previous: tCommon('pagination.previous'),
                next: tCommon('pagination.next'),
                page: (n) => tCommon('pagination.page', { n }),
              }}
            />
          </div>
        </>
      )}

      {suspendTarget ? (
        <SuspendMemberDialog
          member={suspendTarget}
          open={suspendOpen}
          onOpenChange={setSuspendOpen}
          restoreFocusTo={() => focus.get(suspendTarget?.id)}
        />
      ) : null}
    </div>
  );
}
