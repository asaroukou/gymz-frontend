'use client';

import { useEffect, useState } from 'react';
import { LoaderCircleIcon, SearchIcon, UsersRoundIcon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StaffMemberView } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { useFocusRegistry } from '@/components/focus-registry';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { type DirectoryScope, type DirectoryStatus, useDebouncedValue, useMemberSearch } from '@/lib/member-search-query';
import { useIsDesktop } from '@/lib/use-is-desktop';
import { useVenueContext } from '@/lib/venue-context';

import { AddMemberDialog } from './add-member-dialog';
import { MemberRow, MemberStack } from './member-row';
import { SuspendMemberDialog } from './suspend-member-dialog';

const STATUS_TABS: DirectoryStatus[] = ['all', 'active', 'expired', 'suspended'];
const COLUMN_COUNT = 6;

type BodyState = 'loading' | 'error' | 'noResultsQuery' | 'emptyTab' | 'rows';

/**
 * Canvas `bRCjD`: a toolbar (search, scope select, status tabs) over the
 * hairline table, with an « Afficher plus » footer instead of numbered pages.
 * Fetches `POST /gms/v1/members/search` via `useMemberSearch` (infinite
 * query, cursor pagination) instead of client-side filtering the full roster.
 */
export function MembersDirectory({
  canManage,
  scope,
  onScopeChange,
  onEmptyChange,
}: {
  canManage: boolean;
  scope: DirectoryScope;
  onScopeChange: (scope: DirectoryScope) => void;
  /** Lets `page.tsx` hide its header action on the first-member empty state (`cKk1G`). */
  onEmptyChange?: (empty: boolean) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const role = useRole();
  const { venues, selectedVenueId } = useVenueContext();
  const canPickScope =
    (role === 'owner' || role === 'admin' || role === 'platform_admin') && venues.length >= 2;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<DirectoryStatus>('all');
  const [suspendTarget, setSuspendTarget] = useState<StaffMemberView | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const focus = useFocusRegistry();
  const isDesktop = useIsDesktop();

  const debounced = useDebouncedValue(query, 250);
  const search = useMemberSearch({ scope, venueId: selectedVenueId, status, q: debounced });
  const members = search.data?.pages.flatMap((p) => p.data) ?? [];
  // The search is disabled until a venue resolves in venue scope (`enabled`
  // in `useMemberSearch`); treat that gap as loading rather than "no
  // results" so the directory doesn't flash the empty state first.
  const isLoading = search.isLoading || (scope === 'venue' && !selectedVenueId);
  const hasError = search.isError && !members.length;

  const isFirstMemberEmpty =
    !isLoading && !hasError && !members.length && status === 'all' && !debounced.trim();

  useEffect(() => {
    onEmptyChange?.(isFirstMemberEmpty);
  }, [isFirstMemberEmpty, onEmptyChange]);

  const handleSuspend = (member: StaffMemberView) => {
    setSuspendTarget(member);
    setSuspendOpen(true);
  };

  const tabs: { value: DirectoryStatus; label: string }[] = STATUS_TABS.map((value) => ({
    value,
    label: t(`filters.${value}`),
  }));

  const suspendDialog = suspendTarget ? (
    <SuspendMemberDialog
      member={suspendTarget}
      open={suspendOpen}
      onOpenChange={setSuspendOpen}
      restoreFocusTo={() => focus.get(suspendTarget?.id)}
    />
  ) : null;

  // cKk1G: no toolbar, no header action (handled by `onEmptyChange`), the
  // first-member empty state fills the page.
  if (isFirstMemberEmpty) {
    return (
      <div className="flex flex-col gap-8">
        <Empty>
          <EmptyMedia>
            <UsersRoundIcon />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.body')}</EmptyDescription>
          {canManage ? (
            <EmptyContent>
              <AddMemberDialog variant="secondary" />
            </EmptyContent>
          ) : null}
        </Empty>
        {suspendDialog}
      </div>
    );
  }

  const bodyState: BodyState = isLoading
    ? 'loading'
    : hasError
      ? 'error'
      : !members.length && debounced.trim()
        ? 'noResultsQuery'
        : !members.length
          ? 'emptyTab'
          : 'rows';

  // b9IMGN/F7kU0F/rgAty: a single quiet centered line (no colored alert box),
  // the same treatment across the three non-loading empty variants.
  const errorNotice = (
    <div role="alert" className="flex flex-col items-center gap-3 text-center">
      <p className="text-base text-foreground">{t('loadError')}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void search.refetch()}
        disabled={search.isFetching}
      >
        {tCommon('retry')}
      </Button>
    </div>
  );
  const noResultsNotice = (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-base text-foreground">{t('noResults.query', { q: debounced.trim() })}</p>
      <Button variant="link" onClick={() => setQuery('')}>
        {t('clearSearch')}
      </Button>
    </div>
  );
  const emptyTabNotice = <p className="text-base text-foreground">{t(`emptyTab.${status}`)}</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full md:w-[380px]">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isDesktop ? t('search') : t('searchPhone')}
            aria-label={t('search')}
            maxLength={100}
            className="pr-[76px] pl-11"
          />
          {/* ZInet: the spinner and the clear button can both show at once
              (fetching a non-empty query). */}
          {search.isFetching && !search.isFetchingNextPage ? (
            <LoaderCircleIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-11 size-[18px] -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : null}
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('clearSearch')}
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-1.5 size-9 -translate-y-1/2"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
        {canPickScope ? (
          <Select value={scope} onValueChange={(value) => onScopeChange(value as DirectoryScope)}>
            <SelectTrigger className="w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="venue">{t('scope.venue')}</SelectItem>
              <SelectItem value="all">{t('scope.all')}</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        <Tabs
          value={status}
          onValueChange={(value) => setStatus(value as DirectoryStatus)}
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

      {/* Phone: stacked hairline rows, or the state notice, no table header. */}
      <div className="md:hidden">
        {bodyState === 'loading' ? (
          <RowsSkeleton rows={8} />
        ) : bodyState === 'error' ? (
          <div className="py-10">{errorNotice}</div>
        ) : bodyState === 'noResultsQuery' ? (
          <div className="py-10">{noResultsNotice}</div>
        ) : bodyState === 'emptyTab' ? (
          <p className="py-10 text-center text-base text-foreground">{t(`emptyTab.${status}`)}</p>
        ) : (
          members.map((member, index) => (
            <MemberStack
              key={member.id}
              member={member}
              index={index}
              canManage={canManage}
              onSuspend={handleSuspend}
              menuRef={focus.register(member.id)}
            />
          ))
        )}
      </div>

      {/* Tablet/desktop: the header row stays put (Cl2bM, b9IMGN, F7kU0F,
          rgAty) while the body swaps between skeleton, notice and rows. */}
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
            {bodyState === 'loading' ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="p-0">
                  <RowsSkeleton rows={8} />
                </TableCell>
              </TableRow>
            ) : bodyState === 'error' ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center align-middle">
                  {errorNotice}
                </TableCell>
              </TableRow>
            ) : bodyState === 'noResultsQuery' ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center align-middle">
                  {noResultsNotice}
                </TableCell>
              </TableRow>
            ) : bodyState === 'emptyTab' ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center align-middle">
                  {emptyTabNotice}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member, index) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  index={index}
                  canManage={canManage}
                  onSuspend={handleSuspend}
                  menuRef={focus.register(member.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {bodyState === 'rows' && search.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => void search.fetchNextPage()}
            disabled={search.isFetchingNextPage}
          >
            {search.isFetchingNextPage ? (
              <LoaderCircleIcon aria-hidden className="animate-spin" />
            ) : null}
            {t('showMore')}
          </Button>
        </div>
      ) : null}

      {suspendDialog}
    </div>
  );
}
