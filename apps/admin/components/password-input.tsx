'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Input } from '@iziwellpass/ui/components/input';
import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * Password field with a reveal toggle, for the front-desk case where a
 * receptionist keys a long temp password off a phone and can't verify what's
 * masked. Slot-injected props from FormControl (id, aria-describedby,
 * aria-invalid, ref) pass straight through to the inner Input, so the label
 * association and validation wiring stay intact; the toggle is a sibling, not
 * in the a11y path. The toggle is a 44px target and reads its state to screen
 * readers via aria-pressed.
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const t = useTranslations('auth');
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
