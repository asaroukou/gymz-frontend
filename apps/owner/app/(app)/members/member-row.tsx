'use client';

import Link from 'next/link';
import { BanIcon, EyeIcon, MoreHorizontalIcon, PencilIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { TableCell, TableRow } from '@iziwellpass/ui/components/table';

import { formatCalendarDate } from '@/lib/datetime';
import { memberInitials, memberName } from '@/lib/member-search';
import { isExpiringSoon, memberStatusBadgeVariant } from '@/lib/member-status';

export interface MemberRowProps {
  member: Member;
  /** Row index on the page, drives the avatar tint rotation. */
  index: number;
  canManage: boolean;
  onSuspend: (member: Member) => void;
  menuRef?: (el: HTMLButtonElement | null) => void;
}

/** Row action menu (view, edit, suspend): 36px « ··· » in the table, 44px on the phone stack. */
export function MemberActions({
  member,
  canManage,
  onSuspend,
  size = 'icon-sm',
  menuRef,
}: Omit<MemberRowProps, 'index'> & { size?: 'icon' | 'icon-sm' }) {
  const t = useTranslations('members');
  const canSuspend = canManage && member.membership_status !== 'suspended';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={menuRef} variant="ghost" size={size} aria-label={t('row.menu')}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/members/${member.id}`}>
            <EyeIcon />
            {t('row.view')}
          </Link>
        </DropdownMenuItem>
        {canManage ? (
          <DropdownMenuItem asChild>
            <Link href={`/members/${member.id}`}>
              <PencilIcon />
              {t('row.edit')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canSuspend ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onSuspend(member)}>
              <BanIcon />
              {t('row.suspend')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useEndCell(member: Member) {
  const t = useTranslations('members');
  const locale = useLocale();
  return {
    label: member.membership_end ? formatCalendarDate(member.membership_end, locale) : t('noEnd'),
    muted: !member.membership_end,
    expiringSoon: isExpiringSoon(member),
  };
}

/** Desktop row (canvas `xLxJY`): 64px, avatar + name, stacked contact, type, status, end + « Bientôt », « ··· ». */
export function MemberRow({ member, index, canManage, onSuspend, menuRef }: MemberRowProps) {
  const t = useTranslations('members');
  const end = useEndCell(member);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/members/${member.id}`} className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback aria-hidden tint={index}>
              {memberInitials(member)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{memberName(member)}</span>
        </Link>
      </TableCell>
      <TableCell>
        <p className={member.email ? undefined : 'text-muted-foreground'}>
          {member.email ?? t('detail.noEmail')}
        </p>
        {member.phone ? (
          <p className="font-numeric text-sm text-muted-foreground">{member.phone}</p>
        ) : null}
      </TableCell>
      <TableCell>{t(`type.${member.membership_type}`)}</TableCell>
      <TableCell>
        <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
          {t(`status.${member.membership_status}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-5">
          <span className={end.muted ? 'text-muted-foreground' : undefined}>{end.label}</span>
          {end.expiringSoon ? <Badge variant="warning">{t('expiringSoon')}</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <MemberActions
          member={member}
          canManage={canManage}
          onSuspend={onSuspend}
          menuRef={menuRef}
        />
      </TableCell>
    </TableRow>
  );
}

/** Phone stack (spec D6): the same cells stacked between hairlines, no card. */
export function MemberStack({ member, index, canManage, onSuspend, menuRef }: MemberRowProps) {
  const t = useTranslations('members');
  const end = useEndCell(member);

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Link href={`/members/${member.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar>
          <AvatarFallback aria-hidden tint={index}>
            {memberInitials(member)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-medium">{memberName(member)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {member.email ?? member.phone ?? t('detail.noEmail')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
              {t(`status.${member.membership_status}`)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t(`type.${member.membership_type}`)} · {end.label}
            </span>
            {end.expiringSoon ? <Badge variant="warning">{t('expiringSoon')}</Badge> : null}
          </div>
        </div>
      </Link>
      <MemberActions
        member={member}
        canManage={canManage}
        onSuspend={onSuspend}
        size="icon"
        menuRef={menuRef}
      />
    </div>
  );
}
