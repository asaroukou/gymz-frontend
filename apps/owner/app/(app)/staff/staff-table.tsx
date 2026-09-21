'use client';

import { useTranslations } from 'next-intl';

import type { Staff } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { roleBadgeVariant } from '@/lib/role-badge';
import { staffInitials, staffName } from '@/lib/staff-name';

import { StaffRowActions } from './staff-dialogs';

interface StaffRowProps {
  member: Staff;
  index: number;
  isSelf: boolean;
}

/** Desktop row: tinted avatar, name + « · vous », email, role badge, « ··· ». */
function StaffRow({ member, index, isSelf }: StaffRowProps) {
  const t = useTranslations('staff');
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback aria-hidden tint={index}>
              {staffInitials(member)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{staffName(member)}</span>
          {isSelf ? <span className="text-muted-foreground">· {t('row.you')}</span> : null}
        </div>
      </TableCell>
      <TableCell className="truncate">{member.email}</TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(member.role)}>{t(`role.${member.role}`)}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <StaffRowActions staff={member} isSelf={isSelf} />
      </TableCell>
    </TableRow>
  );
}

/** Phone stack (spec D6): the same cells between hairlines, 44px menu. */
function StaffStack({ member, index, isSelf }: StaffRowProps) {
  const t = useTranslations('staff');
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Avatar>
        <AvatarFallback aria-hidden tint={index}>
          {staffInitials(member)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-medium">
          {staffName(member)}
          {isSelf ? <span className="text-muted-foreground"> · {t('row.you')}</span> : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
        <div className="mt-2">
          <Badge variant={roleBadgeVariant(member.role)}>{t(`role.${member.role}`)}</Badge>
        </div>
      </div>
      <StaffRowActions staff={member} isSelf={isSelf} size="icon" />
    </div>
  );
}

export function StaffTable({ staff, selfUserId }: { staff: Staff[]; selfUserId: string | null }) {
  const t = useTranslations('staff');
  const isSelf = (member: Staff) => selfUserId !== null && member.user_id === selfUserId;

  return (
    <>
      <div className="md:hidden">
        {staff.map((member, index) => (
          <StaffStack key={member.id} member={member} index={index} isSelf={isSelf(member)} />
        ))}
      </div>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.member')}</TableHead>
              <TableHead className="w-[340px]">{t('columns.email')}</TableHead>
              <TableHead className="w-[200px]">{t('columns.role')}</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member, index) => (
              <StaffRow key={member.id} member={member} index={index} isSelf={isSelf(member)} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
