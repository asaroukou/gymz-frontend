'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { StaffMemberView } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import { KeyValueList, KeyValueRow, SectionHeading } from '@iziwellpass/ui/components/working-page';

import { formatCalendarDate } from '@/lib/datetime';
import { memberStatusBadgeVariant } from '@/lib/member-status';

/**
 * « Adhésion » (canvas `L6sMyP`): the flat membership_* fields on `StaffMemberView` as
 * key/value hairline rows. Distinct from SubscriptionsSection, which lists
 * priced `StaffSubscriptionView` rows.
 */
export function MembershipSection({ member }: { member: StaffMemberView }) {
  const t = useTranslations('members');
  const locale = useLocale();

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.membership.title')} />
      <KeyValueList>
        <KeyValueRow label={t('detail.membership.type')}>
          {t(`type.${member.membership_type}`)}
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.start')}>
          {formatCalendarDate(member.membership_start, locale)}
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.end')}>
          {member.membership_end ? (
            formatCalendarDate(member.membership_end, locale)
          ) : (
            <span className="font-normal text-muted-foreground">{t('noEnd')}</span>
          )}
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.status')}>
          <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
            {t(`status.${member.membership_status}`)}
          </Badge>
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.notes')} className="items-start">
          {member.notes ? (
            <span className="block max-w-[60%] whitespace-pre-wrap md:ml-auto">{member.notes}</span>
          ) : (
            <span className="font-normal text-muted-foreground">
              {t('detail.membership.noNotes')}
            </span>
          )}
        </KeyValueRow>
      </KeyValueList>
    </section>
  );
}
