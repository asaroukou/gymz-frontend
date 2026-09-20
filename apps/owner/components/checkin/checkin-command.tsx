'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, QrCodeIcon, UserSearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Member, MembershipStatus } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Button } from '@iziwellpass/ui/components/button';
import { CommandBar } from '@iziwellpass/ui/components/command-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Popover, PopoverAnchor, PopoverContent } from '@iziwellpass/ui/components/popover';
import { cn } from '@iziwellpass/ui/lib/utils';

import { memberInitials, memberLabel, memberName, searchMembers } from '@/lib/member-search';
import { useIsDesktop } from '@/lib/use-is-desktop';

import type { CheckinMode } from './checkin-modes';
import type { RegisterCheckin } from './use-register-checkin';

export interface CheckinCommandProps {
  mode: CheckinMode;
  onModeChange: (mode: CheckinMode) => void;
  /** The loaded member list (walk-in type-ahead). */
  members: readonly Member[];
  register: RegisterCheckin;
  /** « Actif », « Expiré »… from the members namespace. */
  statusLabel: (status: MembershipStatus) => string;
}

const MODES: readonly CheckinMode[] = ['qr', 'walkin'];

/**
 * The hub's one control. QR mode: the token field a wedge scanner types
 * into, scan-ready on arrival and after every success. Walk-in mode: a
 * type-ahead over the member list in a borderless côté popover; picking a
 * member fills « Awa Ndiaye · Actif » and submit registers the entry. The
 * ghost dropdown on the right switches mode on desktop; below `md` the pill
 * row (CheckinModes) is the only switch.
 */
export function CheckinCommand({
  mode,
  onModeChange,
  members,
  register,
  statusLabel,
}: CheckinCommandProps) {
  const t = useTranslations('frontdesk');
  const isDesktop = useIsDesktop();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => (mode === 'walkin' ? searchMembers(members, query) : []),
    [members, mode, query],
  );
  const listOpen = mode === 'walkin' && open && query.trim() !== '' && selectedId === null;

  const clear = useCallback(() => {
    setQuery('');
    setSelectedId(null);
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }, []);

  // Scan-ready on arrival and on every mode switch: the field is the whole
  // point of the screen, so we don't gate by pointer type (a counter tablet
  // with a wedge scanner needs it as much as a laptop).
  useEffect(() => {
    clear();
  }, [mode, clear]);

  useEffect(() => {
    setActive(0);
  }, [results.length]);

  const select = useCallback(
    (member: Member) => {
      setQuery(memberLabel(member, statusLabel(member.membership_status)));
      setSelectedId(member.id);
      setOpen(false);
      inputRef.current?.focus();
    },
    [statusLabel],
  );

  const handleSubmit = (value: string) => {
    if (register.isPending) return;
    if (mode === 'qr') {
      register.submitToken(value, clear);
      return;
    }
    if (selectedId) {
      register.submitWalkin(selectedId, clear);
      return;
    }
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode !== 'walkin') return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && listOpen && results[active]) {
      // Selecting is not submitting: stop the implicit form submission.
      event.preventDefault();
      select(results[active]);
    } else if (event.key === 'Escape' && listOpen) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const placeholder =
    mode === 'qr'
      ? isDesktop
        ? t('command.placeholderQr')
        : t('command.placeholderQrShort')
      : t('command.placeholderWalkin');

  const modeMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex"
          aria-label={t('command.modeMenuLabel')}
        >
          {mode === 'qr' ? t('command.modeQr') : t('command.modeWalkin')}
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {MODES.map((m) => (
          <DropdownMenuItem key={m} onSelect={() => onModeChange(m)}>
            {m === 'qr' ? t('command.modeQr') : t('command.modeWalkin')}
            {m === mode ? <CheckIcon aria-hidden="true" className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const activeId = listOpen && results[active] ? `${listId}-${active}` : undefined;

  return (
    <Popover open={listOpen} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="w-full max-w-[45rem]">
          <CommandBar
            icon={mode === 'qr' ? <QrCodeIcon /> : <UserSearchIcon />}
            placeholder={placeholder}
            value={query}
            onChange={(value) => {
              setQuery(value);
              setSelectedId(null);
              setOpen(true);
            }}
            onSubmit={handleSubmit}
            mode={modeMenu}
            submitLabel={t('command.submit')}
            disabled={register.isPending}
            inputProps={{
              ref: inputRef,
              onKeyDown,
              readOnly: register.isPending,
              autoComplete: 'off',
              autoCapitalize: 'none',
              spellCheck: false,
              inputMode: 'text',
              ...(mode === 'walkin'
                ? {
                    role: 'combobox',
                    'aria-autocomplete': 'list',
                    'aria-expanded': listOpen,
                    'aria-controls': listId,
                    'aria-activedescendant': activeId,
                  }
                : {}),
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[var(--radix-popover-trigger-width)] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div id={listId} role="listbox" aria-label={t('command.results')}>
          {results.length === 0 ? (
            <p
              role="option"
              aria-disabled="true"
              aria-selected={false}
              className="px-3 py-3 text-base text-muted-foreground"
            >
              {t('walkin.noMembers')}
            </p>
          ) : (
            results.map((member, index) => (
              <div
                key={member.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(member)}
                className={cn(
                  'flex h-12 cursor-pointer items-center gap-3 rounded-full px-3 text-base',
                  index === active && 'bg-secondary',
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback tint={index}>{memberInitials(member)}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{memberName(member)}</span>
                <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                  {statusLabel(member.membership_status)}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
