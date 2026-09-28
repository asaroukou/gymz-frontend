'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';

import { useAccessScopeLabel } from '@/lib/access-scope';
import { formatCalendarDate } from '@/lib/datetime';
import type { AccountView } from '@/lib/member-account';
import { memberInitials, memberName } from '@/lib/member-search';
import { memberStatusBadgeVariant } from '@/lib/member-status';

import { AccountStatusBadge } from './account-section';
import { EditAccessDialog } from './edit-access-dialog';

/**
 * Canvas `L6sMyP`: a 72px tinted avatar, the 32px name over a badge row
 * (type, status, access, app badge + « Gérer l'accès »), and the contact
 * block on the right (email 15/500, phone, « Membre depuis le … » 13px).
 * `x7QjF`: a pending e-mail change adds a 12/500 muted line under the e-mail.
 */
export function MemberHeader({
  member,
  account,
  canManage,
}: {
  member: StaffMemberProfile;
  account: AccountView;
  canManage: boolean;
}) {
  const t = useTranslations('members');
  const locale = useLocale();
  const scopeLabel = useAccessScopeLabel();
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex items-start gap-5">
        <Avatar className="size-[72px]">
          <AvatarFallback aria-hidden className="text-xl" tint={0}>
            {memberInitials(member)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-normal">{memberName(member)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`type.${member.membership_type}`)}</Badge>
            <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
              {t(`status.${member.membership_status}`)}
            </Badge>
            <Badge variant={member.access_scope === 'chain_wide' ? 'info' : 'default'}>
              {scopeLabel(member.access_scope)}
            </Badge>
            <AccountStatusBadge badge={account.badge} />
            {canManage ? (
              <Button variant="ghost" size="sm" onClick={() => setAccessOpen(true)}>
                {t('detail.access.manage')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-base md:self-center md:text-right">
        <p className={member.email ? 'font-medium' : 'text-muted-foreground'}>
          {member.email ?? t('detail.noEmail')}
        </p>
        {member.account.email === 'change_pending' ? (
          <p className="text-xs font-medium text-muted-foreground">
            {t('account.header.changePending')}
          </p>
        ) : null}
        <p className="font-numeric text-muted-foreground">{member.phone ?? t('detail.noPhone')}</p>
        {/*
          `created_at` is a date-time instant, but members are org-scoped with
          no single venue timezone to convert against. We format the leading
          calendar date in the active locale — can be off by a day right at
          UTC midnight; acceptable for a "member since" line.
        */}
        <p className="text-sm text-muted-foreground">
          {t('detail.memberSince', { date: formatCalendarDate(member.created_at, locale) })}
        </p>
      </div>
      <EditAccessDialog member={member} open={accessOpen} onOpenChange={setAccessOpen} />
    </div>
  );
}
