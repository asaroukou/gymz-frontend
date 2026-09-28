'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { changeLoginEmail, getGetMemberQueryKey } from '@iziwellpass/api/generated';
import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';

import { idempotencyKeyFor, normalizeEmail, type KeyState } from '@/lib/idempotency';
import { classifyMemberError, type MemberError } from '@/lib/member-errors';
import { isForbidden } from '@/lib/plan-errors';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Refusals shown under the field (`OXBVd`); anything else falls back below. */
const ERROR_KEYS: Partial<Record<MemberError['kind'], string>> = {
  validation: 'account.emailDialog.invalid',
  duplicate: 'account.emailDialog.taken',
  emailChangeInProgress: 'account.emailDialog.inProgress',
  identityShared: 'account.emailDialog.shared',
  loginNotProvisioned: 'account.emailDialog.notProvisioned',
  idempotencyInProgress: 'account.emailDialog.processing',
};

/**
 * « Changer l'adresse de connexion » (canvas `tbCt2`, error `OXBVd`):
 * `POST /members/{mid}/email-change` with an Idempotency-Key kept per intended
 * address, so a retry of the same address is deduplicated and a different
 * address gets a new key (Review Focus 4). The new address only ever shows in
 * the success toast.
 */
export function ChangeEmailDialog({
  member,
  open,
  onOpenChange,
  onStarted,
}: {
  member: StaffMemberProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (operationId: string) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const keyRef = useRef<KeyState | null>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setFieldError(null);
      keyRef.current = null;
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: ({ email, key }: { email: string; key: string }) =>
      changeLoginEmail(member.id, { new_email: email }, { headers: { 'Idempotency-Key': key } }),
    onSuccess: (res, { email }) => {
      toast.success(t('account.emailDialog.sent', { email }));
      onStarted(res.data.id);
      void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
      onOpenChange(false);
      setValue('');
    },
    onError: (err) => {
      const key =
        ERROR_KEYS[classifyMemberError(err).kind] ??
        (isForbidden(err) ? 'account.refusal.forbidden' : 'account.result.emailFailed');
      setFieldError(t(key));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const next = value.trim();
    if (normalizeEmail(next) === normalizeEmail(member.email ?? '')) {
      setFieldError(t('account.emailDialog.same'));
      return;
    }
    if (!EMAIL_PATTERN.test(next)) {
      setFieldError(t('account.emailDialog.invalid'));
      return;
    }
    keyRef.current = idempotencyKeyFor(keyRef.current, next, () => crypto.randomUUID());
    mutation.mutate({ email: next, key: keyRef.current.key });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('account.emailDialog.title')}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          <dl className="grid gap-x-6 gap-y-1 border-y border-border py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <dt className="text-base text-muted-foreground">{t('account.emailDialog.current')}</dt>
            <dd className="min-w-0 text-base font-medium break-all sm:text-right">
              {member.email}
            </dd>
          </dl>
          <div className="flex flex-col gap-2">
            <Label htmlFor={inputId}>{t('account.emailDialog.new')}</Label>
            <Input
              id={inputId}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setFieldError(null);
              }}
              aria-invalid={fieldError !== null}
              aria-describedby={fieldError ? errorId : undefined}
            />
            {fieldError ? (
              <p id={errorId} role="alert" className="text-sm text-destructive-foreground">
                {fieldError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 text-md text-muted-foreground">
            <p>{t('account.emailDialog.explain')}</p>
            <p>{t('account.emailDialog.explainInvited')}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {tCommon('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending || value.trim() === ''}>
              {t('account.emailDialog.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
